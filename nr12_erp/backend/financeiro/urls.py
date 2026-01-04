from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ContaReceberViewSet, ContaPagarViewSet, PagamentoViewSet

router = DefaultRouter()
router.register(r'contas-receber', ContaReceberViewSet, basename='conta-receber')
router.register(r'contas-pagar', ContaPagarViewSet, basename='conta-pagar')
router.register(r'pagamentos', PagamentoViewSet, basename='pagamento')

urlpatterns = [
    path('', include(router.urls)),
]
