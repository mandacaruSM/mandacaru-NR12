from rest_framework import serializers
from .models import Fornecedor, PedidoCompra, ItemPedidoCompra


class FornecedorSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Fornecedor
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_email(self, value):
        if not value:
            return None
        return value


class ItemPedidoCompraSerializer(serializers.ModelSerializer):
    produto_nome = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ItemPedidoCompra
        fields = [
            'id', 'pedido', 'produto', 'produto_nome',
            'descricao', 'codigo_fornecedor',
            'quantidade', 'unidade', 'valor_unitario', 'valor_total',
            'quantidade_recebida', 'entregue'
        ]
        read_only_fields = ['id', 'valor_total']

    def get_produto_nome(self, obj):
        if obj.produto:
            return obj.produto.nome
        return None


class PedidoCompraSerializer(serializers.ModelSerializer):
    itens = ItemPedidoCompraSerializer(many=True, read_only=True)
    fornecedor_nome = serializers.CharField(source='fornecedor.nome', read_only=True)
    cliente_nome = serializers.SerializerMethodField(read_only=True)
    equipamento_codigo = serializers.SerializerMethodField(read_only=True)
    orcamento_numero = serializers.SerializerMethodField(read_only=True)
    local_estoque_nome = serializers.SerializerMethodField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    destino_display = serializers.CharField(source='get_destino_display', read_only=True)
    criado_por_nome = serializers.SerializerMethodField(read_only=True)
    # Para criar/editar com itens inline
    itens_data = serializers.ListField(child=serializers.DictField(), write_only=True, required=False)

    class Meta:
        model = PedidoCompra
        fields = [
            'id', 'numero', 'fornecedor', 'fornecedor_nome',
            'destino', 'destino_display',
            'orcamento', 'orcamento_numero',
            'cliente', 'cliente_nome',
            'equipamento', 'equipamento_codigo',
            'status', 'status_display',
            'data_pedido', 'data_previsao', 'data_entrega',
            'local_estoque', 'local_estoque_nome',
            'numero_nf', 'nota_fiscal',
            'observacoes', 'valor_total',
            'criado_por', 'criado_por_nome',
            'itens', 'itens_data',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'numero', 'valor_total', 'data_pedido', 'created_at', 'updated_at']

    def get_cliente_nome(self, obj):
        return obj.cliente.nome_razao if obj.cliente else None

    def get_equipamento_codigo(self, obj):
        return obj.equipamento.codigo if obj.equipamento else None

    def get_orcamento_numero(self, obj):
        return obj.orcamento.numero if obj.orcamento else None

    def get_local_estoque_nome(self, obj):
        return obj.local_estoque.nome if obj.local_estoque else None

    def get_criado_por_nome(self, obj):
        return str(obj.criado_por) if obj.criado_por else None

    def create(self, validated_data):
        itens_data = validated_data.pop('itens_data', [])
        pedido = PedidoCompra.objects.create(**validated_data)
        for item_data in itens_data:
            item_data.pop('id', None)
            item_data.pop('pedido', None)
            ItemPedidoCompra.objects.create(pedido=pedido, **item_data)
        pedido.recalcular_total()
        return pedido

    def update(self, instance, validated_data):
        itens_data = validated_data.pop('itens_data', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if itens_data is not None:
            # Deleta itens antigos e recria
            instance.itens.all().delete()
            for item_data in itens_data:
                item_data.pop('id', None)
                item_data.pop('pedido', None)
                ItemPedidoCompra.objects.create(pedido=instance, **item_data)
            instance.recalcular_total()

        return instance
