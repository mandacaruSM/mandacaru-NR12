from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework import filters
from .models import TipoEquipamento, Equipamento, PlanoManutencaoItem, MedicaoEquipamento
from django.shortcuts import get_object_or_404
from django.http import Http404
from .models import Equipamento
from core.qr_utils import qr_png_response
from core.permissions import HasModuleAccess, CannotEditMasterData, filter_by_role
from core.plan_validators import PlanLimitValidator
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
    permission_classes = [IsAuthenticated, HasModuleAccess, CannotEditMasterData]
    required_module = 'tipos_equipamento'

class EquipamentoViewSet(BaseAuthViewSet):
    """
    ViewSet para Equipamentos com filtro seguro por role.
    """
    queryset = Equipamento.objects.select_related("cliente","empreendimento","tipo").all().order_by("codigo")
    serializer_class = EquipamentoSerializer
    search_fields = ["codigo","descricao","fabricante","modelo","numero_serie","cliente__nome_razao","empreendimento__nome","tipo__nome","uuid"]
    ordering = ["codigo"]
    permission_classes = [IsAuthenticated, HasModuleAccess, CannotEditMasterData]
    required_module = 'equipamentos'

    def get_queryset(self):
        qs = filter_by_role(super().get_queryset(), self.request.user)
        # Filtro direto por UUID (para busca via QR Code)
        uuid_param = self.request.query_params.get("uuid")
        if uuid_param:
            qs = qs.filter(uuid=uuid_param)
            return qs
        # Filtros manuais adicionais (se fornecidos via query params)
        cliente_id = self.request.query_params.get("cliente")
        emp_id = self.request.query_params.get("empreendimento")
        if cliente_id:
            qs = qs.filter(cliente_id=cliente_id)
        if emp_id:
            qs = qs.filter(empreendimento_id=emp_id)
        return qs

    def perform_create(self, serializer):
        """Valida limite de equipamentos antes de criar"""
        # Obtém cliente do equipamento sendo criado
        cliente = serializer.validated_data.get('cliente')

        if cliente:
            # Valida limite do plano
            PlanLimitValidator.check_equipment_limit(cliente)

        # Se passou na validação, cria o equipamento
        serializer.save()

class PlanoManutencaoItemViewSet(BaseAuthViewSet):
    queryset = PlanoManutencaoItem.objects.select_related("equipamento").all().order_by("titulo")
    serializer_class = PlanoManutencaoItemSerializer
    search_fields = ["titulo","equipamento__codigo"]
    ordering = ["titulo"]

    def get_queryset(self):
        qs = super().get_queryset()
        from core.permissions import get_user_role_safe
        role = get_user_role_safe(self.request.user)
        if role == 'CLIENTE':
            cliente = getattr(self.request.user, 'cliente_profile', None)
            if cliente:
                qs = qs.filter(equipamento__cliente=cliente)
            else:
                return qs.none()
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
        from core.permissions import get_user_role_safe
        role = get_user_role_safe(self.request.user)
        if role == 'CLIENTE':
            cliente = getattr(self.request.user, 'cliente_profile', None)
            if cliente:
                qs = qs.filter(equipamento__cliente=cliente)
            else:
                return qs.none()
        eq_id = self.request.query_params.get("equipamento")
        if eq_id:
            qs = qs.filter(equipamento_id=eq_id)
        return qs[:200]  # proteção simples


def equipamento_qr_view(request, uuid_str: str):
    """
    Gera QR Code do equipamento dinamicamente (nao depende de arquivo salvo).
    Isso resolve o problema de filesystem efemero em Railway/Render/Heroku.
    """
    from django.http import HttpResponse
    from core.qr_utils import generate_qr_code, add_text_to_qr
    import io

    try:
        equip = get_object_or_404(Equipamento, uuid=uuid_str)
    except (ValueError, Http404):
        raise Http404("Equipamento não encontrado")

    payload = equip.qr_payload
    # Gera QR Code com texto personalizado
    qr_img = generate_qr_code(payload, box_size=10, border=4)

    # Adiciona texto: MANDACARU S M no topo e codigo/descricao embaixo
    bottom_text = f"{equip.codigo} - {equip.descricao or equip.modelo}"
    final_img = add_text_to_qr(qr_img, top_text="MANDACARU S M", bottom_text=bottom_text)

    # Retorna como PNG
    buf = io.BytesIO()
    final_img.save(buf, format="PNG")
    buf.seek(0)
    return HttpResponse(buf.getvalue(), content_type="image/png")

