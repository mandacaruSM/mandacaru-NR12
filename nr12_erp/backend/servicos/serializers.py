from rest_framework import serializers
from .models import CategoriaServico, Servico


class CategoriaServicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaServico
        fields = '__all__'


class ServicoListSerializer(serializers.ModelSerializer):
    """Serializer para listagem de serviços"""
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True)
    total_impostos = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    valor_impostos = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    preco_liquido = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Servico
        fields = [
            'id',
            'codigo',
            'nome',
            'categoria',
            'categoria_nome',
            'preco_venda',
            'preco_custo',
            'total_impostos',
            'valor_impostos',
            'preco_liquido',
            'unidade',
            'ativo',
        ]


class ServicoDetailSerializer(serializers.ModelSerializer):
    """Serializer detalhado para criar/editar serviços"""
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True)
    total_impostos = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    valor_impostos = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    preco_liquido = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Servico
        fields = '__all__'
        read_only_fields = ['criado_em', 'atualizado_em']
