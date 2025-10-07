# backend/nr12/views.py

from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta

from .models import (
    ModeloChecklist, ItemChecklist,
    ChecklistRealizado, RespostaItemChecklist,
    NotificacaoChecklist
)
from .serializers import (
    ModeloChecklistSerializer, ModeloChecklistDetailSerializer,
    ItemChecklistSerializer, ItemChecklistListSerializer,
    ChecklistRealizadoSerializer, ChecklistRealizadoDetailSerializer,
    ChecklistRealizadoCreateSerializer,
    RespostaItemChecklistSerializer,
    NotificacaoChecklistSerializer,
    # Bot serializers
    BotModeloChecklistSerializer, BotItemChecklistSerializer,
    BotChecklistIniciarSerializer, BotRespostaSerializer,
    BotChecklistFinalizarSerializer
)


class BaseAuthViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]


# ============================================
# VIEWSETS PARA INTERFACE WEB
# ============================================

class ModeloChecklistViewSet(BaseAuthViewSet):
    queryset = ModeloChecklist.objects.select_related('tipo_equipamento').all()
    serializer_class = ModeloChecklistSerializer
    search_fields = ['nome', 'descricao', 'tipo_equipamento__nome']
    ordering = ['tipo_equipamento__nome', 'nome']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ModeloChecklistDetailSerializer
        return ModeloChecklistSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        
        # Filtro por tipo de equipamento
        tipo_eq = self.request.query_params.get('tipo_equipamento')
        if tipo_eq:
            qs = qs.filter(tipo_equipamento_id=tipo_eq)
        
        # Filtro por status
        ativo = self.request.query_params.get('ativo')
        if ativo is not None:
            qs = qs.filter(ativo=ativo.lower() == 'true')
        
        return qs

    @action(detail=True, methods=['post'])
    def duplicar(self, request, pk=None):
        """Duplica um modelo de checklist"""
        modelo_original = self.get_object()
        
        # Criar cópia do modelo
        modelo_novo = ModeloChecklist.objects.create(
            tipo_equipamento=modelo_original.tipo_equipamento,
            nome=f"{modelo_original.nome} (Cópia)",
            descricao=modelo_original.descricao,
            periodicidade=modelo_original.periodicidade,
            ativo=False  # Criar inativo para revisão
        )
        
        # Copiar itens
        for item in modelo_original.itens.all():
            ItemChecklist.objects.create(
                modelo=modelo_novo,
                ordem=item.ordem,
                categoria=item.categoria,
                pergunta=item.pergunta,
                descricao_ajuda=item.descricao_ajuda,
                tipo_resposta=item.tipo_resposta,
                obrigatorio=item.obrigatorio,
                requer_observacao_nao_conforme=item.requer_observacao_nao_conforme,
                ativo=item.ativo
            )
        
        serializer = self.get_serializer(modelo_novo)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ItemChecklistViewSet(BaseAuthViewSet):
    queryset = ItemChecklist.objects.select_related('modelo').all()
    serializer_class = ItemChecklistSerializer
    search_fields = ['pergunta', 'descricao_ajuda']
    ordering = ['modelo', 'ordem']

    def get_queryset(self):
        """Filtra itens por modelo quando acessado via rota aninhada"""
        qs = super().get_queryset()
        
        # Suporte para rota aninhada: /modelos/{modelo_pk}/itens/
        modelo_pk = self.kwargs.get('modelo_pk')
        if modelo_pk:
            qs = qs.filter(modelo_id=modelo_pk)
        
        # Filtro por modelo via query param (compatibilidade)
        modelo_id = self.request.query_params.get('modelo')
        if modelo_id:
            qs = qs.filter(modelo_id=modelo_id)
        
        # Filtro por categoria
        categoria = self.request.query_params.get('categoria')
        if categoria:
            qs = qs.filter(categoria=categoria)
        
        return qs

    def perform_create(self, serializer):
        """Define o modelo automaticamente quando criado via rota aninhada"""
        modelo_pk = self.kwargs.get('modelo_pk')
        if modelo_pk:
            serializer.save(modelo_id=modelo_pk)
        else:
            serializer.save()

    @action(detail=False, methods=['post'])
    def reordenar(self, request):
        """Reordena itens de um modelo"""
        itens_ordem = request.data.get('itens', [])
        
        for item_data in itens_ordem:
            item_id = item_data.get('id')
            nova_ordem = item_data.get('ordem')
            
            if item_id and nova_ordem is not None:
                try:
                    item = ItemChecklist.objects.get(id=item_id)
                    item.ordem = nova_ordem
                    item.save(update_fields=['ordem'])
                except ItemChecklist.DoesNotExist:
                    pass
        
        return Response({'detail': 'Itens reordenados com sucesso'})


