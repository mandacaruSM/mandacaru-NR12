from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.http import Http404
from .models import Cliente
from core.qr_utils import qr_png_response
from .models import Cliente, Empreendimento
from .serializers import ClienteSerializer, EmpreendimentoSerializer


class BaseAuthViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]


class ClienteViewSet(BaseAuthViewSet):
    queryset = Cliente.objects.all().order_by("nome_razao")
    serializer_class = ClienteSerializer
    search_fields = ["nome_razao", "documento", "cidade", "email_financeiro"]
    ordering = ["nome_razao"]


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

    def cliente_qr_view(request, uuid_str: str):
        try:
            cli = get_object_or_404(Cliente, uuid=uuid_str)
        except (ValueError, Http404):
            raise Http404("Cliente não encontrado")

        payload = cli.qr_payload
        return qr_png_response(payload)