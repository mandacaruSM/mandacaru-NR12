"""
Métricas de Gestão para Mineração - Backend

Endpoints:
- /api/v1/relatorios/metricas/dashboard/ - Dashboard consolidado
- /api/v1/relatorios/metricas/disponibilidade/ - Disponibilidade Física (DF%)
- /api/v1/relatorios/metricas/consumo/ - Consumo Médio de Combustível
- /api/v1/relatorios/metricas/utilizacao/ - Utilização de Frota
- /api/v1/relatorios/metricas/cph/ - Custo Por Hora (CPH)
- /api/v1/relatorios/metricas/alertas-manutencao/ - Alertas de Manutenção Preventiva
"""
from rest_framework.decorators import api_view, permission_classes as perm_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, Count, Q, Avg, F, Value, DecimalField
from django.db.models.functions import Coalesce
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal

from equipamentos.models import Equipamento, PlanoManutencaoItem, MedicaoEquipamento
from manutencao.models import Manutencao
from abastecimentos.models import Abastecimento
from ordens_servico.models import OrdemServico, ItemOrdemServico
from core.permissions import filter_by_role, get_user_role_safe


def get_date_filters(request):
    """Extrai e valida filtros de data do request."""
    data_inicio = request.query_params.get('data_inicio')
    data_fim = request.query_params.get('data_fim')
    empreendimento_id = request.query_params.get('empreendimento')

    # Período padrão: últimos 30 dias
    if not data_fim:
        data_fim = timezone.now().date()
    else:
        try:
            data_fim = datetime.strptime(data_fim, '%Y-%m-%d').date()
        except ValueError:
            data_fim = timezone.now().date()

    if not data_inicio:
        data_inicio = data_fim - timedelta(days=30)
    else:
        try:
            data_inicio = datetime.strptime(data_inicio, '%Y-%m-%d').date()
        except ValueError:
            data_inicio = data_fim - timedelta(days=30)

    return data_inicio, data_fim, empreendimento_id


def get_equipamentos_queryset(request, empreendimento_id=None):
    """Retorna queryset de equipamentos filtrado por role e empreendimento."""
    qs = filter_by_role(Equipamento.objects.filter(ativo=True), request.user)
    if empreendimento_id:
        qs = qs.filter(empreendimento_id=empreendimento_id)
    return qs


