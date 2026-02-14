from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from django.db import transaction
from datetime import timedelta
import logging

from .models import OrdemServico
from financeiro.models import ContaReceber

logger = logging.getLogger(__name__)


@receiver(post_save, sender=OrdemServico)
def processar_os_concluida(sender, instance, created, **kwargs):
    """
    Quando uma Ordem de Serviço é concluída:
    1. Cria automaticamente uma Conta a Receber
    2. Se for manutenção preventiva, cria/atualiza ProgramacaoManutencao
    """
    if created:
        return

    # Verifica se o status mudou para CONCLUIDA
    if instance.status != 'CONCLUIDA':
        return

    with transaction.atomic():
        # 1. Criar Conta a Receber (se ainda não existe)
        if not instance.contas_receber.exists():
            from django.utils import timezone
            data_vencimento = instance.data_conclusao or timezone.now().date()
            data_vencimento = data_vencimento + timedelta(days=30)

            descricao_os = (instance.descricao or '')[:100]
            descricao_conta = f"Ordem de Serviço {instance.numero}"
            if descricao_os:
                descricao_conta += f" - {descricao_os}"

            ContaReceber.objects.create(
                tipo='ORDEM_SERVICO',
                ordem_servico=instance,
                orcamento=instance.orcamento,
                cliente=instance.cliente,
                data_vencimento=data_vencimento,
                valor_original=instance.valor_final,
                descricao=descricao_conta,
                criado_por=instance.concluido_por,
            )

        # 2. Se for manutenção preventiva, criar/atualizar ProgramacaoManutencao
        criar_programacao_manutencao_preventiva(instance)


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


def criar_programacao_manutencao_preventiva(os_instance):
    """
    Cria ou atualiza ProgramacaoManutencao quando uma OS de manutenção preventiva é concluída.
    """
    # Verificar se a OS é de manutenção preventiva
    if not os_instance.orcamento:
        logger.info(f"[ProgramacaoManutencao] OS {os_instance.numero} sem orçamento vinculado")
        return

    orcamento = os_instance.orcamento
    if orcamento.tipo != 'MANUTENCAO_PREVENTIVA':
        logger.info(f"[ProgramacaoManutencao] OS {os_instance.numero} não é manutenção preventiva")
        return

    if not orcamento.modelo_manutencao_preventiva:
        logger.warning(f"[ProgramacaoManutencao] Orçamento {orcamento.numero} sem modelo de manutenção preventiva")
        return

    if not os_instance.equipamento:
        logger.warning(f"[ProgramacaoManutencao] OS {os_instance.numero} sem equipamento")
        return

    modelo = orcamento.modelo_manutencao_preventiva
    equipamento = os_instance.equipamento

    # Determinar leitura atual do equipamento
    # Usa horimetro_final da OS se disponível, senão usa leitura_atual do equipamento
    leitura_atual = os_instance.horimetro_final or equipamento.leitura_atual or 0

    from nr12.models import ProgramacaoManutencao

    # Verificar se já existe programação para este equipamento + modelo
    programacao = ProgramacaoManutencao.objects.filter(
        equipamento=equipamento,
        modelo=modelo
    ).first()

    if programacao:
        # Atualizar programação existente: agendar próxima manutenção
        logger.info(f"[ProgramacaoManutencao] Atualizando programação {programacao.id} para próxima manutenção")
        programacao.leitura_ultima_manutencao = leitura_atual
        programacao.leitura_proxima_manutencao = leitura_atual + modelo.intervalo
        programacao.status = 'ATIVA'
        programacao.save()
    else:
        # Criar nova programação
        logger.info(f"[ProgramacaoManutencao] Criando nova programação para equipamento {equipamento.codigo}")
        ProgramacaoManutencao.objects.create(
            equipamento=equipamento,
            modelo=modelo,
            leitura_inicial=leitura_atual,
            leitura_ultima_manutencao=leitura_atual,
            leitura_proxima_manutencao=leitura_atual + modelo.intervalo,
            status='ATIVA',
            ativo=True
        )

    logger.info(
        f"[ProgramacaoManutencao] Programação criada/atualizada - "
        f"Equipamento: {equipamento.codigo}, Modelo: {modelo.nome}, "
        f"Próxima em: {leitura_atual + modelo.intervalo}"
    )
