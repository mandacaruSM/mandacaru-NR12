from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FornecedorViewSet, PedidoCompraViewSet, ItemPedidoCompraViewSet, LocalEntregaViewSet

router = DefaultRouter()
router.register(r'locais-entrega', LocalEntregaViewSet, basename='locais-entrega')
router.register(r'fornecedores', FornecedorViewSet, basename='fornecedores')
router.register(r'pedidos-compra', PedidoCompraViewSet, basename='pedidos-compra')
router.register(r'itens-pedido-compra', ItemPedidoCompraViewSet, basename='itens-pedido-compra')

urlpatterns = [
    path('', include(router.urls)),
]