@api_view(['GET'])
@perm_classes([IsAuthenticated])
def dashboard_metricas(request):
    """
    Dashboard consolidado com todas as métricas principais.

    Filtros:
    - data_inicio: YYYY-MM-DD
    - data_fim: YYYY-MM-DD
    - empreendimento: ID do empreendimento
    """
    data_inicio, data_fim, empreendimento_id = get_date_filters(request)
    equipamentos = get_equipamentos_queryset(request, empreendimento_id)

    if not equipamentos.exists():
        return Response({
            'periodo': {'data_inicio': str(data_inicio), 'data_fim': str(data_fim)},
            'aviso': 'Nenhum equipamento encontrado para os filtros aplicados.',
            'metricas': None
        })

    # Calcular métricas
    df_data = calcular_disponibilidade(equipamentos, data_inicio, data_fim)
    consumo_data = calcular_consumo(equipamentos, data_inicio, data_fim)
    utilizacao_data = calcular_utilizacao(equipamentos, data_inicio, data_fim)
    cph_data = calcular_cph(equipamentos, data_inicio, data_fim)
    alertas = calcular_alertas_manutencao(equipamentos)

    # Totais do período
    total_combustivel = Abastecimento.objects.filter(
        equipamento__in=equipamentos,
        data__gte=data_inicio,
        data__lte=data_fim
    ).aggregate(
        litros=Coalesce(Sum('quantidade_litros'), Decimal('0')),
        valor=Coalesce(Sum('valor_total'), Decimal('0'))
    )

    total_custos_os = OrdemServico.objects.filter(
        equipamento__in=equipamentos,
        status='CONCLUIDA',
        data_conclusao__gte=data_inicio,
        data_conclusao__lte=data_fim
    ).aggregate(
        servicos=Coalesce(Sum('valor_servicos'), Decimal('0')),
        produtos=Coalesce(Sum('valor_produtos'), Decimal('0')),
        total=Coalesce(Sum('valor_final'), Decimal('0'))
    )

    # Consumo por equipamento para gráfico
    consumo_por_equipamento = []
    for eq in equipamentos.select_related('tipo')[:10]:
        abast = Abastecimento.objects.filter(
            equipamento=eq,
            data__gte=data_inicio,
            data__lte=data_fim
        ).aggregate(
            litros=Coalesce(Sum('quantidade_litros'), Decimal('0'))
        )
        if abast['litros'] > 0:
            consumo_por_equipamento.append({
                'codigo': eq.codigo,
                'descricao': eq.descricao or eq.modelo,
                'tipo': eq.tipo.nome if eq.tipo else '',
                'litros': float(abast['litros'])
            })

    consumo_por_equipamento.sort(key=lambda x: x['litros'], reverse=True)

    return Response({
        'periodo': {
            'data_inicio': str(data_inicio),
            'data_fim': str(data_fim),
            'dias': (data_fim - data_inicio).days
        },
        'totais': {
            'equipamentos': equipamentos.count(),
            'combustivel_litros': float(total_combustivel['litros']),
            'combustivel_valor': float(total_combustivel['valor']),
            'custo_servicos': float(total_custos_os['servicos']),
            'custo_produtos': float(total_custos_os['produtos']),
            'custo_total': float(total_custos_os['total'])
        },
        'metricas': {
            'disponibilidade_fisica': df_data,
            'consumo_medio': consumo_data,
            'utilizacao_frota': utilizacao_data,
            'cph': cph_data
        },
        'alertas': {
            'total': len(alertas),
            'criticos': len([a for a in alertas if a['prioridade'] == 'CRITICO']),
            'urgentes': len([a for a in alertas if a['prioridade'] == 'URGENTE']),
            'lista': alertas[:10]  # Primeiros 10
        },
        'graficos': {
            'consumo_por_equipamento': consumo_por_equipamento[:10]
        }
    })


def calcular_disponibilidade(equipamentos, data_inicio, data_fim):
    """
    Calcula Disponibilidade Física (DF%).

    DF% = ((Horas Totais - Horas em Manutenção) / Horas Totais) * 100

    Horas em manutenção = duração das OS em execução/manutenção
    """
    total_horas_periodo = (data_fim - data_inicio).days * 24  # Horas no período

    # Buscar OS concluídas no período para calcular tempo em manutenção
    os_concluidas = OrdemServico.objects.filter(
        equipamento__in=equipamentos,
        status='CONCLUIDA',
        data_inicio__isnull=False,
        data_conclusao__isnull=False,
        data_inicio__gte=data_inicio,
        data_conclusao__lte=data_fim
    )

    total_horas_manutencao = 0
    equipamentos_com_dados = 0
    disponibilidades = []

    for equip in equipamentos.select_related('tipo'):
        os_equip = os_concluidas.filter(equipamento=equip)
        horas_manut = sum(
            (os.data_conclusao - os.data_inicio).days * 8  # Assume 8h/dia de trabalho
            for os in os_equip
        )
        total_horas_manutencao += horas_manut

        # Disponibilidade individual
        if total_horas_periodo > 0:
            df_percent = ((total_horas_periodo - horas_manut) / total_horas_periodo) * 100
            df_percent = max(0, min(100, df_percent))  # Limitar entre 0-100
        else:
            df_percent = 100

        disponibilidades.append({
            'equipamento_id': equip.id,
            'codigo': equip.codigo,
            'tipo': equip.tipo.nome if equip.tipo else '',
            'horas_manutencao': horas_manut,
            'disponibilidade_percent': round(df_percent, 2)
        })

        if horas_manut > 0:
            equipamentos_com_dados += 1

    # Média geral
    if disponibilidades:
        media_df = sum(d['disponibilidade_percent'] for d in disponibilidades) / len(disponibilidades)
    else:
        media_df = 100

    return {
        'media_percent': round(media_df, 2),
        'total_horas_periodo': total_horas_periodo,
        'total_horas_manutencao': total_horas_manutencao,
        'equipamentos_analisados': len(disponibilidades),
        'detalhes': sorted(disponibilidades, key=lambda x: x['disponibilidade_percent'])[:10]
    }


