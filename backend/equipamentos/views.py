from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework import filters
from .models import TipoEquipamento, Equipamento, PlanoManutencaoItem, MedicaoEquipamento
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

class EquipamentoViewSet(BaseAuthViewSet):
    queryset = Equipamento.objects.select_related("cliente","empreendimento","tipo").all().order_by("codigo")
    serializer_class = EquipamentoSerializer
    search_fields = ["codigo","descricao","fabricante","modelo","numero_serie","cliente__nome_razao","empreendimento__nome","tipo__nome"]
    ordering = ["codigo"]

    def get_queryset(self):
        qs = super().get_queryset()
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
