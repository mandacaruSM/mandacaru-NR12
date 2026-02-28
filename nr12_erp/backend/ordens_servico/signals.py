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
    1. Atualiza dados do equipamento (horímetro, status, datas de manutenção)
    2. Cria automaticamente uma Conta a Receber
    3. Se for manutenção preventiva, cria/atualiza ProgramacaoManutencao
    """
    if created:
        return

    # Verifica se o status mudou para CONCLUIDA
    if instance.status != 'CONCLUIDA':
        return

    with transaction.atomic():
        # 1. Atualizar dados do equipamento
        atualizar_equipamento_apos_conclusao(instance)

        # 2. Criar Conta a Receber (se ainda não existe)
        if not instance.contas_receber.exists():
            from django.utils import timezone
            from financeiro.models import Pagamento

            data_base = instance.data_conclusao or timezone.now().date()
            prazo = getattr(instance, '_prazo_pagamento', 'A_VISTA')

            # Mapeamento de prazo → lista de dias para vencimento de cada parcela
            PRAZOS = {
                'A_VISTA':  [0],
                '30':       [30],
                '60':       [60],
                '90':       [90],
                '30_60':    [30, 60],
                '30_60_90': [30, 60, 90],
            }
            dias_parcelas = PRAZOS.get(prazo, [0])
            total_parcelas = len(dias_parcelas)

            descricao_os = (instance.descricao or '')[:100]
            descricao_conta = f"Ordem de Serviço {instance.numero}"
            if descricao_os:
                descricao_conta += f" - {descricao_os}"

            # Primeiro vencimento determina o data_vencimento da ContaReceber
            data_vencimento_principal = data_base + timedelta(days=dias_parcelas[0])

            conta = ContaReceber.objects.create(
                tipo='ORDEM_SERVICO',
                ordem_servico=instance,
                orcamento=instance.orcamento,
                cliente=instance.cliente,
                data_vencimento=data_vencimento_principal,
                valor_original=instance.valor_final,
                descricao=descricao_conta,
                criado_por=instance.concluido_por,
            )

            # Criar parcelas pendentes (a pagar) para prazos múltiplos
            if total_parcelas > 1:
                from decimal import Decimal, ROUND_HALF_UP
                valor_parcela = (instance.valor_final / Decimal(total_parcelas)).quantize(
                    Decimal('0.01'), rounding=ROUND_HALF_UP
                )
                # Ajuste de centavos na última parcela
                valor_ultima = instance.valor_final - (valor_parcela * (total_parcelas - 1))

                for i, dias in enumerate(dias_parcelas, start=1):
                    valor = valor_parcela if i < total_parcelas else valor_ultima
                    Pagamento.objects.create(
                        conta_receber=conta,
                        tipo_pagamento='PARCIAL',
                        status='PENDENTE',
                        valor=valor,
                        forma_pagamento='PIX',  # padrão; pode ser alterado depois
                        data_pagamento=data_base + timedelta(days=dias),
                        numero_parcela=i,
                        total_parcelas=total_parcelas,
                        registrado_por=instance.concluido_por,
                    )

        # 3. Se for manutenção preventiva, criar/atualizar ProgramacaoManutencao
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


def atualizar_equipamento_apos_conclusao(os_instance):
    """
    Atualiza o equipamento após conclusão da OS:
    - Atualiza horímetro/leitura atual
    - Registra data da última manutenção
    - Calcula e agenda próxima manutenção preventiva
    """
    if not os_instance.equipamento:
        logger.info(f"[AtualizarEquipamento] OS {os_instance.numero} sem equipamento vinculado")
        return

    equipamento = os_instance.equipamento
    from django.utils import timezone

    # Atualizar horímetro/leitura atual
    if os_instance.horimetro_final:
        equipamento.leitura_atual = os_instance.horimetro_final
        equipamento.data_ultima_leitura = timezone.now()
        logger.info(f"[AtualizarEquipamento] Horímetro atualizado: {os_instance.horimetro_final}")

    # Atualizar data e leitura da última manutenção
    equipamento.data_ultima_manutencao = os_instance.data_conclusao
    equipamento.leitura_ultima_manutencao = os_instance.horimetro_final or equipamento.leitura_atual

    # Calcular próxima manutenção se for manutenção preventiva
    if os_instance.orcamento and os_instance.orcamento.tipo == 'MANUTENCAO_PREVENTIVA':
        if os_instance.orcamento.modelo_manutencao_preventiva:
            modelo = os_instance.orcamento.modelo_manutencao_preventiva
            leitura_atual = equipamento.leitura_atual or 0

            # Próxima manutenção por leitura (horímetro/km)
            equipamento.proxima_manutencao_leitura = leitura_atual + modelo.intervalo

            # Próxima manutenção por data (estimar com base no intervalo)
            # Assumindo uso médio, calcular data aproximada
            if equipamento.data_conclusao and modelo.intervalo:
                # Estimar dias até próxima manutenção (assumir 8h/dia de operação ou 100km/dia)
                dias_estimados = 30  # Default de 1 mês
                if equipamento.tipo_medicao == 'HORA':
                    # Se usa horímetro, estimar com base em 8h/dia de operação
                    dias_estimados = int(modelo.intervalo / 8)
                elif equipamento.tipo_medicao == 'KM':
                    # Se usa KM, estimar com base em 100km/dia
                    dias_estimados = int(modelo.intervalo / 100)

                # Limitar entre 7 e 180 dias
                dias_estimados = max(7, min(180, dias_estimados))
                equipamento.proxima_manutencao_data = os_instance.data_conclusao + timedelta(days=dias_estimados)

            logger.info(
                f"[AtualizarEquipamento] Próxima manutenção programada - "
                f"Leitura: {equipamento.proxima_manutencao_leitura}, "
                f"Data: {equipamento.proxima_manutencao_data}"
            )

    # Atualizar status operacional
    equipamento.status_operacional = 'OPERACIONAL'

    equipamento.save()
    logger.info(f"[AtualizarEquipamento] Equipamento {equipamento.codigo} atualizado com sucesso")


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
