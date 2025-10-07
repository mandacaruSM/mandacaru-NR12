# backend/nr12/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ModeloChecklistViewSet, ItemChecklistViewSet,
    ChecklistRealizadoViewSet, RespostaItemChecklistViewSet,
    NotificacaoChecklistViewSet, BotChecklistViewSet
)

# Router principal
router = DefaultRouter()

# Registra os ViewSets com os nomes corretos para o frontend
router.register(r'modelos', ModeloChecklistViewSet, basename='modelos')
router.register(r'checklists', ChecklistRealizadoViewSet, basename='checklists')
router.register(r'respostas', RespostaItemChecklistViewSet, basename='respostas')
router.register(r'notificacoes', NotificacaoChecklistViewSet, basename='notificacoes')

# Rotas customizadas para itens de checklist
# Frontend espera: /api/v1/nr12/modelos/{modelo_id}/itens/
itens_patterns = [
    path('modelos/<int:modelo_pk>/itens/', 
         ItemChecklistViewSet.as_view({'get': 'list', 'post': 'create'}), 
         name='modelo-itens-list'),
    path('modelos/<int:modelo_pk>/itens/<int:pk>/', 
         ItemChecklistViewSet.as_view({'get': 'retrieve', 'put': 'update', 'delete': 'destroy'}), 
         name='modelo-itens-detail'),
]

# Endpoints específicos para o Bot
bot_patterns = [
    path('modelos/', BotChecklistViewSet.as_view({'get': 'list_modelos'}), name='bot-modelos'),
    path('modelos/<int:modelo_id>/itens/', BotChecklistViewSet.as_view({'get': 'list_itens'}), name='bot-itens'),
    path('iniciar/', BotChecklistViewSet.as_view({'post': 'iniciar_checklist'}), name='bot-iniciar'),
    path('responder/', BotChecklistViewSet.as_view({'post': 'registrar_resposta'}), name='bot-responder'),
    path('finalizar/', BotChecklistViewSet.as_view({'post': 'finalizar_checklist'}), name='bot-finalizar'),
]

urlpatterns = [
    path('', include(router.urls)),
    path('', include(itens_patterns)),
    path('bot/', include(bot_patterns)),
]