def calcular_consumo(equipamentos, data_inicio, data_fim):
    """
    Calcula Consumo Médio de Combustível (L/h ou L/km).

    Consumo = Total Litros / (Leitura Final - Leitura Inicial)
    """
    consumos = []
    total_litros = Decimal('0')
    total_horas_km = Decimal('0')

    for equip in equipamentos.select_related('tipo'):
        abastecimentos = Abastecimento.objects.filter(
            equipamento=equip,
            data__gte=data_inicio,
            data__lte=data_fim
        ).order_by('data', 'horimetro_km')

        if abastecimentos.count() < 2:
            continue

        primeiro = abastecimentos.first()
        ultimo = abastecimentos.last()
        litros = abastecimentos.aggregate(total=Sum('quantidade_litros'))['total'] or Decimal('0')

        diferenca_leitura = ultimo.horimetro_km - primeiro.horimetro_km

        if diferenca_leitura > 0:
            consumo_medio = litros / diferenca_leitura
            total_litros += litros
            total_horas_km += diferenca_leitura

            unidade = 'L/h' if equip.tipo_medicao == 'HORA' else 'L/km'
            consumos.append({
                'equipamento_id': equip.id,
                'codigo': equip.codigo,
                'tipo': equip.tipo.nome if equip.tipo else '',
                'tipo_medicao': equip.tipo_medicao,
                'litros_total': float(litros),
                'diferenca_leitura': float(diferenca_leitura),
                'consumo_medio': round(float(consumo_medio), 2),
                'unidade': unidade
            })

    # Média geral (apenas para equipamentos com horímetro)
    consumos_horimetro = [c for c in consumos if c['tipo_medicao'] == 'HORA']
    if consumos_horimetro:
        media_consumo = sum(c['consumo_medio'] for c in consumos_horimetro) / len(consumos_horimetro)
    else:
        media_consumo = 0

    return {
        'media_litros_hora': round(media_consumo, 2),
        'total_litros': float(total_litros),
        'equipamentos_analisados': len(consumos),
        'aviso': 'São necessários pelo menos 2 abastecimentos por equipamento para calcular consumo.' if len(consumos) == 0 else None,
        'detalhes': sorted(consumos, key=lambda x: x['consumo_medio'], reverse=True)[:10]
    }


def calcular_utilizacao(equipamentos, data_inicio, data_fim):
    """
    Calcula Utilização de Frota.

    Utilização = Equipamentos com atividade / Total de Equipamentos
    """
    total_equipamentos = equipamentos.count()

    if total_equipamentos == 0:
        return {
            'percentual': 0,
            'operando': 0,
            'parados': 0,
            'total': 0
        }

    # Equipamentos com atividade no período (abastecimento, manutenção, checklist, medição)
    equipamentos_ativos = set()

    # Via abastecimentos
    abast_ids = Abastecimento.objects.filter(
        equipamento__in=equipamentos,
        data__gte=data_inicio,
        data__lte=data_fim
    ).values_list('equipamento_id', flat=True).distinct()
    equipamentos_ativos.update(abast_ids)

    # Via manutenções
    manut_ids = Manutencao.objects.filter(
        equipamento__in=equipamentos,
        data__gte=data_inicio,
        data__lte=data_fim
    ).values_list('equipamento_id', flat=True).distinct()
    equipamentos_ativos.update(manut_ids)

    # Via medições
    medicao_ids = MedicaoEquipamento.objects.filter(
        equipamento__in=equipamentos,
        criado_em__date__gte=data_inicio,
        criado_em__date__lte=data_fim
    ).values_list('equipamento_id', flat=True).distinct()
    equipamentos_ativos.update(medicao_ids)

    # Via OS
    os_ids = OrdemServico.objects.filter(
        equipamento__in=equipamentos,
        data_abertura__gte=data_inicio,
        data_abertura__lte=data_fim
    ).values_list('equipamento_id', flat=True).distinct()
    equipamentos_ativos.update(os_ids)

    operando = len(equipamentos_ativos)
    parados = total_equipamentos - operando
    percentual = (operando / total_equipamentos) * 100

    # Listar parados
    ids_ativos = list(equipamentos_ativos)
    equipamentos_parados = equipamentos.exclude(id__in=ids_ativos).values(
        'id', 'codigo', 'descricao', 'leitura_atual', 'tipo__nome'
    )[:10]

    return {
        'percentual': round(percentual, 2),
        'operando': operando,
        'parados': parados,
        'total': total_equipamentos,
        'equipamentos_parados': list(equipamentos_parados)
    }


