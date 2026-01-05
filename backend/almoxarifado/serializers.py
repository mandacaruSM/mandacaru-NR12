from rest_framework import serializers
from .models import UnidadeMedida, CategoriaProduto, Produto, LocalEstoque, Estoque, MovimentoEstoque


class UnidadeSerializer(serializers.ModelSerializer):
    class Meta:
        model = UnidadeMedida
        fields = "__all__"


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaProduto
        fields = "__all__"


class ProdutoSerializer(serializers.ModelSerializer):
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True)
    unidade_sigla = serializers.CharField(source='unidade.sigla', read_only=True)
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)

    class Meta:
        model = Produto
        fields = '__all__'


class ProdutoListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listagens"""
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True)
    unidade_sigla = serializers.CharField(source='unidade.sigla', read_only=True)
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)

    class Meta:
        model = Produto
        fields = ['id', 'codigo', 'nome', 'tipo', 'tipo_display', 'categoria_nome', 'unidade_sigla', 'ativo']


class LocalEstoqueSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)

    class Meta:
        model = LocalEstoque
        fields = '__all__'


class EstoqueSerializer(serializers.ModelSerializer):
    produto_nome = serializers.CharField(source='produto.nome', read_only=True)
    produto_codigo = serializers.CharField(source='produto.codigo', read_only=True)
    local_nome = serializers.CharField(source='local.nome', read_only=True)
    unidade = serializers.CharField(source='produto.unidade.sigla', read_only=True)

    class Meta:
        model = Estoque
        fields = '__all__'
        read_only_fields = ['saldo']


class MovimentoSerializer(serializers.ModelSerializer):
    produto_nome = serializers.CharField(source='produto.nome', read_only=True)
    produto_codigo = serializers.CharField(source='produto.codigo', read_only=True)
    local_nome = serializers.CharField(source='local.nome', read_only=True)
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    criado_por_nome = serializers.SerializerMethodField()

    class Meta:
        model = MovimentoEstoque
        fields = '__all__'
        read_only_fields = ['data_hora', 'criado_por']

    def get_criado_por_nome(self, obj):
        if obj.criado_por:
            return obj.criado_por.get_full_name() or obj.criado_por.username
        return None

    def validate(self, data):
        """
        Validação adicional para garantir que saídas não excedam o saldo.
        A validação principal está no signal, mas mantemos aqui para feedback imediato.
        """
        if data.get('tipo') == 'SAIDA':
            try:
                estoque = Estoque.objects.get(
                    produto=data['produto'],
                    local=data['local']
                )
                if estoque.saldo < data['quantidade']:
                    raise serializers.ValidationError({
                        'quantidade': f"Saldo insuficiente. Disponível: {estoque.saldo} {data['produto'].unidade.sigla}"
                    })
            except Estoque.DoesNotExist:
                raise serializers.ValidationError({
                    'produto': f"Não existe estoque de {data['produto'].nome} no local {data['local'].nome}"
                })
        return data

    def create(self, validated_data):
        # Adiciona o usuário que criou
        validated_data['criado_por'] = self.context['request'].user
        return super().create(validated_data)
