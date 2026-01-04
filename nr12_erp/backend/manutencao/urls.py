from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ManutencaoViewSet, AnexoManutencaoViewSet

router = DefaultRouter()
router.register(r'manutencoes', ManutencaoViewSet, basename='manutencoes')
router.register(r'manutencao-anexos', AnexoManutencaoViewSet, basename='manutencao-anexos')

urlpatterns = [
    path('', include(router.urls)),
]
