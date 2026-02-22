from rest_framework import serializers
from .models import Fornecedor, PedidoCompra, ItemPedidoCompra, LocalEntrega


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


class LocalEntregaSerializer(serializers.ModelSerializer):
    endereco_completo = serializers.CharField(read_only=True)

    class Meta:
        model = LocalEntrega
        fields = [
            'id', 'nome', 'responsavel', 'telefone',
            'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf', 'cep',
            'endereco_completo', 'observacoes', 'ativo',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'endereco_completo', 'created_at', 'updated_at']


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
    fornecedor_cnpj = serializers.CharField(source='fornecedor.cnpj_cpf', read_only=True)
    fornecedor_contato = serializers.CharField(source='fornecedor.contato', read_only=True)
    fornecedor_telefone = serializers.CharField(source='fornecedor.telefone', read_only=True)
    fornecedor_email = serializers.EmailField(source='fornecedor.email', read_only=True)
    cliente_nome = serializers.SerializerMethodField(read_only=True)
    cliente_cnpj = serializers.SerializerMethodField(read_only=True)
    equipamento_codigo = serializers.SerializerMethodField(read_only=True)
    equipamento_descricao = serializers.SerializerMethodField(read_only=True)
    equipamento_tipo = serializers.SerializerMethodField(read_only=True)
    orcamento_numero = serializers.SerializerMethodField(read_only=True)
    orcamento_valor = serializers.SerializerMethodField(read_only=True)
    ordem_servico_numero = serializers.SerializerMethodField(read_only=True)
    ordem_servico_status = serializers.SerializerMethodField(read_only=True)
    ordem_servico_tipo = serializers.SerializerMethodField(read_only=True)
    local_estoque_nome = serializers.SerializerMethodField(read_only=True)
    local_entrega_nome = serializers.SerializerMethodField(read_only=True)
    local_entrega_endereco = serializers.SerializerMethodField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    destino_display = serializers.CharField(source='get_destino_display', read_only=True)
    criado_por_nome = serializers.SerializerMethodField(read_only=True)
    # Para criar/editar com itens inline
    itens_data = serializers.ListField(child=serializers.DictField(), write_only=True, required=False)

    class Meta:
        model = PedidoCompra
        fields = [
            'id', 'numero', 'fornecedor', 'fornecedor_nome',
            'fornecedor_cnpj', 'fornecedor_contato', 'fornecedor_telefone', 'fornecedor_email',
            'destino', 'destino_display',
            'orcamento', 'orcamento_numero', 'orcamento_valor',
            'ordem_servico', 'ordem_servico_numero', 'ordem_servico_status', 'ordem_servico_tipo',
            'cliente', 'cliente_nome', 'cliente_cnpj',
            'equipamento', 'equipamento_codigo', 'equipamento_descricao', 'equipamento_tipo',
            'status', 'status_display',
            'data_pedido', 'data_previsao', 'data_entrega',
            'local_estoque', 'local_estoque_nome',
            'local_entrega', 'local_entrega_nome', 'local_entrega_endereco',
            'numero_nf', 'nota_fiscal',
            'observacoes', 'valor_total',
            'criado_por', 'criado_por_nome',
            'itens', 'itens_data',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'numero', 'valor_total', 'data_pedido', 'created_at', 'updated_at']

    def get_cliente_nome(self, obj):
        return obj.cliente.nome_razao if obj.cliente else None

    def get_cliente_cnpj(self, obj):
        return obj.cliente.cnpj_cpf if obj.cliente else None

    def get_equipamento_codigo(self, obj):
        return obj.equipamento.codigo if obj.equipamento else None

    def get_equipamento_descricao(self, obj):
        return obj.equipamento.descricao if obj.equipamento else None

    def get_equipamento_tipo(self, obj):
        if obj.equipamento and obj.equipamento.tipo_equipamento:
            return obj.equipamento.tipo_equipamento.nome
        return None

    def get_orcamento_numero(self, obj):
        return obj.orcamento.numero if obj.orcamento else None

    def get_orcamento_valor(self, obj):
        return str(obj.orcamento.valor_total) if obj.orcamento else None

    def get_ordem_servico_numero(self, obj):
        return obj.ordem_servico.numero if obj.ordem_servico else None

    def get_ordem_servico_status(self, obj):
        return obj.ordem_servico.get_status_display() if obj.ordem_servico else None

    def get_ordem_servico_tipo(self, obj):
        return obj.ordem_servico.get_tipo_display() if obj.ordem_servico else None

    def get_local_estoque_nome(self, obj):
        return obj.local_estoque.nome if obj.local_estoque else None

    def get_local_entrega_nome(self, obj):
        return obj.local_entrega.nome if obj.local_entrega else None

    def get_local_entrega_endereco(self, obj):
        return obj.local_entrega.endereco_completo if obj.local_entrega else None

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