def calcular_cph(equipamentos, data_inicio, data_fim):
    """
    Calcula Custo Por Hora (CPH).

    CPH = (Combustível + Peças + Mão de Obra) / Horas Trabalhadas
    """
    cphs = []
    total_custo = Decimal('0')
    total_horas = Decimal('0')

    for equip in equipamentos.select_related('tipo'):
        # Custo de combustível
        custo_combustivel = Abastecimento.objects.filter(
            equipamento=equip,
            data__gte=data_inicio,
            data__lte=data_fim
        ).aggregate(total=Coalesce(Sum('valor_total'), Decimal('0')))['total']

        # Custo de mão de obra e peças (via OS concluídas)
        custos_os = OrdemServico.objects.filter(
            equipamento=equip,
            status='CONCLUIDA',
            data_conclusao__gte=data_inicio,
            data_conclusao__lte=data_fim
        ).aggregate(
            mao_obra=Coalesce(Sum('valor_servicos'), Decimal('0')),
            pecas=Coalesce(Sum('valor_produtos'), Decimal('0'))
        )

        custo_mao_obra = custos_os['mao_obra']
        custo_pecas = custos_os['pecas']
        custo_total = custo_combustivel + custo_mao_obra + custo_pecas

        # Horas trabalhadas (diferença de horímetro no período)
        medicoes = MedicaoEquipamento.objects.filter(
            equipamento=equip,
            criado_em__date__gte=data_inicio,
            criado_em__date__lte=data_fim
        ).order_by('criado_em')

        if medicoes.count() >= 2:
            primeira = medicoes.first()
            ultima = medicoes.last()
            horas_trabalhadas = ultima.leitura - primeira.leitura
        else:
            # Tentar via abastecimentos
            abast = Abastecimento.objects.filter(
                equipamento=equip,
                data__gte=data_inicio,
                data__lte=data_fim
            ).order_by('horimetro_km')
            if abast.count() >= 2:
                horas_trabalhadas = abast.last().horimetro_km - abast.first().horimetro_km
            else:
                horas_trabalhadas = Decimal('0')

        if horas_trabalhadas > 0 and custo_total > 0:
            cph = custo_total / horas_trabalhadas
            total_custo += custo_total
            total_horas += horas_trabalhadas

            cphs.append({
                'equipamento_id': equip.id,
                'codigo': equip.codigo,
                'tipo': equip.tipo.nome if equip.tipo else '',
                'custo_combustivel': float(custo_combustivel),
                'custo_mao_obra': float(custo_mao_obra),
                'custo_pecas': float(custo_pecas),
                'custo_total': float(custo_total),
                'horas_trabalhadas': float(horas_trabalhadas),
                'cph': round(float(cph), 2)
            })

    # CPH médio
    if total_horas > 0:
        cph_medio = total_custo / total_horas
    else:
        cph_medio = Decimal('0')

    return {
        'cph_medio': round(float(cph_medio), 2),
        'custo_total': float(total_custo),
        'horas_totais': float(total_horas),
        'equipamentos_analisados': len(cphs),
        'aviso': 'São necessárias medições de horímetro para calcular CPH com precisão.' if len(cphs) == 0 else None,
        'detalhes': sorted(cphs, key=lambda x: x['cph'], reverse=True)[:10]
    }


