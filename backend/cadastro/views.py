# backend/cadastro/views.py
from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.http import Http404
from .models import Cliente, Empreendimento
from .serializers import ClienteSerializer, EmpreendimentoSerializer

# --- Base DRF ---
class BaseAuthViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]


# --- Clientes ---
class ClienteViewSet(BaseAuthViewSet):
    queryset = Cliente.objects.all().order_by("nome_razao")
    serializer_class = ClienteSerializer
    search_fields = ["nome_razao", "documento", "cidade", "email_financeiro"]
    ordering = ["nome_razao"]


# --- Empreendimentos ---
class EmpreendimentoViewSet(BaseAuthViewSet):
    queryset = Empreendimento.objects.select_related("cliente").all().order_by("nome")
    serializer_class = EmpreendimentoSerializer
    search_fields = ["nome", "cliente__nome_razao"]
    ordering = ["nome"]

    def get_queryset(self):
        qs = super().get_queryset()
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
