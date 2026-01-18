from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework import filters
from .models import TipoEquipamento, Equipamento, PlanoManutencaoItem, MedicaoEquipamento
from django.shortcuts import get_object_or_404
from django.http import Http404
from .models import Equipamento
from core.qr_utils import qr_png_response
from core.permissions import ClienteFilterMixin, HasModuleAccess
from .serializers import (
    TipoEquipamentoSerializer, EquipamentoSerializer,
    PlanoManutencaoItemSerializer, MedicaoEquipamentoSerializer
)

class BaseAuthViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]

class TipoEquipamentoViewSet(BaseAuthViewSet):
    queryset = TipoEquipamento.objects.filter(ativo=True).order_by("nome")
    serializer_class = TipoEquipamentoSerializer
    search_fields = ["nome"]
    ordering = ["nome"]
    permission_classes = [IsAuthenticated, HasModuleAccess]
    required_module = 'tipos_equipamento'

class EquipamentoViewSet(ClienteFilterMixin, BaseAuthViewSet):
    """
    ViewSet para Equipamentos com filtro automático:
    - ADMIN: Vê todos os equipamentos
    - SUPERVISOR: Vê equipamentos dos empreendimentos que supervisiona
    - CLIENTE: Vê apenas seus equipamentos
    """
    queryset = Equipamento.objects.select_related("cliente","empreendimento","tipo").all().order_by("codigo")
    serializer_class = EquipamentoSerializer
    search_fields = ["codigo","descricao","fabricante","modelo","numero_serie","cliente__nome_razao","empreendimento__nome","tipo__nome"]
    ordering = ["codigo"]
    permission_classes = [IsAuthenticated, HasModuleAccess]
    required_module = 'equipamentos'

    def get_queryset(self):
        qs = super().get_queryset()
        # Filtros manuais adicionais (se fornecidos via query params)
        cliente_id = self.request.query_params.get("cliente")
        emp_id = self.request.query_params.get("empreendimento")
        if cliente_id:
            qs = qs.filter(cliente_id=cliente_id)
        if emp_id:
            qs = qs.filter(empreendimento_id=emp_id)
        return qs

class PlanoManutencaoItemViewSet(BaseAuthViewSet):
    queryset = PlanoManutencaoItem.objects.select_related("equipamento").all().order_by("titulo")
    serializer_class = PlanoManutencaoItemSerializer
    search_fields = ["titulo","equipamento__codigo"]
    ordering = ["titulo"]

    def get_queryset(self):
        qs = super().get_queryset()
        eq_id = self.request.query_params.get("equipamento")
        if eq_id:
            qs = qs.filter(equipamento_id=eq_id)
        return qs

class MedicaoEquipamentoViewSet(BaseAuthViewSet):
    queryset = MedicaoEquipamento.objects.select_related("equipamento").all().order_by("-criado_em")
    serializer_class = MedicaoEquipamentoSerializer
    search_fields = ["equipamento__codigo","origem"]
    ordering = ["-criado_em"]

    def get_queryset(self):
        qs = super().get_queryset()
        eq_id = self.request.query_params.get("equipamento")
        if eq_id:
            qs = qs.filter(equipamento_id=eq_id)
        return qs[:200]  # proteção simples


def equipamento_qr_view(request, uuid_str: str):
    try:
        equip = get_object_or_404(Equipamento, uuid=uuid_str)
    except (ValueError, Http404):
        raise Http404("Equipamento não encontrado")

    payload = equip.qr_payload
    # Ex.: payload "eq:1b9e3e1f-..." → no QR você terá "eq:{uuid}".
    # Para deep-link do Telegram, use t.me/<seu_bot>?start=eq:{uuid}
    return qr_png_response(payload)