class ChecklistRealizadoViewSet(BaseAuthViewSet):
    queryset = ChecklistRealizado.objects.select_related(
        'modelo', 'equipamento', 'operador', 'usuario'
    ).prefetch_related('respostas').all()
    serializer_class = ChecklistRealizadoSerializer
    search_fields = ['equipamento__codigo', 'modelo__nome', 'operador__nome_completo']
    ordering = ['-data_hora_inicio']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ChecklistRealizadoDetailSerializer
        if self.action == 'create':
            return ChecklistRealizadoCreateSerializer
        return ChecklistRealizadoSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        
        # Filtros
        equipamento = self.request.query_params.get('equipamento')
        if equipamento:
            qs = qs.filter(equipamento_id=equipamento)
        
        modelo = self.request.query_params.get('modelo')
        if modelo:
            qs = qs.filter(modelo_id=modelo)
        
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        
        resultado = self.request.query_params.get('resultado')
        if resultado:
            qs = qs.filter(resultado_geral=resultado)
        
        # Filtro por data
        data_inicio = self.request.query_params.get('data_inicio')
        data_fim = self.request.query_params.get('data_fim')
        if data_inicio:
            qs = qs.filter(data_hora_inicio__gte=data_inicio)
        if data_fim:
            qs = qs.filter(data_hora_inicio__lte=data_fim)
        
        return qs

    @action(detail=True, methods=['post'])
    def finalizar(self, request, pk=None):
        """Finaliza um checklist manualmente"""
        checklist = self.get_object()
        
        if checklist.status != 'EM_ANDAMENTO':
            return Response(
                {'detail': 'Checklist já foi finalizado ou cancelado'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        checklist.observacoes_gerais = request.data.get('observacoes_gerais', '')
        checklist.finalizar()
        
        serializer = self.get_serializer(checklist)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        """Cancela um checklist"""
        checklist = self.get_object()
        
        if checklist.status != 'EM_ANDAMENTO':
            return Response(
                {'detail': 'Apenas checklists em andamento podem ser cancelados'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        checklist.status = 'CANCELADO'
        checklist.observacoes_gerais = request.data.get('motivo_cancelamento', '')
        checklist.save()
        
        serializer = self.get_serializer(checklist)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def estatisticas(self, request):
        """Retorna estatísticas gerais de checklists"""
        # Período (últimos 30 dias por padrão)
        data_inicio = request.query_params.get('data_inicio')
        data_fim = request.query_params.get('data_fim')
        
        if not data_inicio:
            data_inicio = timezone.now() - timedelta(days=30)
        if not data_fim:
            data_fim = timezone.now()
        
        qs = self.get_queryset().filter(
            data_hora_inicio__gte=data_inicio,
            data_hora_inicio__lte=data_fim
        )
        
        stats = {
            'total': qs.count(),
            'concluidos': qs.filter(status='CONCLUIDO').count(),
            'em_andamento': qs.filter(status='EM_ANDAMENTO').count(),
            'cancelados': qs.filter(status='CANCELADO').count(),
            'aprovados': qs.filter(resultado_geral='APROVADO').count(),
            'aprovados_restricao': qs.filter(resultado_geral='APROVADO_RESTRICAO').count(),
            'reprovados': qs.filter(resultado_geral='REPROVADO').count(),
            'por_equipamento': list(
                qs.values('equipamento__codigo', 'equipamento__descricao')
                .annotate(total=Count('id'))
                .order_by('-total')[:10]
            ),
            'por_modelo': list(
                qs.values('modelo__nome')
                .annotate(total=Count('id'))
                .order_by('-total')[:10]
            )
        }
        
        return Response(stats)


class RespostaItemChecklistViewSet(BaseAuthViewSet):
    queryset = RespostaItemChecklist.objects.select_related(
        'checklist', 'item'
    ).all()
    serializer_class = RespostaItemChecklistSerializer
    search_fields = ['item__pergunta', 'observacao']
    ordering = ['-data_hora_resposta']

    def get_queryset(self):
        qs = super().get_queryset()
        
        # Filtro por checklist
        checklist_id = self.request.query_params.get('checklist')
        if checklist_id:
            qs = qs.filter(checklist_id=checklist_id)
        
        # Filtro por não conformidades
        nao_conforme = self.request.query_params.get('nao_conforme')
        if nao_conforme == 'true':
            qs = qs.filter(resposta__in=['NAO_CONFORME', 'NAO'])
        
        return qs


class NotificacaoChecklistViewSet(BaseAuthViewSet):
    queryset = NotificacaoChecklist.objects.select_related(
        'checklist', 'destinatario'
    ).all()
    serializer_class = NotificacaoChecklistSerializer
    ordering = ['-criado_em']

    def get_queryset(self):
        # Usuário vê apenas suas notificações
        return super().get_queryset().filter(destinatario=self.request.user)

    @action(detail=True, methods=['post'])
    def marcar_lida(self, request, pk=None):
        """Marca notificação como lida"""
        notificacao = self.get_object()
        notificacao.lida = True
        notificacao.save()
        
        serializer = self.get_serializer(notificacao)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def marcar_todas_lidas(self, request):
        """Marca todas as notificações como lidas"""
        count = self.get_queryset().filter(lida=False).update(lida=True)
        return Response({'detail': f'{count} notificações marcadas como lidas'})


# ============================================
# VIEWSETS PARA BOT TELEGRAM
# ============================================

class BotChecklistViewSet(viewsets.ViewSet):
    """
    Endpoints especializados para o Bot Telegram
    Permissão: AllowAny (protegido por token específico do bot)
    """
    permission_classes = [AllowAny]  # TODO: Implementar autenticação do bot

    def list_modelos(self, request):
        """Lista modelos de checklist disponíveis"""
        tipo_eq = request.query_params.get('tipo_equipamento')
        
        qs = ModeloChecklist.objects.filter(ativo=True)
        if tipo_eq:
            qs = qs.filter(tipo_equipamento_id=tipo_eq)
        
        serializer = BotModeloChecklistSerializer(qs, many=True)
        return Response(serializer.data)

    def list_itens(self, request, modelo_id):
        """Lista itens de um modelo de checklist"""
        try:
            modelo = ModeloChecklist.objects.get(id=modelo_id, ativo=True)
        except ModeloChecklist.DoesNotExist:
            return Response(
                {'detail': 'Modelo não encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        itens = modelo.itens.filter(ativo=True).order_by('ordem')
        serializer = BotItemChecklistSerializer(itens, many=True)
        return Response(serializer.data)

    def iniciar_checklist(self, request):
        """Inicia um novo checklist (chamado pelo bot)"""
        serializer = BotChecklistIniciarSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        from equipamentos.models import Equipamento
        from core.models import Operador
        
        checklist = ChecklistRealizado.objects.create(
            modelo_id=serializer.validated_data['modelo_id'],
            equipamento_id=serializer.validated_data['equipamento_id'],
            operador_id=serializer.validated_data['operador_id'],
            origem='BOT',
            leitura_equipamento=serializer.validated_data.get('leitura_equipamento'),
            status='EM_ANDAMENTO'
        )
        
        return Response({
            'checklist_id': checklist.id,
            'total_itens': checklist.modelo.itens.filter(ativo=True).count()
        }, status=status.HTTP_201_CREATED)

    def registrar_resposta(self, request):
        """Registra resposta de um item (chamado pelo bot)"""
        serializer = BotRespostaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        resposta = RespostaItemChecklist.objects.create(
            checklist_id=serializer.validated_data['checklist_id'],
            item_id=serializer.validated_data['item_id'],
            resposta=serializer.validated_data.get('resposta'),
            valor_numerico=serializer.validated_data.get('valor_numerico'),
            valor_texto=serializer.validated_data.get('valor_texto'),
            observacao=serializer.validated_data.get('observacao', '')
        )
        
        # Verificar progresso
        checklist = resposta.checklist
        total_itens = checklist.modelo.itens.filter(ativo=True, obrigatorio=True).count()
        total_respondido = checklist.respostas.count()
        
        return Response({
            'resposta_id': resposta.id,
            'progresso': {
                'respondido': total_respondido,
                'total': total_itens,
                'percentual': round((total_respondido / total_itens) * 100) if total_itens > 0 else 0
            }
        }, status=status.HTTP_201_CREATED)

    def finalizar_checklist(self, request):
        """Finaliza checklist (chamado pelo bot)"""
        serializer = BotChecklistFinalizarSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        checklist = ChecklistRealizado.objects.get(id=serializer.validated_data['checklist_id'])
        checklist.observacoes_gerais = serializer.validated_data.get('observacoes_gerais', '')
        checklist.finalizar()
        
        return Response({
            'checklist_id': checklist.id,
            'resultado_geral': checklist.resultado_geral,
            'total_nao_conformidades': checklist.respostas.filter(
                resposta__in=['NAO_CONFORME', 'NAO']
            ).count()
        })