def calcular_alertas_manutencao(equipamentos):
    """
    Calcula alertas de manutenção preventiva baseado em:
    1. PlanoManutencaoItem (intervalos configurados)
    2. Manutencao.proxima_manutencao
    """
    alertas = []

    for equip in equipamentos.select_related('tipo'):
        leitura_atual = equip.leitura_atual or Decimal('0')
        unidade = 'h' if equip.tipo_medicao == 'HORA' else 'km'

        # 1. Verificar planos de manutenção
        planos = PlanoManutencaoItem.objects.filter(equipamento=equip, ativo=True)
        for plano in planos:
            if plano.proxima_leitura:
                diferenca = plano.proxima_leitura - leitura_atual
                percentual_restante = (diferenca / plano.periodicidade_valor * 100) if plano.periodicidade_valor > 0 else 100

                # Determinar prioridade
                if diferenca <= 0:
                    prioridade = 'CRITICO'
                    status = 'VENCIDO'
                elif percentual_restante <= 10:
                    prioridade = 'URGENTE'
                    status = 'PROXIMO'
                elif percentual_restante <= plano.antecedencia_percent:
                    prioridade = 'ATENCAO'
                    status = 'PROGRAMAR'
                else:
                    continue  # Não precisa alertar

                alertas.append({
                    'equipamento_id': equip.id,
                    'codigo': equip.codigo,
                    'tipo_equipamento': equip.tipo.nome if equip.tipo else '',
                    'item': plano.titulo,
                    'tipo': 'PLANO',
                    'leitura_atual': float(leitura_atual),
                    'proxima_leitura': float(plano.proxima_leitura),
                    'diferenca': float(diferenca),
                    'unidade': unidade,
                    'prioridade': prioridade,
                    'status': status,
                    'periodicidade': f"A cada {plano.periodicidade_valor} {unidade}"
                })

        # 2. Verificar última manutenção preventiva com próxima programada
        ultima_preventiva = Manutencao.objects.filter(
            equipamento=equip,
            tipo='preventiva',
            proxima_manutencao__isnull=False
        ).order_by('-data').first()

        if ultima_preventiva and ultima_preventiva.proxima_manutencao:
            diferenca = ultima_preventiva.proxima_manutencao - leitura_atual
            # Assume intervalo de 250h padrão para cálculo de percentual
            intervalo_padrao = 250
            percentual_restante = (diferenca / intervalo_padrao * 100)

            if diferenca <= 0:
                prioridade = 'CRITICO'
                status = 'VENCIDO'
            elif diferenca <= 25:  # 10% de 250
                prioridade = 'URGENTE'
                status = 'PROXIMO'
            elif diferenca <= 50:  # 20% de 250
                prioridade = 'ATENCAO'
                status = 'PROGRAMAR'
            else:
                continue

            # Evitar duplicatas com planos
            ja_existe = any(
                a['equipamento_id'] == equip.id and a['tipo'] == 'PLANO'
                for a in alertas
            )
            if not ja_existe:
                alertas.append({
                    'equipamento_id': equip.id,
                    'codigo': equip.codigo,
                    'tipo_equipamento': equip.tipo.nome if equip.tipo else '',
                    'item': 'Manutenção Preventiva Geral',
                    'tipo': 'MANUTENCAO',
                    'leitura_atual': float(leitura_atual),
                    'proxima_leitura': float(ultima_preventiva.proxima_manutencao),
                    'diferenca': float(diferenca),
                    'unidade': unidade,
                    'prioridade': prioridade,
                    'status': status,
                    'ultima_manutencao': str(ultima_preventiva.data)
                })

    # Ordenar por prioridade
    prioridade_ordem = {'CRITICO': 0, 'URGENTE': 1, 'ATENCAO': 2}
    alertas.sort(key=lambda x: (prioridade_ordem.get(x['prioridade'], 99), x['diferenca']))

    return alertas


@api_view(['GET'])
@perm_classes([IsAuthenticated])
def disponibilidade_fisica(request):
    """Endpoint específico para Disponibilidade Física."""
    data_inicio, data_fim, empreendimento_id = get_date_filters(request)
    equipamentos = get_equipamentos_queryset(request, empreendimento_id)

    return Response({
        'periodo': {'data_inicio': str(data_inicio), 'data_fim': str(data_fim)},
        'dados': calcular_disponibilidade(equipamentos, data_inicio, data_fim)
    })


@api_view(['GET'])
@perm_classes([IsAuthenticated])
def consumo_combustivel(request):
    """Endpoint específico para Consumo de Combustível."""
    data_inicio, data_fim, empreendimento_id = get_date_filters(request)
    equipamentos = get_equipamentos_queryset(request, empreendimento_id)

    return Response({
        'periodo': {'data_inicio': str(data_inicio), 'data_fim': str(data_fim)},
        'dados': calcular_consumo(equipamentos, data_inicio, data_fim)
    })


