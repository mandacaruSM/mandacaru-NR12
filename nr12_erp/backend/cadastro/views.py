# backend/cadastro/views.py
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.http import Http404
from django.utils.crypto import get_random_string
from .models import Cliente, Empreendimento
from .serializers import ClienteSerializer, EmpreendimentoSerializer
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
