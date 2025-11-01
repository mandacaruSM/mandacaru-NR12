from rest_framework import viewsets, permissions, mixins
from .models import UnidadeMedida, CategoriaProduto, Produto, LocalEstoque, Estoque, MovimentoEstoque
from .serializers import (UnidadeSerializer, CategoriaSerializer, ProdutoSerializer,
                          LocalEstoqueSerializer, EstoqueSerializer, MovimentoSerializer)

class UnidadeViewSet(viewsets.ModelViewSet):
    queryset = UnidadeMedida.objects.all()
    serializer_class = UnidadeSerializer
    permission_classes = [permissions.IsAuthenticated]

class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = CategoriaProduto.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [permissions.IsAuthenticated]

class ProdutoViewSet(viewsets.ModelViewSet):
    queryset = Produto.objects.all()
    serializer_class = ProdutoSerializer
    permission_classes = [permissions.IsAuthenticated]

class LocalEstoqueViewSet(viewsets.ModelViewSet):
    queryset = LocalEstoque.objects.all()
    serializer_class = LocalEstoqueSerializer
    permission_classes = [permissions.IsAuthenticated]

class EstoqueViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = Estoque.objects.select_related("produto","local").all()
    serializer_class = EstoqueSerializer
    permission_classes = [permissions.IsAuthenticated]

class MovimentoViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    queryset = MovimentoEstoque.objects.select_related("produto","local").all().order_by("-data_hora")
    serializer_class = MovimentoSerializer
    permission_classes = [permissions.IsAuthenticated]