@api_view(['GET'])
@perm_classes([IsAuthenticated])
def utilizacao_frota(request):
    """Endpoint específico para Utilização de Frota."""
    data_inicio, data_fim, empreendimento_id = get_date_filters(request)
    equipamentos = get_equipamentos_queryset(request, empreendimento_id)

    return Response({
        'periodo': {'data_inicio': str(data_inicio), 'data_fim': str(data_fim)},
        'dados': calcular_utilizacao(equipamentos, data_inicio, data_fim)
    })


@api_view(['GET'])
@perm_classes([IsAuthenticated])
def custo_por_hora(request):
    """Endpoint específico para CPH."""
    data_inicio, data_fim, empreendimento_id = get_date_filters(request)
    equipamentos = get_equipamentos_queryset(request, empreendimento_id)

    return Response({
        'periodo': {'data_inicio': str(data_inicio), 'data_fim': str(data_fim)},
        'dados': calcular_cph(equipamentos, data_inicio, data_fim)
    })


@api_view(['GET'])
@perm_classes([IsAuthenticated])
def alertas_manutencao(request):
    """Endpoint específico para Alertas de Manutenção."""
    _, _, empreendimento_id = get_date_filters(request)
    equipamentos = get_equipamentos_queryset(request, empreendimento_id)

    alertas = calcular_alertas_manutencao(equipamentos)

    return Response({
        'total': len(alertas),
        'criticos': len([a for a in alertas if a['prioridade'] == 'CRITICO']),
        'urgentes': len([a for a in alertas if a['prioridade'] == 'URGENTE']),
        'atencao': len([a for a in alertas if a['prioridade'] == 'ATENCAO']),
        'alertas': alertas
    })


@api_view(['GET'])
@perm_classes([IsAuthenticated])
def exportar_relatorio(request):
    """
    Exporta relatório em formato JSON estruturado para PDF/CSV.
    O frontend converte usando jsPDF ou similar.
    """
    data_inicio, data_fim, empreendimento_id = get_date_filters(request)
    equipamentos = get_equipamentos_queryset(request, empreendimento_id)

    # Gerar dados completos
    df_data = calcular_disponibilidade(equipamentos, data_inicio, data_fim)
    consumo_data = calcular_consumo(equipamentos, data_inicio, data_fim)
    utilizacao_data = calcular_utilizacao(equipamentos, data_inicio, data_fim)
    cph_data = calcular_cph(equipamentos, data_inicio, data_fim)
    alertas = calcular_alertas_manutencao(equipamentos)

    # Total de combustível
    total_combustivel = Abastecimento.objects.filter(
        equipamento__in=equipamentos,
        data__gte=data_inicio,
        data__lte=data_fim
    ).aggregate(
        litros=Coalesce(Sum('quantidade_litros'), Decimal('0')),
        valor=Coalesce(Sum('valor_total'), Decimal('0'))
    )

    return Response({
        'titulo': 'Relatório de Métricas de Gestão',
        'gerado_em': timezone.now().isoformat(),
        'periodo': {
            'data_inicio': str(data_inicio),
            'data_fim': str(data_fim),
            'dias': (data_fim - data_inicio).days
        },
        'resumo': {
            'total_equipamentos': equipamentos.count(),
            'disponibilidade_media': df_data['media_percent'],
            'consumo_medio_lh': consumo_data['media_litros_hora'],
            'utilizacao_frota': utilizacao_data['percentual'],
            'cph_medio': cph_data['cph_medio'],
            'total_combustivel_litros': float(total_combustivel['litros']),
            'total_combustivel_valor': float(total_combustivel['valor']),
            'alertas_criticos': len([a for a in alertas if a['prioridade'] == 'CRITICO']),
            'alertas_urgentes': len([a for a in alertas if a['prioridade'] == 'URGENTE'])
        },
        'disponibilidade': df_data,
        'consumo': consumo_data,
        'utilizacao': utilizacao_data,
        'cph': cph_data,
        'alertas': alertas
    })
