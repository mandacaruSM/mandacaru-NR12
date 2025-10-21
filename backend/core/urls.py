# backend/core/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    HealthView, MeView,
    OperadorViewSet, SupervisorViewSet,
    # Endpoints do Bot
    bot_vincular_codigo,
    bot_validar_operador,
    bot_equipamentos_operador,
    bot_verificar_acesso_equipamento
)

# Router para ViewSets
router = DefaultRouter()
router.register(r'operadores', OperadorViewSet, basename='operadores')
router.register(r'supervisores', SupervisorViewSet, basename='supervisores')

# Endpoints específicos do Bot
bot_patterns = [
    path('vincular/', bot_vincular_codigo, name='bot-vincular'),
    path('validar-operador/', bot_validar_operador, name='bot-validar-operador'),
    path('equipamentos/', bot_equipamentos_operador, name='bot-equipamentos'),
    path('verificar-acesso/', bot_verificar_acesso_equipamento, name='bot-verificar-acesso'),
]

urlpatterns = [
    # Endpoints básicos
    path("health/", HealthView.as_view(), name="health"),
    path("users/me/", MeView.as_view(), name="me"),
    
    # ViewSets (CRUD com JWT)
    path('', include(router.urls)),
    
    # Endpoints do Bot (sem autenticação JWT)
    path('bot/', include(bot_patterns)),
]