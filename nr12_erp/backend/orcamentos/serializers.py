from rest_framework import serializers
from .models import Orcamento, ItemOrcamento


class ItemOrcamentoSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    produto_codigo = serializers.CharField(source='produto.codigo', read_only=True)
    produto_nome = serializers.CharField(source='produto.nome', read_only=True)

    class Meta:
        model = ItemOrcamento
        fields = [
            'id', 'orcamento', 'tipo', 'tipo_display',
            'produto', 'produto_codigo', 'produto_nome',
            'descricao', 'quantidade', 'valor_unitario', 'valor_total',
            'observacao',
        ]
        read_only_fields = ['valor_total', 'orcamento']


class OrcamentoListSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    cliente_nome = serializers.CharField(source='cliente.nome_razao', read_only=True)
    empreendimento_nome = serializers.CharField(source='empreendimento.nome', read_only=True)
    equipamento_codigo = serializers.CharField(source='equipamento.codigo', read_only=True)
    modelo_manutencao_preventiva_nome = serializers.CharField(
        source='modelo_manutencao_preventiva.nome', read_only=True
    )

    class Meta:
        model = Orcamento
        fields = [
            'id', 'numero', 'tipo', 'tipo_display', 'status', 'status_display',
            'cliente', 'cliente_nome',
            'empreendimento', 'empreendimento_nome',
            'equipamento', 'equipamento_codigo',
            'modelo_manutencao_preventiva', 'modelo_manutencao_preventiva_nome',
            'data_emissao', 'data_validade', 'data_aprovacao',
            'km_deslocado', 'valor_km', 'valor_deslocamento',
            'valor_total', 'prazo_execucao_dias',
            'horimetro',
            'created_at', 'updated_at',
        ]


class OrcamentoDetailSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    cliente_nome = serializers.CharField(source='cliente.nome_razao', read_only=True)
    empreendimento_nome = serializers.CharField(source='empreendimento.nome', read_only=True)
    equipamento_codigo = serializers.CharField(source='equipamento.codigo', read_only=True)
    equipamento_descricao = serializers.CharField(source='equipamento.descricao', read_only=True)
    modelo_manutencao_preventiva_nome = serializers.CharField(
        source='modelo_manutencao_preventiva.nome', read_only=True
    )
    criado_por_nome = serializers.CharField(source='criado_por.username', read_only=True)
    aprovado_por_nome = serializers.CharField(source='aprovado_por.username', read_only=True)

    itens = ItemOrcamentoSerializer(many=True, read_only=True)
    itens_manutencao_detalhes = serializers.SerializerMethodField()

    def get_itens_manutencao_detalhes(self, obj):
        """Retorna detalhes dos itens de manutenção vinculados"""
        from equipamentos.serializers import ItemManutencaoSerializer
        return ItemManutencaoSerializer(obj.itens_manutencao.all(), many=True).data

    class Meta:
        model = Orcamento
        fields = [
            'id', 'numero', 'tipo', 'tipo_display', 'status', 'status_display',
            'cliente', 'cliente_nome',
            'empreendimento', 'empreendimento_nome',
            'equipamento', 'equipamento_codigo', 'equipamento_descricao',
            'modelo_manutencao_preventiva', 'modelo_manutencao_preventiva_nome',
            'data_emissao', 'data_validade', 'data_aprovacao',
            'valor_servicos', 'valor_produtos',
            'km_deslocado', 'valor_km', 'valor_deslocamento',
            'valor_desconto', 'valor_total',
            'descricao', 'observacoes', 'prazo_execucao_dias',
            'horimetro',
            'criado_por', 'criado_por_nome',
            'aprovado_por', 'aprovado_por_nome',
            'itens', 'itens_manutencao_detalhes',
            'created_at', 'updated_at',
        ]


class OrcamentoCreateUpdateSerializer(serializers.ModelSerializer):
    itens = ItemOrcamentoSerializer(many=True, required=False)

    class Meta:
        model = Orcamento
        fields = [
            'tipo', 'status',
            'cliente', 'empreendimento', 'equipamento',
            'modelo_manutencao_preventiva',
            'data_validade',
            'km_deslocado', 'valor_km', 'valor_deslocamento',
            'valor_desconto',
            'descricao', 'observacoes', 'prazo_execucao_dias',
            'horimetro',
            'itens', 'itens_manutencao',
        ]

    def validate(self, data):
        """Valida que modelo_manutencao_preventiva é obrigatório quando tipo = MANUTENCAO_PREVENTIVA"""
        tipo = data.get('tipo') or (self.instance.tipo if self.instance else None)
        modelo = data.get('modelo_manutencao_preventiva')

        if tipo == 'MANUTENCAO_PREVENTIVA' and not modelo:
            # Se está atualizando e não foi passado modelo, verifica se já tem
            if self.instance and self.instance.modelo_manutencao_preventiva:
                pass  # OK, já tem modelo
            else:
                raise serializers.ValidationError({
                    'modelo_manutencao_preventiva': 'Selecione um modelo de manutenção preventiva.'
                })

        return data

    def create(self, validated_data):
        itens_data = validated_data.pop('itens', [])
        itens_manutencao = validated_data.pop('itens_manutencao', [])

        # Adicionar criado_por do request
        validated_data['criado_por'] = self.context['request'].user

        orcamento = Orcamento.objects.create(**validated_data)

        # Criar itens
        for item_data in itens_data:
            ItemOrcamento.objects.create(orcamento=orcamento, **item_data)

        # Vincular itens de manutenção
        if itens_manutencao:
            orcamento.itens_manutencao.set(itens_manutencao)

        return orcamento

    def update(self, instance, validated_data):
        itens_data = validated_data.pop('itens', None)
        itens_manutencao = validated_data.pop('itens_manutencao', None)

        # Guarda status original ANTES de atualizar
        status_original = instance.status

        # Atualizar campos do orçamento
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Se está aprovando (status mudou para APROVADO), adicionar aprovado_por
        if validated_data.get('status') == 'APROVADO' and status_original != 'APROVADO':
            instance.aprovado_por = self.context['request'].user
            from django.utils import timezone
            instance.data_aprovacao = timezone.now().date()

        instance.save()

        # Atualizar itens se fornecido
        if itens_data is not None:
            # Remover itens existentes
            instance.itens.all().delete()
            # Criar novos itens
            for item_data in itens_data:
                ItemOrcamento.objects.create(orcamento=instance, **item_data)

        # Atualizar itens de manutenção se fornecido
        if itens_manutencao is not None:
            instance.itens_manutencao.set(itens_manutencao)

        return instance
