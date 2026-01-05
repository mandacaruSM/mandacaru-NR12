from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TipoEquipamentoViewSet, EquipamentoViewSet,
    PlanoManutencaoItemViewSet, MedicaoEquipamentoViewSet,
    equipamento_qr_view,
)

# ============================================
# Router para ViewSets REST
# ============================================
router = DefaultRouter()
router.register(r"tipos-equipamento", TipoEquipamentoViewSet, basename="tipos-equipamento")
router.register(r"equipamentos", EquipamentoViewSet, basename="equipamentos")
router.register(r"planos-manutencao", PlanoManutencaoItemViewSet, basename="planos-manutencao")
router.register(r"medicoes", MedicaoEquipamentoViewSet, basename="medicoes")

# ============================================
# URL Patterns
# ============================================
urlpatterns = [
    # REST API endpoints
    path("", include(router.urls)),

    # QR Code generation for Telegram deep links
    path("equipamentos/<uuid:uuid_str>/qr.png", equipamento_qr_view, name="equipamento_qr"),
]
