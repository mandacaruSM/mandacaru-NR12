# backend/core/views.py
from rest_framework import viewsets, filters, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend

from .models import Operador, Supervisor, OperadorEquipamento
from .serializers import (
    OperadorSerializer, OperadorDetailSerializer,
    SupervisorSerializer,
)

# ============================================
# VIEWS EXISTENTES (Health e Me)
# ============================================

class HealthView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        return Response({"status": "ok"})


class MeView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        from .models import Profile
        user = request.user
        profile = getattr(user, 'profile', None) or Profile.objects.create(user=user)
        data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'profile': {
                'role': profile.role,
                'modules_enabled': profile.modules_enabled
            }
        }
        return Response(data)

# ============================================
# VIEWSETS WEB (CRUD Normal)
# ============================================

class OperadorViewSet(viewsets.ModelViewSet):
    """
    Gerencia operadores via API web.
    Permissões: ADMIN (full), SUPERVISOR (read)
    """
    from .permissions import CanManageOperadores, HasModuleAccess
    permission_classes = [IsAuthenticated, HasModuleAccess, CanManageOperadores]
    required_module = 'operadores'
    serializer_class = OperadorSerializer
    queryset = Operador.objects.all().prefetch_related('clientes', 'equipamentos_autorizados')
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["nome_completo", "cpf", "telefone", "email", "telegram_username"]
    ordering_fields = ["nome_completo", "cpf", "id"]
    ordering = ["nome_completo"]
    filterset_fields = {"ativo": ["exact"]}

    def get_serializer_class(self):
        return OperadorDetailSerializer if self.action == 'retrieve' else OperadorSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        # filtro por cliente
        cliente_id = self.request.query_params.get("cliente")
        if cliente_id:
            qs = qs.filter(clientes__id=cliente_id)
        # filtro por ativo
        ativo = self.request.query_params.get('ativo')
        if ativo is not None:
            qs = qs.filter(ativo=ativo.lower() == 'true')
        # filtro por vinculação telegram
        telegram_vinculado = self.request.query_params.get('telegram_vinculado')
        if telegram_vinculado is not None:
            if telegram_vinculado.lower() == 'true':
                qs = qs.exclude(telegram_chat_id__isnull=True)
            else:
                qs = qs.filter(telegram_chat_id__isnull=True)
        return qs.distinct()

    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user)

    @action(detail=True, methods=['post'])
    def gerar_codigo_vinculacao(self, request, pk=None):
        operador = self.get_object()
        if operador.telegram_vinculado:
            return Response({'detail': 'Operador já tem Telegram vinculado. Desvincule primeiro.'},
                            status=status.HTTP_400_BAD_REQUEST)
        codigo = operador.gerar_codigo_vinculacao()
        return Response({
            'codigo': codigo,
            'valido_ate': operador.codigo_valido_ate.isoformat(),
            'instrucoes': f'Operador deve enviar o código {codigo} no bot do Telegram'
        })

    @action(detail=True, methods=['post'])
    def desvincular_telegram(self, request, pk=None):
        operador = self.get_object()
        if not operador.telegram_vinculado:
            return Response({'detail': 'Operador não tem Telegram vinculado'},
                            status=status.HTTP_400_BAD_REQUEST)
        operador.desvincular_telegram()
        return Response({'detail': 'Telegram desvinculado com sucesso'})

    @action(detail=True, methods=['get'])
    def equipamentos(self, request, pk=None):
        operador = self.get_object()
        equipamentos = operador.equipamentos_autorizados.filter(ativo=True)
        from equipamentos.serializers import EquipamentoSerializer
        return Response(EquipamentoSerializer(equipamentos, many=True).data)

    @action(detail=True, methods=['post'])
    def vincular_equipamento(self, request, pk=None):
        operador = self.get_object()
        equipamento_id = request.data.get('equipamento_id')
        if not equipamento_id:
            return Response({'detail': 'equipamento_id é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            from equipamentos.models import Equipamento
            equipamento = Equipamento.objects.get(id=equipamento_id)
        except Exception:
            return Response({'detail': 'Equipamento não encontrado'}, status=status.HTTP_404_NOT_FOUND)

        vinculo, created = OperadorEquipamento.objects.get_or_create(
            operador=operador,
            equipamento=equipamento,
            defaults={
                'autorizado_por': request.user,
                'observacoes': request.data.get('observacoes', ''),
                'data_validade': request.data.get('data_validade')
            }
        )
        if created:
            return Response({'detail': 'Equipamento autorizado com sucesso', 'autorizacao_id': vinculo.id})
        return Response({'detail': 'Operador já autorizado neste equipamento'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def desvincular_equipamento(self, request, pk=None):
        operador = self.get_object()
        equipamento_id = request.data.get('equipamento_id')
        try:
            vinculo = OperadorEquipamento.objects.get(operador=operador, equipamento_id=equipamento_id)
            vinculo.delete()
            return Response({'detail': 'Autorização removida com sucesso'})
        except OperadorEquipamento.DoesNotExist:
            return Response({'detail': 'Vínculo não encontrado'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['get'])
    def estatisticas(self, request, pk=None):
        operador = self.get_object()
        return Response({
            'total_checklists': operador.total_checklists,
            'taxa_aprovacao': operador.taxa_aprovacao,
            'checklists_aprovados': operador.checklists.filter(resultado_geral='APROVADO').count(),
            'checklists_reprovados': operador.checklists.filter(resultado_geral='REPROVADO').count(),
            'equipamentos_autorizados': operador.equipamentos_autorizados.count(),
            'clientes_vinculados': operador.clientes.count(),
            'telegram_vinculado': operador.telegram_vinculado,
        })


class SupervisorViewSet(viewsets.ModelViewSet):
    """
    Gerencia supervisores via API web.
    Permissões: Apenas ADMIN pode gerenciar supervisores
    """
    from .permissions import IsAdminUser, HasModuleAccess
    queryset = Supervisor.objects.all()
    serializer_class = SupervisorSerializer
    permission_classes = [IsAuthenticated, HasModuleAccess, IsAdminUser]
    required_module = 'supervisores'
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["nome_completo", "cpf", "telefone"]
    ordering_fields = ["nome_completo", "cpf", "id"]
    ordering = ["nome_completo"]

    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user)

# ============================================
# ENDPOINTS ESPECÍFICOS PARA BOT TELEGRAM
# ============================================

@api_view(['POST'])
@permission_classes([AllowAny])
def bot_vincular_codigo(request):
    codigo = request.data.get('codigo')
    chat_id = request.data.get('chat_id')
    username = request.data.get('username', '')
    if not codigo or not chat_id:
        return Response({'detail': 'codigo e chat_id são obrigatórios'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        operador = Operador.objects.get(codigo_vinculacao=codigo, codigo_valido_ate__gte=timezone.now())
    except Operador.DoesNotExist:
        return Response({'detail': 'Código inválido ou expirado'}, status=status.HTTP_404_NOT_FOUND)
    if Operador.objects.filter(telegram_chat_id=str(chat_id)).exclude(id=operador.id).exists():
        return Response({'detail': 'Este Telegram já está vinculado a outro operador'}, status=status.HTTP_400_BAD_REQUEST)
    operador.vincular_telegram(chat_id=chat_id, username=username)
    return Response({'detail': 'Telegram vinculado com sucesso',
                     'operador': {'id': operador.id, 'nome': operador.nome_completo, 'cpf': operador.cpf}})

@api_view(['POST'])
@permission_classes([AllowAny])
def bot_vincular_supervisor(request):
    codigo = request.data.get('codigo')
    chat_id = request.data.get('chat_id')
    username = request.data.get('username', '')
    if not codigo or not chat_id:
        return Response({'detail': 'codigo e chat_id são obrigatórios'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        supervisor = Supervisor.objects.get(codigo_vinculacao=codigo, codigo_valido_ate__gte=timezone.now())
    except Supervisor.DoesNotExist:
        return Response({'detail': 'Código inválido ou expirado'}, status=status.HTTP_404_NOT_FOUND)
    if Supervisor.objects.filter(telegram_chat_id=str(chat_id)).exclude(id=supervisor.id).exists():
        return Response({'detail': 'Este Telegram já está vinculado a outro supervisor'}, status=status.HTTP_400_BAD_REQUEST)
    supervisor.vincular_telegram(chat_id=chat_id, username=username)
    return Response({'detail': 'Telegram vinculado com sucesso',
                     'supervisor': {'id': supervisor.id, 'nome': supervisor.nome_completo, 'cpf': supervisor.cpf}})

@api_view(['POST'])
@permission_classes([AllowAny])
def bot_validar_operador(request):
    chat_id = request.data.get('chat_id')
    if not chat_id:
        return Response({'detail': 'chat_id é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        operador = Operador.objects.get(telegram_chat_id=str(chat_id), ativo=True)
    except Operador.DoesNotExist:
        return Response({'detail': 'Operador não encontrado ou inativo'}, status=status.HTTP_404_NOT_FOUND)
    return Response({
        'id': operador.id, 'nome': operador.nome_completo, 'cpf': operador.cpf,
        'email': operador.email, 'telefone': operador.telefone, 'ativo': operador.ativo,
        'total_checklists': operador.total_checklists, 'taxa_aprovacao': operador.taxa_aprovacao
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def bot_equipamentos_operador(request):
    chat_id = request.query_params.get('chat_id')
    if not chat_id:
        return Response({'detail': 'chat_id é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        operador = Operador.objects.get(telegram_chat_id=str(chat_id), ativo=True)
    except Operador.DoesNotExist:
        return Response({'detail': 'Operador não encontrado'}, status=status.HTTP_404_NOT_FOUND)
    equipamentos = operador.equipamentos_autorizados.filter(ativo=True)
    data = [{
        'id': eq.id, 'codigo': eq.codigo, 'descricao': eq.descricao,
        'tipo': (eq.tipo.nome if getattr(eq, 'tipo', None) else ''),
        'cliente': (eq.cliente.nome_razao if getattr(eq, 'cliente', None) else ''),
        'empreendimento': (eq.empreendimento.nome if getattr(eq, 'empreendimento', None) else '')
    } for eq in equipamentos]
    return Response({'total': len(data), 'equipamentos': data})

@api_view(['POST'])
@permission_classes([AllowAny])
def bot_verificar_acesso_equipamento(request):
    chat_id = request.data.get('chat_id')
    equipamento_id = request.data.get('equipamento_id')
    if not chat_id or not equipamento_id:
        return Response({'detail': 'chat_id e equipamento_id são obrigatórios'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        operador = Operador.objects.get(telegram_chat_id=str(chat_id), ativo=True)
    except Operador.DoesNotExist:
        return Response({'tem_acesso': False, 'motivo': 'Operador não encontrado'}, status=status.HTTP_200_OK)
    tem_acesso = operador.tem_acesso_equipamento(equipamento_id)
    return Response({'tem_acesso': tem_acesso, 'operador_id': operador.id, 'operador_nome': operador.nome_completo})
