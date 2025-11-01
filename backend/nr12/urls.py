# backend/nr12/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ModeloChecklistViewSet,
    ItemChecklistViewSet,
    ChecklistRealizadoViewSet,
    RespostaItemChecklistViewSet,
    NotificacaoChecklistViewSet,
    BotChecklistViewSet
)

# ============================================
# Router para ViewSets REST (Web Interface)
# ============================================
router = DefaultRouter()
router.register(r'modelos-checklist', ModeloChecklistViewSet, basename='modelos-checklist')
router.register(r'itens-checklist', ItemChecklistViewSet, basename='itens-checklist')
router.register(r'checklists', ChecklistRealizadoViewSet, basename='checklists')
router.register(r'respostas-checklist', RespostaItemChecklistViewSet, basename='respostas-checklist')
router.register(r'notificacoes', NotificacaoChecklistViewSet, basename='notificacoes')

# ============================================
# Endpoints do Bot Telegram
# ============================================
bot_patterns = [
    # Consultar modelos e itens
    path('modelos/', BotChecklistViewSet.as_view({'get': 'list_modelos'}), name='bot-modelos'),
    path('modelos/<int:modelo_id>/itens/', BotChecklistViewSet.as_view({'get': 'list_itens'}), name='bot-itens'),

    # Realizar checklist
    path('iniciar/', BotChecklistViewSet.as_view({'post': 'iniciar_checklist'}), name='bot-iniciar'),
    path('responder/', BotChecklistViewSet.as_view({'post': 'registrar_resposta'}), name='bot-responder'),
    path('finalizar/', BotChecklistViewSet.as_view({'post': 'finalizar_checklist'}), name='bot-finalizar'),
]

# ============================================
# URL Patterns
# ============================================
urlpatterns = [
    # REST API endpoints (Web)
    path('', include(router.urls)),

    # Bot Telegram endpoints
    path('bot/', include(bot_patterns)),
]