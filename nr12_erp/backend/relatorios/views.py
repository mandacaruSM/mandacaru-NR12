from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Sum, Count, Q, Avg
from django.utils import timezone
from datetime import datetime, timedelta

from ordens_servico.models import OrdemServico
from manutencao.models import Manutencao
from equipamentos.models import Equipamento
from orcamentos.models import Orcamento


@api_view(['GET'])
def relatorio_operacional(request):
    """
    Relatório operacional consolidado do sistema.

    Mostra:
    - Ordens de serviço executadas
    - Manutenções realizadas
    - Equipamentos atendidos
    - Estatísticas operacionais

    Filtros opcionais:
    - data_inicio: data inicial do período
    - data_fim: data final do período
    - cliente: filtrar por cliente
    - equipamento: filtrar por equipamento
    - tecnico: filtrar por técnico
    """

    # Obter filtros
    data_inicio = request.query_params.get('data_inicio')
    data_fim = request.query_params.get('data_fim')
    cliente_id = request.query_params.get('cliente')
    equipamento_id = request.query_params.get('equipamento')
    tecnico_id = request.query_params.get('tecnico')

    # Período padrão: últimos 30 dias
    if not data_fim:
        data_fim = timezone.now().date()
    else:
        data_fim = datetime.strptime(data_fim, '%Y-%m-%d').date()

    if not data_inicio:
        data_inicio = data_fim - timedelta(days=30)
    else:
        data_inicio = datetime.strptime(data_inicio, '%Y-%m-%d').date()

    # Filtros base
    os_filters = Q(data_abertura__gte=data_inicio, data_abertura__lte=data_fim)
    manutencao_filters = Q(data__gte=data_inicio, data__lte=data_fim)
    orcamento_filters = Q(data_emissao__gte=data_inicio, data_emissao__lte=data_fim)

    if cliente_id:
        os_filters &= Q(cliente_id=cliente_id)
        orcamento_filters &= Q(cliente_id=cliente_id)

    if equipamento_id:
        os_filters &= Q(equipamento_id=equipamento_id)
        manutencao_filters &= Q(equipamento_id=equipamento_id)
        orcamento_filters &= Q(equipamento_id=equipamento_id)

    if tecnico_id:
        os_filters &= Q(tecnico_responsavel_id=tecnico_id)
        manutencao_filters &= Q(tecnico_id=tecnico_id)

    # Buscar dados
    ordens_servico = OrdemServico.objects.filter(os_filters).select_related(
        'cliente', 'equipamento', 'tecnico_responsavel', 'orcamento'
    )

    manutencoes = Manutencao.objects.filter(manutencao_filters).select_related(
        'equipamento', 'tecnico', 'ordem_servico'
    )

    orcamentos = Orcamento.objects.filter(orcamento_filters).select_related(
        'cliente', 'equipamento'
    )

    # Estatísticas de Orçamentos
    total_orcamentos = orcamentos.count()
    orcamentos_aprovados = orcamentos.filter(status='APROVADO').count()
    orcamentos_rejeitados = orcamentos.filter(status='REJEITADO').count()
    valor_total_orcamentos = orcamentos.aggregate(total=Sum('valor_total'))['total'] or 0

    # Estatísticas de Ordens de Serviço
    total_os = ordens_servico.count()
    os_abertas = ordens_servico.filter(status='ABERTA').count()
    os_em_execucao = ordens_servico.filter(status='EM_EXECUCAO').count()
    os_concluidas = ordens_servico.filter(status='CONCLUIDA').count()
    os_canceladas = ordens_servico.filter(status='CANCELADA').count()

    valor_total_os = ordens_servico.aggregate(total=Sum('valor_final'))['total'] or 0
    valor_medio_os = ordens_servico.aggregate(media=Avg('valor_final'))['media'] or 0

    # Tempo médio de execução (em dias)
    os_concluidas_query = ordens_servico.filter(
        status='CONCLUIDA',
        data_abertura__isnull=False,
        data_conclusao__isnull=False
    )

    tempo_medio_execucao = None
    if os_concluidas_query.exists():
        tempos = [
            (os.data_conclusao - os.data_abertura).days
            for os in os_concluidas_query
        ]
        tempo_medio_execucao = sum(tempos) / len(tempos) if tempos else 0

    # Estatísticas de Manutenções
    total_manutencoes = manutencoes.count()
    manutencoes_preventivas = manutencoes.filter(tipo='preventiva').count()
    manutencoes_corretivas = manutencoes.filter(tipo='corretiva').count()

    # Equipamentos atendidos
    equipamentos_atendidos = ordens_servico.values('equipamento').distinct().count()

    # Top 5 equipamentos com mais manutenções
    top_equipamentos = manutencoes.values(
        'equipamento__id',
        'equipamento__codigo',
        'equipamento__descricao'
    ).annotate(
        total_manutencoes=Count('id')
    ).order_by('-total_manutencoes')[:5]

    # Top 5 técnicos mais ativos
    top_tecnicos = ordens_servico.filter(
        tecnico_responsavel__isnull=False
    ).values(
        'tecnico_responsavel__id',
        'tecnico_responsavel__nome'
    ).annotate(
        total_os=Count('id')
    ).order_by('-total_os')[:5]

    # Manutenções por mês (últimos 6 meses)
    seis_meses_atras = data_fim - timedelta(days=180)
    manutencoes_por_mes = []

    for i in range(6):
        mes_inicio = seis_meses_atras + timedelta(days=30*i)
        mes_fim = mes_inicio + timedelta(days=30)

        total = manutencoes.filter(
            data__gte=mes_inicio,
            data__lt=mes_fim
        ).count()

        manutencoes_por_mes.append({
            'mes': mes_inicio.strftime('%m/%Y'),
            'total': total
        })

    # Ordens de serviço recentes (últimas 10)
    os_recentes = ordens_servico.order_by('-data_abertura')[:10].values(
        'id',
        'numero',
        'cliente__nome_razao',
        'equipamento__codigo',
        'status',
        'data_abertura',
        'data_conclusao',
        'valor_final',
        'tecnico_responsavel__nome'
    )

    # Manutenções recentes (últimas 10)
    manutencoes_recentes = manutencoes.order_by('-data')[:10].values(
        'id',
        'equipamento__codigo',
        'equipamento__descricao',
        'tipo',
        'data',
        'horimetro',
        'tecnico__nome',
        'ordem_servico__numero'
    )

    return Response({
        'periodo': {
            'data_inicio': data_inicio.isoformat(),
            'data_fim': data_fim.isoformat()
        },
        'orcamentos': {
            'total': total_orcamentos,
            'aprovados': orcamentos_aprovados,
            'rejeitados': orcamentos_rejeitados,
            'valor_total': float(valor_total_orcamentos),
            'taxa_aprovacao': round((orcamentos_aprovados / total_orcamentos * 100) if total_orcamentos > 0 else 0, 2)
        },
        'ordens_servico': {
            'total': total_os,
            'abertas': os_abertas,
            'em_execucao': os_em_execucao,
            'concluidas': os_concluidas,
            'canceladas': os_canceladas,
            'valor_total': float(valor_total_os),
            'valor_medio': float(valor_medio_os),
            'tempo_medio_execucao_dias': round(tempo_medio_execucao, 1) if tempo_medio_execucao else None
        },
        'manutencoes': {
            'total': total_manutencoes,
            'preventivas': manutencoes_preventivas,
            'corretivas': manutencoes_corretivas,
            'percentual_preventivas': round((manutencoes_preventivas / total_manutencoes * 100) if total_manutencoes > 0 else 0, 2)
        },
        'equipamentos': {
            'atendidos': equipamentos_atendidos,
            'top_5_manutencoes': list(top_equipamentos)
        },
        'tecnicos': {
            'top_5_ativos': list(top_tecnicos)
        },
        'graficos': {
            'manutencoes_por_mes': manutencoes_por_mes
        },
        'recentes': {
            'ordens_servico': list(os_recentes),
            'manutencoes': list(manutencoes_recentes)
        }
    })
