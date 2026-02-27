from rest_framework import serializers
from .models import OrdemServico, ItemOrdemServico


class ItemOrdemServicoSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    produto_codigo = serializers.CharField(source='produto.codigo', read_only=True)
    produto_nome = serializers.CharField(source='produto.nome', read_only=True)

    class Meta:
        model = ItemOrdemServico
        fields = [
            'id', 'ordem_servico', 'tipo', 'tipo_display',
            'produto', 'produto_codigo', 'produto_nome',
            'descricao', 'quantidade', 'valor_unitario', 'valor_total',
            'observacao', 'executado',
        ]
        read_only_fields = ['valor_total']

    def update(self, instance, validated_data):
        # Não permitir mudança de ordem_servico em update
        validated_data.pop('ordem_servico', None)
        return super().update(instance, validated_data)


class OrdemServicoListSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    cliente_nome = serializers.CharField(source='cliente.nome_razao', read_only=True)
    empreendimento_nome = serializers.CharField(source='empreendimento.nome', read_only=True)
    equipamento_codigo = serializers.CharField(source='equipamento.codigo', read_only=True)
    orcamento_numero = serializers.CharField(source='orcamento.numero', read_only=True)
    tecnico_nome = serializers.CharField(source='tecnico_responsavel.nome_completo', read_only=True)

    class Meta:
        model = OrdemServico
        fields = [
            'id', 'numero', 'status', 'status_display',
            'orcamento', 'orcamento_numero',
            'cliente', 'cliente_nome',
            'empreendimento', 'empreendimento_nome',
            'equipamento', 'equipamento_codigo',
            'tecnico_responsavel', 'tecnico_nome',
            'data_abertura', 'data_prevista', 'data_inicio', 'data_conclusao',
            'valor_total', 'valor_final',
            'created_at', 'updated_at',
        ]


class OrdemServicoDetailSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    cliente_nome = serializers.CharField(source='cliente.nome_razao', read_only=True)
    empreendimento_nome = serializers.CharField(source='empreendimento.nome', read_only=True)
    equipamento_codigo = serializers.CharField(source='equipamento.codigo', read_only=True)
    equipamento_descricao = serializers.CharField(source='equipamento.descricao', read_only=True)
    orcamento_numero = serializers.CharField(source='orcamento.numero', read_only=True)
    orcamento_tipo_display = serializers.CharField(source='orcamento.get_tipo_display', read_only=True)
    tecnico_nome = serializers.CharField(source='tecnico_responsavel.nome_completo', read_only=True)
    aberto_por_nome = serializers.CharField(source='aberto_por.username', read_only=True)
    concluido_por_nome = serializers.CharField(source='concluido_por.username', read_only=True)

    itens = ItemOrdemServicoSerializer(many=True, read_only=True)

    class Meta:
        model = OrdemServico
        fields = [
            'id', 'numero', 'status', 'status_display',
            'orcamento', 'orcamento_numero', 'orcamento_tipo_display',
            'cliente', 'cliente_nome',
            'empreendimento', 'empreendimento_nome',
            'equipamento', 'equipamento_codigo', 'equipamento_descricao',
            'tecnico_responsavel', 'tecnico_nome',
            'data_abertura', 'data_prevista', 'data_inicio', 'data_conclusao',
            'valor_servicos', 'valor_produtos', 'valor_deslocamento',
            'valor_desconto', 'valor_total', 'valor_adicional', 'valor_final',
            'descricao', 'observacoes',
            'aberto_por', 'aberto_por_nome',
            'concluido_por', 'concluido_por_nome',
            'itens',
            'created_at', 'updated_at',
        ]


class OrdemServicoUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrdemServico
        fields = [
            'status', 'tecnico_responsavel',
            'data_inicio', 'data_conclusao',
            'valor_adicional',
            'observacoes',
        ]

    def update(self, instance, validated_data):
        # Guarda status original antes de atualizar
        status_original = instance.status

        # Atualizar campos
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Se está concluindo (status mudou de qualquer coisa para CONCLUIDA), adicionar concluido_por
        if validated_data.get('status') == 'CONCLUIDA' and status_original != 'CONCLUIDA':
            instance.concluido_por = self.context['request'].user

        instance.save()
        return instance


class OrdemServicoCorrecaoSerializer(serializers.ModelSerializer):
    """
    Serializer para correções administrativas em OS concluídas.
    Permite alterar equipamento e outros campos críticos que normalmente
    não podem ser editados após conclusão.
    """
    class Meta:
        model = OrdemServico
        fields = ['equipamento', 'empreendimento', 'cliente']

    def validate(self, data):
        """Validação extra para garantir consistência dos dados"""
        equipamento = data.get('equipamento') or self.instance.equipamento
        empreendimento = data.get('empreendimento') or self.instance.empreendimento

        # Validar que o equipamento pertence ao empreendimento
        if equipamento and empreendimento:
            if equipamento.empreendimento_id != empreendimento.id:
                raise serializers.ValidationError({
                    'equipamento': 'O equipamento não pertence ao empreendimento selecionado'
                })

        return data

    def update(self, instance, validated_data):
        """Atualiza OS e também a manutenção vinculada (se existir)"""
        from manutencao.models import Manutencao

        novo_equipamento = validated_data.get('equipamento')

        # Atualizar OS
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Atualizar também a manutenção vinculada (se existir)
        if novo_equipamento:
            manutencoes = Manutencao.objects.filter(ordem_servico=instance)
            for manutencao in manutencoes:
                manutencao.equipamento = novo_equipamento
                manutencao.save()

        return instance
