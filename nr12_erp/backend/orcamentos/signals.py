from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from django.db import transaction
from datetime import timedelta

from .models import Orcamento
from ordens_servico.models import OrdemServico, ItemOrdemServico
from financeiro.models import ContaReceber

# Flag para evitar processamento duplicado durante a mesma transação
_processing_orcamentos = set()


@receiver(post_save, sender=Orcamento)
def processar_orcamento_aprovado(sender, instance, created, **kwargs):
    """
    Quando um orçamento de manutenção é aprovado, cria automaticamente uma Ordem de Serviço.
    Quando um orçamento de produto é aprovado, cria automaticamente uma Conta a Receber.
    """
    if created:
        return

    # Verifica se o status mudou para APROVADO
    if instance.status != 'APROVADO':
        return

    # Evita processamento duplicado na mesma requisição
    if instance.pk in _processing_orcamentos:
        return

    # Marca como em processamento para evitar duplicação
    _processing_orcamentos.add(instance.pk)

    try:
        # Verifica se já processou (se já tem OS ou Conta a Receber)
        if instance.tipo in ['MANUTENCAO_CORRETIVA', 'MANUTENCAO_PREVENTIVA']:
            # Verifica se já criou OS
            if instance.ordens_servico.exists():
                return

            # Criar Ordem de Serviço
            with transaction.atomic():
                # Calcula data prevista baseado no prazo
                from django.utils import timezone
                data_prevista = timezone.now().date() + timedelta(days=instance.prazo_execucao_dias)

                os = OrdemServico.objects.create(
                    orcamento=instance,
                    cliente=instance.cliente,
                    empreendimento=instance.empreendimento,
                    equipamento=instance.equipamento,
                    data_prevista=data_prevista,
                    valor_servicos=instance.valor_servicos,
                    valor_produtos=instance.valor_produtos,
                    valor_deslocamento=instance.valor_deslocamento,
                    valor_desconto=instance.valor_desconto,
                    valor_total=instance.valor_total,
                    descricao=instance.descricao,
                    observacoes=instance.observacoes,
                    aberto_por=instance.aprovado_por,
                )

                # Copiar itens do orçamento para a OS
                for item_orc in instance.itens.all():
                    ItemOrdemServico.objects.create(
                        ordem_servico=os,
                        tipo=item_orc.tipo,
                        produto=item_orc.produto,
                        descricao=item_orc.descricao,
                        quantidade=item_orc.quantidade,
                        valor_unitario=item_orc.valor_unitario,
                        observacao=item_orc.observacao,
                    )

        elif instance.tipo == 'PRODUTO':
            # Verifica se já criou Conta a Receber
            if instance.contas_receber.exists():
                return

            # Criar Conta a Receber
            with transaction.atomic():
                # Vencimento: 30 dias após aprovação
                from django.utils import timezone
                data_vencimento = timezone.now().date() + timedelta(days=30)

                ContaReceber.objects.create(
                    tipo='ORCAMENTO_PRODUTO',
                    orcamento=instance,
                    cliente=instance.cliente,
                    data_vencimento=data_vencimento,
                    valor_original=instance.valor_total,
                    descricao=f"Orçamento {instance.numero} - {instance.descricao[:100]}",
                    criado_por=instance.aprovado_por,
                )
    finally:
        # Remove da lista de processamento
        _processing_orcamentos.discard(instance.pk)
