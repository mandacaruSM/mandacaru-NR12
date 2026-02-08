from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Avg, Count, F
from django.db.models.functions import Coalesce
from decimal import Decimal
from django.db import models
from django.shortcuts import get_object_or_404

from .models import FioDiamantado, RegistroCorte, MovimentacaoFio
from .serializers import (
    FioDiamantadoListSerializer,
    FioDiamantadoDetailSerializer,
    FioDiamantadoCreateSerializer,
    RegistroCorteListSerializer,
    RegistroCorteCreateSerializer,
    IniciarCorteSerializer,
    FinalizarCorteSerializer,
    MovimentacaoFioListSerializer,
    MovimentacaoFioCreateSerializer,
    CorteEmAndamentoSerializer,
)
from core.permissions import filter_by_role


class FioDiamantadoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciamento de Fios Diamantados
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = FioDiamantado.objects.select_related(
            'cliente', 'empreendimento', 'maquina_instalada'
        )
        qs = filter_by_role(qs, self.request.user)

        # Filtros
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        cliente_id = self.request.query_params.get('cliente')
        if cliente_id:
            qs = qs.filter(cliente_id=cliente_id)

        localizacao = self.request.query_params.get('localizacao')
        if localizacao:
            qs = qs.filter(localizacao=localizacao)

        empreendimento_id = self.request.query_params.get('empreendimento')
        if empreendimento_id:
            qs = qs.filter(empreendimento_id=empreendimento_id)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                models.Q(codigo__icontains=search) |
                models.Q(fabricante__icontains=search) |
                models.Q(numero_serie__icontains=search) |
                models.Q(nota_fiscal__icontains=search)
            )

        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return FioDiamantadoListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return FioDiamantadoCreateSerializer
        return FioDiamantadoDetailSerializer

    def perform_create(self, serializer):
        """Auto-atribui cliente quando usuario e CLIENTE"""
        user = self.request.user
        role = None
        if hasattr(user, 'profile') and user.profile:
            role = user.profile.role

        if role == 'CLIENTE':
            cliente = getattr(user, 'cliente_profile', None)
            if cliente:
                serializer.save(cliente=cliente)
                return
        serializer.save()

    @action(detail=True, methods=['get'])
    def historico_desgaste(self, request, pk=None):
        """Retorna historico de desgaste para grafico"""
        fio = self.get_object()
        cortes = fio.registros_corte.filter(status='FINALIZADO').order_by('data', 'hora_final')

        historico = []
        area_acumulada = Decimal('0')

        # Adicionar ponto inicial
        historico.append({
            'data': fio.data_cadastro,
            'diametro_mm': float(fio.diametro_inicial_mm),
            'area_corte_m2': 0,
            'area_acumulada_m2': 0,
        })

        for corte in cortes:
            if corte.area_corte_m2:
                area_acumulada += corte.area_corte_m2
            historico.append({
                'data': corte.data,
                'diametro_mm': float(corte.diametro_final_mm) if corte.diametro_final_mm else None,
                'area_corte_m2': float(corte.area_corte_m2) if corte.area_corte_m2 else 0,
                'area_acumulada_m2': float(area_acumulada),
            })

        return Response(historico)

    @action(detail=True, methods=['get'])
    def movimentacoes(self, request, pk=None):
        """Retorna historico de movimentacoes do fio"""
        fio = self.get_object()
        movimentacoes = fio.movimentacoes.order_by('-data', '-criado_em')
        serializer = MovimentacaoFioListSerializer(movimentacoes, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def transferir(self, request, pk=None):
        """Transfere o fio para outro local"""
        fio = self.get_object()
        serializer = MovimentacaoFioCreateSerializer(data={
            'fio': fio.id,
            **request.data
        })
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Transferencia realizada com sucesso'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def dashboard(self, request, pk=None):
        """Retorna dados completos para dashboard do fio"""
        fio = self.get_object()
        serializer = FioDiamantadoDetailSerializer(fio)

        # Historico de desgaste (apenas finalizados)
        cortes = fio.registros_corte.filter(status='FINALIZADO').order_by('data', 'hora_final')
        historico = []
        area_acumulada = Decimal('0')

        historico.append({
            'data': str(fio.data_cadastro),
            'diametro_mm': float(fio.diametro_inicial_mm),
            'area_corte_m2': 0,
            'area_acumulada_m2': 0,
        })

        for corte in cortes:
            if corte.area_corte_m2:
                area_acumulada += corte.area_corte_m2
            historico.append({
                'data': str(corte.data),
                'diametro_mm': float(corte.diametro_final_mm) if corte.diametro_final_mm else None,
                'area_corte_m2': float(corte.area_corte_m2) if corte.area_corte_m2 else 0,
                'area_acumulada_m2': float(area_acumulada),
            })

        # Custos por fonte de energia
        custos_diesel = cortes.filter(fonte_energia='GERADOR_DIESEL').aggregate(
            area_total=Coalesce(Sum('area_corte_m2'), Decimal('0')),
            consumo_total=Coalesce(Sum('consumo_combustivel_litros'), Decimal('0')),
            tempo_total=Coalesce(Sum('tempo_execucao_horas'), Decimal('0')),
        )
        custos_rede = cortes.filter(fonte_energia='REDE_ELETRICA').aggregate(
            area_total=Coalesce(Sum('area_corte_m2'), Decimal('0')),
            tempo_total=Coalesce(Sum('tempo_execucao_horas'), Decimal('0')),
        )

        preco_diesel = Decimal('6.50')
        preco_kwh = Decimal('0.80')  # Estimativa
        potencia_maquina_kw = Decimal('50')  # Estimativa media

        custo_diesel = float(custos_diesel['consumo_total'] * preco_diesel)
        custo_eletrica = float(custos_rede['tempo_total'] * potencia_maquina_kw * preco_kwh)

        custos_por_fonte = {
            'diesel': {
                'area_total_m2': float(custos_diesel['area_total']),
                'consumo_litros': float(custos_diesel['consumo_total']),
                'tempo_horas': float(custos_diesel['tempo_total']),
                'custo_total': custo_diesel,
            },
            'rede_eletrica': {
                'area_total_m2': float(custos_rede['area_total']),
                'tempo_horas': float(custos_rede['tempo_total']),
                'custo_estimado': custo_eletrica,
            }
        }

        # Alertas
        alertas = []
        if fio.precisa_substituicao:
            alertas.append({
                'tipo': 'CRITICO',
                'mensagem': f'Fio {fio.codigo} atingiu o diametro minimo e precisa ser substituido!',
                'diametro_atual': float(fio.diametro_atual_mm),
                'diametro_minimo': float(fio.diametro_minimo_mm),
            })
        elif fio.percentual_vida_util <= 20:
            alertas.append({
                'tipo': 'URGENTE',
                'mensagem': f'Fio {fio.codigo} com apenas {fio.percentual_vida_util}% de vida util restante',
                'diametro_atual': float(fio.diametro_atual_mm),
                'percentual_restante': fio.percentual_vida_util,
            })
        elif fio.percentual_vida_util <= 40:
            alertas.append({
                'tipo': 'ATENCAO',
                'mensagem': f'Fio {fio.codigo} com {fio.percentual_vida_util}% de vida util restante',
                'diametro_atual': float(fio.diametro_atual_mm),
                'percentual_restante': fio.percentual_vida_util,
            })

        # Cortes em andamento
        cortes_em_andamento = fio.registros_corte.filter(status='EM_ANDAMENTO')
        cortes_andamento_serializer = CorteEmAndamentoSerializer(cortes_em_andamento, many=True)

        return Response({
            'fio': serializer.data,
            'historico_desgaste': historico,
            'custos_por_fonte': custos_por_fonte,
            'alertas': alertas,
            'cortes_em_andamento': cortes_andamento_serializer.data,
        })

    @action(detail=False, methods=['get'])
    def resumo(self, request):
        """Retorna resumo geral dos fios"""
        qs = self.get_queryset()

        totais = qs.aggregate(
            total=Count('id'),
            ativos=Count('id', filter=models.Q(status='ATIVO')),
            finalizados=Count('id', filter=models.Q(status='FINALIZADO')),
            manutencao=Count('id', filter=models.Q(status='MANUTENCAO')),
        )

        # Por localizacao
        por_localizacao = qs.values('localizacao').annotate(
            total=Count('id')
        )

        # Fios que precisam substituicao
        fios_criticos = []
        for fio in qs.filter(status='ATIVO'):
            if fio.precisa_substituicao:
                fios_criticos.append({
                    'id': fio.id,
                    'codigo': fio.codigo,
                    'diametro_atual': float(fio.diametro_atual_mm),
                    'diametro_minimo': float(fio.diametro_minimo_mm),
                    'tipo_alerta': 'CRITICO',
                })
            elif fio.percentual_vida_util <= 20:
                fios_criticos.append({
                    'id': fio.id,
                    'codigo': fio.codigo,
                    'percentual_vida_util': fio.percentual_vida_util,
                    'tipo_alerta': 'URGENTE',
                })

        return Response({
            'totais': totais,
            'por_localizacao': list(por_localizacao),
            'alertas': fios_criticos,
        })


class MovimentacaoFioViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciamento de Movimentacoes de Fio
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = MovimentacaoFio.objects.select_related(
            'fio', 'fio__cliente', 'empreendimento_origem', 'empreendimento_destino', 'maquina'
        )

        # Filtrar pelo cliente do fio
        fios_permitidos = filter_by_role(FioDiamantado.objects.all(), self.request.user)
        qs = qs.filter(fio__in=fios_permitidos)

        # Filtros
        fio_id = self.request.query_params.get('fio')
        if fio_id:
            qs = qs.filter(fio_id=fio_id)

        tipo = self.request.query_params.get('tipo')
        if tipo:
            qs = qs.filter(tipo=tipo)

        return qs

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return MovimentacaoFioCreateSerializer
        return MovimentacaoFioListSerializer


class RegistroCorteViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciamento de Registros de Corte
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = RegistroCorte.objects.select_related(
            'fio', 'fio__cliente', 'maquina', 'gerador', 'empreendimento'
        )

        # Filtrar pelo cliente do fio
        fios_permitidos = filter_by_role(FioDiamantado.objects.all(), self.request.user)
        qs = qs.filter(fio__in=fios_permitidos)

        # Filtros
        fio_id = self.request.query_params.get('fio')
        if fio_id:
            qs = qs.filter(fio_id=fio_id)

        maquina_id = self.request.query_params.get('maquina')
        if maquina_id:
            qs = qs.filter(maquina_id=maquina_id)

        empreendimento_id = self.request.query_params.get('empreendimento')
        if empreendimento_id:
            qs = qs.filter(empreendimento_id=empreendimento_id)

        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        data_inicio = self.request.query_params.get('data_inicio')
        if data_inicio:
            qs = qs.filter(data__gte=data_inicio)

        data_fim = self.request.query_params.get('data_fim')
        if data_fim:
            qs = qs.filter(data__lte=data_fim)

        fonte = self.request.query_params.get('fonte_energia')
        if fonte:
            qs = qs.filter(fonte_energia=fonte)

        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return RegistroCorteCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return RegistroCorteCreateSerializer
        return RegistroCorteListSerializer

    @action(detail=False, methods=['post'])
    def iniciar(self, request):
        """Inicia um novo corte (status EM_ANDAMENTO)"""
        serializer = IniciarCorteSerializer(data=request.data)
        if serializer.is_valid():
            corte = serializer.save()
            return Response(
                RegistroCorteListSerializer(corte).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def finalizar(self, request, pk=None):
        """Finaliza um corte em andamento"""
        corte = self.get_object()
        serializer = FinalizarCorteSerializer(
            data=request.data,
            context={'corte': corte}
        )
        if serializer.is_valid():
            corte = serializer.update(corte, serializer.validated_data)
            return Response(RegistroCorteListSerializer(corte).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        """Cancela um corte em andamento"""
        corte = self.get_object()
        if corte.status != 'EM_ANDAMENTO':
            return Response(
                {'error': 'Apenas cortes em andamento podem ser cancelados'},
                status=status.HTTP_400_BAD_REQUEST
            )
        corte.status = 'CANCELADO'
        corte.observacoes = f"{corte.observacoes}\n[CANCELADO] {request.data.get('motivo', '')}".strip()
        corte.save()
        return Response(RegistroCorteListSerializer(corte).data)

    @action(detail=False, methods=['get'])
    def em_andamento(self, request):
        """Lista todos os cortes em andamento"""
        qs = self.get_queryset().filter(status='EM_ANDAMENTO')
        serializer = CorteEmAndamentoSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def metricas(self, request):
        """Retorna metricas agregadas dos cortes"""
        qs = self.get_queryset().filter(status='FINALIZADO')

        # Filtros de data
        data_inicio = request.query_params.get('data_inicio')
        data_fim = request.query_params.get('data_fim')

        if data_inicio:
            qs = qs.filter(data__gte=data_inicio)
        if data_fim:
            qs = qs.filter(data__lte=data_fim)

        agregados = qs.aggregate(
            total_cortes=Count('id'),
            area_total=Coalesce(Sum('area_corte_m2'), Decimal('0')),
            tempo_total=Coalesce(Sum('tempo_execucao_horas'), Decimal('0')),
            velocidade_media=Avg('velocidade_corte_m2h'),
            desgaste_total=Coalesce(Sum('desgaste_mm'), Decimal('0')),
            consumo_combustivel=Coalesce(Sum('consumo_combustivel_litros'), Decimal('0')),
        )

        # Por fonte de energia
        por_fonte = qs.values('fonte_energia').annotate(
            cortes=Count('id'),
            area=Coalesce(Sum('area_corte_m2'), Decimal('0')),
            tempo=Coalesce(Sum('tempo_execucao_horas'), Decimal('0')),
        )

        # Por fio
        por_fio = qs.values('fio__codigo', 'fio_id').annotate(
            cortes=Count('id'),
            area=Coalesce(Sum('area_corte_m2'), Decimal('0')),
            desgaste=Coalesce(Sum('desgaste_mm'), Decimal('0')),
        ).order_by('-area')[:10]

        return Response({
            'totais': {
                'total_cortes': agregados['total_cortes'],
                'area_total_m2': float(agregados['area_total']),
                'tempo_total_horas': float(agregados['tempo_total']),
                'velocidade_media_m2h': float(agregados['velocidade_media'] or 0),
                'desgaste_total_mm': float(agregados['desgaste_total']),
                'consumo_combustivel_litros': float(agregados['consumo_combustivel']),
                'custo_combustivel': float(agregados['consumo_combustivel'] * Decimal('6.50')),
            },
            'por_fonte_energia': list(por_fonte),
            'por_fio': list(por_fio),
        })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_fio_diamantado(request):
    """
    Dashboard geral do modulo de Fio Diamantado
    """
    # Filtrar fios pelo role
    fios = filter_by_role(FioDiamantado.objects.filter(status='ATIVO'), request.user)

    # Totais
    totais = {
        'fios_ativos': fios.count(),
        'fios_criticos': 0,
        'fios_urgentes': 0,
        'area_total_cortada': Decimal('0'),
    }

    alertas = []
    fios_para_grafico = []

    for fio in fios:
        area_total = fio.area_total_cortada_m2
        totais['area_total_cortada'] += area_total

        fios_para_grafico.append({
            'id': fio.id,
            'codigo': fio.codigo,
            'fabricante': fio.fabricante,
            'diametro_atual': float(fio.diametro_atual_mm),
            'percentual_vida_util': fio.percentual_vida_util,
            'area_total_m2': float(area_total),
            'localizacao': fio.localizacao,
            'localizacao_display': fio.get_localizacao_display(),
            'empreendimento_nome': fio.empreendimento.nome if fio.empreendimento else None,
            'valor_total': float(fio.valor_total) if fio.valor_total else None,
            'custo_por_m2': float(fio.custo_por_m2) if fio.custo_por_m2 else None,
        })

        if fio.precisa_substituicao:
            totais['fios_criticos'] += 1
            alertas.append({
                'tipo': 'CRITICO',
                'fio_id': fio.id,
                'fio_codigo': fio.codigo,
                'mensagem': f'Fio atingiu diametro minimo - SUBSTITUIR',
                'diametro_atual': float(fio.diametro_atual_mm),
            })
        elif fio.percentual_vida_util <= 20:
            totais['fios_urgentes'] += 1
            alertas.append({
                'tipo': 'URGENTE',
                'fio_id': fio.id,
                'fio_codigo': fio.codigo,
                'mensagem': f'{fio.percentual_vida_util}% de vida util restante',
                'percentual_restante': fio.percentual_vida_util,
            })

    # Cortes em andamento
    cortes_em_andamento = RegistroCorte.objects.filter(
        fio__in=fios,
        status='EM_ANDAMENTO'
    ).select_related('fio', 'maquina', 'empreendimento')
    cortes_andamento_serializer = CorteEmAndamentoSerializer(cortes_em_andamento, many=True)

    # Cortes recentes (finalizados)
    cortes_recentes = RegistroCorte.objects.filter(
        fio__in=fios,
        status='FINALIZADO'
    ).order_by('-data', '-hora_final')[:10]
    cortes_serializer = RegistroCorteListSerializer(cortes_recentes, many=True)

    # Metricas dos ultimos 30 dias
    from datetime import date, timedelta
    data_inicio = date.today() - timedelta(days=30)

    cortes_periodo = RegistroCorte.objects.filter(
        fio__in=fios,
        status='FINALIZADO',
        data__gte=data_inicio
    )

    metricas_periodo = cortes_periodo.aggregate(
        total_cortes=Count('id'),
        area_total=Coalesce(Sum('area_corte_m2'), Decimal('0')),
        tempo_total=Coalesce(Sum('tempo_execucao_horas'), Decimal('0')),
        consumo_combustivel=Coalesce(Sum('consumo_combustivel_litros'), Decimal('0')),
    )

    # Calcular custo total do fio considerando valores e desgaste
    valor_total_fios = sum(
        float(fio.valor_total) for fio in fios if fio.valor_total
    )

    return Response({
        'totais': {
            'fios_ativos': totais['fios_ativos'],
            'fios_criticos': totais['fios_criticos'],
            'fios_urgentes': totais['fios_urgentes'],
            'area_total_cortada_m2': float(totais['area_total_cortada']),
            'valor_total_fios': valor_total_fios,
            'cortes_em_andamento': len(cortes_em_andamento),
        },
        'alertas': alertas,
        'cortes_em_andamento': cortes_andamento_serializer.data,
        'fios': fios_para_grafico,
        'cortes_recentes': cortes_serializer.data,
        'metricas_30_dias': {
            'total_cortes': metricas_periodo['total_cortes'],
            'area_total_m2': float(metricas_periodo['area_total']),
            'tempo_total_horas': float(metricas_periodo['tempo_total']),
            'consumo_combustivel_litros': float(metricas_periodo['consumo_combustivel']),
            'custo_combustivel': float(metricas_periodo['consumo_combustivel'] * Decimal('6.50')),
        },
    })
