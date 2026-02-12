from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrdemServicoViewSet, ItemOrdemServicoViewSet

router = DefaultRouter()
router.register(r'ordens-servico', OrdemServicoViewSet, basename='ordem-servico')
router.register(r'itens-os', ItemOrdemServicoViewSet, basename='item-os')

urlpatterns = [
    path('', include(router.urls)),
]
