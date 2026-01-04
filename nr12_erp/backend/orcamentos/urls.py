from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrcamentoViewSet, ItemOrcamentoViewSet

router = DefaultRouter()
router.register(r'orcamentos', OrcamentoViewSet, basename='orcamento')
router.register(r'itens', ItemOrcamentoViewSet, basename='item-orcamento')

urlpatterns = [
    path('', include(router.urls)),
]
