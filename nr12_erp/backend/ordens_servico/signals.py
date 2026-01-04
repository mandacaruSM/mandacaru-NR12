from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from django.db import transaction
from datetime import timedelta

from .models import OrdemServico
from financeiro.models import ContaReceber


@receiver(post_save, sender=OrdemServico)
def processar_os_concluida(sender, instance, created, **kwargs):
    """
    Quando uma Ordem de Serviço é concluída, cria automaticamente uma Conta a Receber.
    """
    if created:
        return

    # Verifica se o status mudou para CONCLUIDA
    if instance.status != 'CONCLUIDA':
        return

    # Verifica se já criou Conta a Receber
    if instance.contas_receber.exists():
        return

    # Criar Conta a Receber
    with transaction.atomic():
        # Vencimento: 30 dias após conclusão
        from django.utils import timezone
        data_vencimento = instance.data_conclusao or timezone.now().date()
        data_vencimento = data_vencimento + timedelta(days=30)

        ContaReceber.objects.create(
            tipo='ORDEM_SERVICO',
            ordem_servico=instance,
            orcamento=instance.orcamento,
            cliente=instance.cliente,
            data_vencimento=data_vencimento,
            valor_original=instance.valor_final,  # Usa valor_final que inclui adicionais
            descricao=f"Ordem de Serviço {instance.numero} - {instance.descricao[:100]}",
            criado_por=instance.concluido_por,
        )


@receiver(pre_save, sender=OrdemServico)
def validar_mudanca_status_os(sender, instance, **kwargs):
    """
    Valida mudanças de status da OS.
    """
    if not instance.pk:
        return

    try:
        old_instance = OrdemServico.objects.get(pk=instance.pk)
    except OrdemServico.DoesNotExist:
        return

    # Se está marcando como CONCLUIDA, preencher data_conclusao
    if instance.status == 'CONCLUIDA' and old_instance.status != 'CONCLUIDA':
        if not instance.data_conclusao:
            from django.utils import timezone
            instance.data_conclusao = timezone.now().date()

    # Se está iniciando execução, preencher data_inicio
    if instance.status == 'EM_EXECUCAO' and old_instance.status == 'ABERTA':
        if not instance.data_inicio:
            from django.utils import timezone
            instance.data_inicio = timezone.now().date()
