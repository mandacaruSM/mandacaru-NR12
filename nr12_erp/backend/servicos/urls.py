from rest_framework.routers import DefaultRouter
from .views import CategoriaServicoViewSet, ServicoViewSet

router = DefaultRouter()
router.register(r'categorias', CategoriaServicoViewSet, basename='categoria-servico')
router.register(r'servicos', ServicoViewSet, basename='servico')

urlpatterns = router.urls
