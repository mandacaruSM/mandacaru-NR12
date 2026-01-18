# backend/cadastro/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ClienteViewSet, EmpreendimentoViewSet, cliente_qr_view,
    PlanoViewSet, AssinaturaClienteViewSet
)

# ============================================
# Router para ViewSets REST
# ============================================
router = DefaultRouter()
router.register(r'clientes', ClienteViewSet, basename='clientes')
router.register(r'empreendimentos', EmpreendimentoViewSet, basename='empreendimentos')
router.register(r'planos', PlanoViewSet, basename='planos')
router.register(r'assinaturas', AssinaturaClienteViewSet, basename='assinaturas')

# ============================================
# URL Patterns
# ============================================
urlpatterns = [
    # REST API endpoints
    path("", include(router.urls)),

    # QR Code generation for Telegram deep links
    path("clientes/<uuid:uuid_str>/qr.png", cliente_qr_view, name="cliente_qr"),
]
