# backend/nr12/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ModeloChecklistViewSet,
    ItemChecklistViewSet,
    ChecklistRealizadoViewSet,
    RespostaItemChecklistViewSet,
    NotificacaoChecklistViewSet,
    BotChecklistViewSet,
    # Manutenção Preventiva
    ModeloManutencaoPreventivaViewSet,
    ItemManutencaoPreventivaViewSet,
    ProgramacaoManutencaoViewSet,
    ManutencaoPreventivaRealizadaViewSet,
    RespostaItemManutencaoViewSet
)

# ============================================
# Router para ViewSets REST (Web Interface)
# ============================================
router = DefaultRouter()
# Checklist
router.register(r'modelos-checklist', ModeloChecklistViewSet, basename='modelos-checklist')
router.register(r'itens-checklist', ItemChecklistViewSet, basename='itens-checklist')
router.register(r'checklists', ChecklistRealizadoViewSet, basename='checklists')
router.register(r'respostas-checklist', RespostaItemChecklistViewSet, basename='respostas-checklist')
router.register(r'notificacoes', NotificacaoChecklistViewSet, basename='notificacoes')

# Manutenção Preventiva
router.register(r'modelos-manutencao-preventiva', ModeloManutencaoPreventivaViewSet, basename='modelos-manutencao-preventiva')
router.register(r'itens-manutencao-preventiva', ItemManutencaoPreventivaViewSet, basename='itens-manutencao-preventiva')
router.register(r'programacoes-manutencao', ProgramacaoManutencaoViewSet, basename='programacoes-manutencao')
router.register(r'manutencoes-preventivas', ManutencaoPreventivaRealizadaViewSet, basename='manutencoes-preventivas')
router.register(r'respostas-manutencao', RespostaItemManutencaoViewSet, basename='respostas-manutencao')

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