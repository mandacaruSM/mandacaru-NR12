from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FioDiamantadoViewSet,
    RegistroCorteViewSet,
    MovimentacaoFioViewSet,
    dashboard_fio_diamantado,
)

router = DefaultRouter()
router.register(r'fios', FioDiamantadoViewSet, basename='fio-diamantado')
router.register(r'cortes', RegistroCorteViewSet, basename='registro-corte')
router.register(r'movimentacoes', MovimentacaoFioViewSet, basename='movimentacao-fio')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', dashboard_fio_diamantado, name='dashboard-fio-diamantado'),
]
