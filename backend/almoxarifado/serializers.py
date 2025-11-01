from rest_framework import serializers
from .models import UnidadeMedida, CategoriaProduto, Produto, LocalEstoque, Estoque, MovimentoEstoque

class UnidadeSerializer(serializers.ModelSerializer):
    class Meta: model = UnidadeMedida; fields = "__all__"

class CategoriaSerializer(serializers.ModelSerializer):
    class Meta: model = CategoriaProduto; fields = "__all__"

class ProdutoSerializer(serializers.ModelSerializer):
    class Meta: model = Produto; fields = "__all__"

class LocalEstoqueSerializer(serializers.ModelSerializer):
    class Meta: model = LocalEstoque; fields = "__all__"

class EstoqueSerializer(serializers.ModelSerializer):
    produto = ProdutoSerializer(read_only=True)
    local = LocalEstoqueSerializer(read_only=True)
    class Meta: model = Estoque; fields = "__all__"

class MovimentoSerializer(serializers.ModelSerializer):
    class Meta: model = MovimentoEstoque; fields = "__all__"
