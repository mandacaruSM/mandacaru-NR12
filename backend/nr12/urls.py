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

# Router principal
router = DefaultRouter()

# ✅ CORRIGIDO: Usando nomes que o frontend espera
router.register(r'modelos', ModeloChecklistViewSet, basename='modelos')
router.register(r'checklists', ChecklistRealizadoViewSet, basename='checklists')
router.register(r'respostas', RespostaItemChecklistViewSet, basename='respostas')
router.register(r'notificacoes', NotificacaoChecklistViewSet, basename='notificacoes')

# ✅ ROTAS ANINHADAS: /nr12/modelos/{modelo_pk}/itens/
# Isso cria automaticamente todas as rotas CRUD para itens dentro de um modelo
nested_router_patterns = [
    path('modelos/<int:modelo_pk>/itens/', 
         ItemChecklistViewSet.as_view({
             'get': 'list',
             'post': 'create'
         }), 
         name='modelo-itens-list'),
    path('modelos/<int:modelo_pk>/itens/<int:pk>/', 
         ItemChecklistViewSet.as_view({
             'get': 'retrieve',
             'patch': 'partial_update',
             'delete': 'destroy'
         }), 
         name='modelo-itens-detail'),
    path('modelos/<int:modelo_pk>/itens/reordenar/', 
         ItemChecklistViewSet.as_view({'post': 'reordenar'}), 
         name='modelo-itens-reordenar'),
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
    path('', include(nested_router_patterns)),  # ✅ Rotas aninhadas
    path('bot/', include(bot_patterns)),
]