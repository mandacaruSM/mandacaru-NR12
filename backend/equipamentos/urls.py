from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TipoEquipamentoViewSet, EquipamentoViewSet,
    PlanoManutencaoItemViewSet, MedicaoEquipamentoViewSet
)

router = DefaultRouter()
router.register(r"tipos-equipamento", TipoEquipamentoViewSet, basename="tipos-equipamento")
router.register(r"equipamentos", EquipamentoViewSet, basename="equipamentos")
router.register(r"equipamentos-planos", PlanoManutencaoItemViewSet, basename="equipamentos-planos")
router.register(r"equipamentos-medicoes", MedicaoEquipamentoViewSet, basename="equipamentos-medicoes")

urlpatterns = [ path("", include(router.urls)) ]
