# backend/core/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    HealthView,
    MeView,
    OperadorViewSet,
    SupervisorViewSet,
    bot_vincular_codigo,
    bot_vincular_supervisor,
    bot_validar_operador,
    bot_equipamentos_operador,
    bot_verificar_acesso_equipamento,
    geocodificar_coordenadas,
    validar_geofence,
)

# ============================================
# Router para ViewSets REST
# ============================================
router = DefaultRouter()
router.register(r'operadores', OperadorViewSet, basename='operador')
router.register(r'supervisores', SupervisorViewSet, basename='supervisor')

# ============================================
# Endpoints do Bot Telegram
# ============================================
bot_patterns = [
    # Vincular contas
    path('vincular/', bot_vincular_codigo, name='bot-vincular-operador'),
    path('vincular-supervisor/', bot_vincular_supervisor, name='bot-vincular-supervisor'),

    # Validar e consultar operador
    path('validar-operador/', bot_validar_operador, name='bot-validar-operador'),
    path('equipamentos-operador/', bot_equipamentos_operador, name='bot-equipamentos-operador'),

    # Verificar permissões
    path('verificar-acesso/', bot_verificar_acesso_equipamento, name='bot-verificar-acesso'),
]

# ============================================
# Endpoints de Geolocalização
# ============================================
geo_patterns = [
    path('geocodificar/', geocodificar_coordenadas, name='geocodificar'),
    path('validar-geofence/', validar_geofence, name='validar-geofence'),
]

# ============================================
# URL Patterns
# ============================================
urlpatterns = [
    # Core endpoints
    path('health/', HealthView.as_view(), name='health'),
    path('me/', MeView.as_view(), name='me'),

    # Bot endpoints
    path('bot/', include(bot_patterns)),

    # Geolocalização
    path('geolocalizacao/', include(geo_patterns)),

    # REST API endpoints (operadores, supervisores)
    path('', include(router.urls)),
]