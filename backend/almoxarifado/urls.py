from rest_framework.routers import DefaultRouter
from .views import (UnidadeViewSet, CategoriaViewSet, ProdutoViewSet,
                    LocalEstoqueViewSet, EstoqueViewSet, MovimentoViewSet)

router = DefaultRouter()
router.register(r'unidades', UnidadeViewSet)
router.register(r'categorias', CategoriaViewSet)
router.register(r'produtos', ProdutoViewSet)
router.register(r'locais', LocalEstoqueViewSet)
router.register(r'estoque', EstoqueViewSet, basename='estoque')
router.register(r'movimentos', MovimentoViewSet, basename='movimentos')
urlpatterns = router.urls
