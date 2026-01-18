# backend/cadastro/views.py
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.http import Http404
from django.utils.crypto import get_random_string
from .models import Cliente, Empreendimento
from .planos import Plano, AssinaturaCliente
from .serializers import (
    ClienteSerializer, EmpreendimentoSerializer,
    PlanoSerializer, AssinaturaClienteSerializer
)
from core.permissions import ClienteFilterMixin, HasModuleAccess, IsAdminUser

# --- Base DRF ---
class BaseAuthViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]


# --- Clientes ---
class ClienteViewSet(ClienteFilterMixin, BaseAuthViewSet):
    """
    ViewSet para Clientes com filtro automático:
    - ADMIN: Vê todos os clientes
    - SUPERVISOR: Vê clientes dos empreendimentos que supervisiona
    - CLIENTE: Vê apenas seu próprio cadastro
    """
    queryset = Cliente.objects.all().order_by("nome_razao")
    serializer_class = ClienteSerializer
    search_fields = ["nome_razao", "documento", "cidade", "email_financeiro"]
    ordering = ["nome_razao"]
    permission_classes = [IsAuthenticated, HasModuleAccess]
    required_module = 'clientes'

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdminUser])
    def resetar_senha(self, request, pk=None):
        """
        Reseta a senha do cliente para uma senha aleatória ou fornecida.
        Apenas administradores podem usar esta action.

        POST /api/v1/cadastro/clientes/{id}/resetar_senha/
        Body (opcional): { "senha": "novasenha123" }

        Se não fornecer senha, uma aleatória será gerada.
        """
        cliente = self.get_object()

        # Verifica se o cliente tem usuário vinculado
        if not hasattr(cliente, 'user') or not cliente.user:
            return Response(
                {"detail": "Este cliente não possui usuário vinculado no sistema."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Obtém senha do body ou gera uma aleatória
        senha = request.data.get('senha')
        if not senha:
            senha = get_random_string(8)
            senha_gerada = True
        else:
            senha_gerada = False
            # Valida tamanho mínimo
            if len(senha) < 6:
                return Response(
                    {"detail": "A senha deve ter pelo menos 6 caracteres."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Atualiza a senha
        cliente.user.set_password(senha)
        cliente.user.save()

        # Log da operação
        print(f"[SENHA RESETADA] Cliente: {cliente.nome_razao} | Username: {cliente.user.username} | Admin: {request.user.username}")

        return Response({
            "detail": "Senha resetada com sucesso.",
            "username": cliente.user.username,
            "senha": senha if senha_gerada else "***",  # Só mostra se foi gerada automaticamente
            "senha_gerada_automaticamente": senha_gerada
        }, status=status.HTTP_200_OK)


# --- Empreendimentos ---
class EmpreendimentoViewSet(ClienteFilterMixin, BaseAuthViewSet):
    """
    ViewSet para Empreendimentos com filtro automático:
    - ADMIN: Vê todos os empreendimentos
    - SUPERVISOR: Vê empreendimentos que supervisiona
    - CLIENTE: Vê apenas seus empreendimentos
    """
    queryset = Empreendimento.objects.select_related("cliente").all().order_by("nome")
    serializer_class = EmpreendimentoSerializer
    search_fields = ["nome", "cliente__nome_razao"]
    ordering = ["nome"]
    permission_classes = [IsAuthenticated, HasModuleAccess]
    required_module = 'empreendimentos'

    def get_queryset(self):
        qs = super().get_queryset()
        # Filtro manual adicional (se fornecido via query params)
        cliente_id = self.request.query_params.get("cliente")
        if cliente_id:
            qs = qs.filter(cliente_id=cliente_id)
        return qs


# --- QR Code do Cliente (função de módulo, fora de classes) ---
from core.qr_utils import qr_png_response  # importa aqui para evitar ciclos

def cliente_qr_view(request, uuid_str: str):
    """
    Retorna um PNG de QR Code com o payload 'cl:{uuid}' do cliente.
    """
    try:
        cli = get_object_or_404(Cliente, uuid=uuid_str)
    except (ValueError, Http404):
        raise Http404("Cliente não encontrado")

    payload = getattr(cli, "qr_payload", f"cl:{cli.uuid}")
    return qr_png_response(payload)


# --- Planos ---
class PlanoViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet read-only para listar planos disponíveis
    Qualquer usuário autenticado pode visualizar
    """
    queryset = Plano.objects.filter(ativo=True).order_by('ordem', 'valor_mensal')
    serializer_class = PlanoSerializer
    permission_classes = [IsAuthenticated]


# --- Assinaturas ---
class AssinaturaClienteViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar assinaturas de clientes
    ADMIN: Pode ver e modificar todas
    CLIENTE: Pode ver apenas sua própria assinatura
    """
    queryset = AssinaturaCliente.objects.select_related('cliente', 'plano').all()
    serializer_class = AssinaturaClienteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filtra assinaturas baseado no role do usuário"""
        user = self.request.user
        queryset = super().get_queryset()

        # Admin vê todas
        if hasattr(user, 'profile') and user.profile.role == 'ADMIN':
            return queryset

        # Cliente vê apenas sua própria assinatura
        if hasattr(user, 'cliente_profile'):
            return queryset.filter(cliente=user.cliente_profile)

        # Outros não veem nada
        return queryset.none()

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdminUser])
    def alterar_plano(self, request, pk=None):
        """
        Permite ao admin alterar o plano de uma assinatura

        POST /api/v1/cadastro/assinaturas/{id}/alterar_plano/
        Body: { "plano_id": 2 }
        """
        assinatura = self.get_object()
        plano_id = request.data.get('plano_id')

        if not plano_id:
            return Response(
                {"detail": "plano_id é obrigatório"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            novo_plano = Plano.objects.get(id=plano_id, ativo=True)
        except Plano.DoesNotExist:
            return Response(
                {"detail": "Plano não encontrado ou inativo"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Atualiza plano e módulos do usuário
        assinatura.plano = novo_plano
        assinatura.save()

        # Atualiza módulos habilitados no perfil do usuário
        if assinatura.cliente.user:
            profile = assinatura.cliente.user.profile
            profile.modules_enabled = novo_plano.modulos_habilitados
            profile.save()

        return Response({
            "detail": "Plano alterado com sucesso",
            "assinatura": AssinaturaClienteSerializer(assinatura).data
        })

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdminUser])
    def suspender(self, request, pk=None):
        """Suspende uma assinatura"""
        assinatura = self.get_object()
        assinatura.status = 'SUSPENSA'
        assinatura.save()

        return Response({
            "detail": "Assinatura suspensa",
            "assinatura": AssinaturaClienteSerializer(assinatura).data
        })

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdminUser])
    def reativar(self, request, pk=None):
        """Reativa uma assinatura suspensa"""
        assinatura = self.get_object()
        assinatura.status = 'ATIVA'
        assinatura.save()

        return Response({
            "detail": "Assinatura reativada",
            "assinatura": AssinaturaClienteSerializer(assinatura).data
        })

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdminUser])
    def cancelar(self, request, pk=None):
        """Cancela uma assinatura"""
        from datetime import date

        assinatura = self.get_object()
        assinatura.status = 'CANCELADA'
        assinatura.data_cancelamento = date.today()
        assinatura.save()

        return Response({
            "detail": "Assinatura cancelada",
            "assinatura": AssinaturaClienteSerializer(assinatura).data
        })
