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
)

# Router para ViewSets
router = DefaultRouter()
router.register(r'operadores', OperadorViewSet, basename='operador')
router.register(r'supervisores', SupervisorViewSet, basename='supervisor')

urlpatterns = [
    # Rotas do router
    path('', include(router.urls)),
    
    # Health check
    path('health/', HealthView.as_view(), name='health'),
    path('me/', MeView.as_view(), name='me'),
    
    # ============================================
    # ENDPOINTS ESPECÍFICOS PARA BOT TELEGRAM
    # ============================================
    
    # Bot - Vincular Operador
    path('bot/vincular/', bot_vincular_codigo, name='bot-vincular-operador'),
    
    # Bot - Vincular Supervisor
    path('bot/vincular-supervisor/', bot_vincular_supervisor, name='bot-vincular-supervisor'),
]