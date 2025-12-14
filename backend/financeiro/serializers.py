from rest_framework import serializers
from .models import ContaReceber, ContaPagar


class ContaReceberListSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    cliente_nome = serializers.CharField(source='cliente.nome_razao', read_only=True)
    orcamento_numero = serializers.CharField(source='orcamento.numero', read_only=True)
    ordem_servico_numero = serializers.CharField(source='ordem_servico.numero', read_only=True)

    class Meta:
        model = ContaReceber
        fields = [
            'id', 'numero', 'tipo', 'tipo_display', 'status', 'status_display',
            'orcamento', 'orcamento_numero',
            'ordem_servico', 'ordem_servico_numero',
            'cliente', 'cliente_nome',
            'data_emissao', 'data_vencimento', 'data_pagamento',
            'valor_original', 'valor_final', 'valor_pago',
            'created_at', 'updated_at',
        ]


class ContaReceberDetailSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    cliente_nome = serializers.CharField(source='cliente.nome_razao', read_only=True)
    cliente_cpf_cnpj = serializers.CharField(source='cliente.cpf_cnpj', read_only=True)
    orcamento_numero = serializers.CharField(source='orcamento.numero', read_only=True)
    ordem_servico_numero = serializers.CharField(source='ordem_servico.numero', read_only=True)
    criado_por_nome = serializers.CharField(source='criado_por.username', read_only=True)
    recebido_por_nome = serializers.CharField(source='recebido_por.username', read_only=True)

    class Meta:
        model = ContaReceber
        fields = [
            'id', 'numero', 'tipo', 'tipo_display', 'status', 'status_display',
            'orcamento', 'orcamento_numero',
            'ordem_servico', 'ordem_servico_numero',
            'cliente', 'cliente_nome', 'cliente_cpf_cnpj',
            'data_emissao', 'data_vencimento', 'data_pagamento',
            'valor_original', 'valor_juros', 'valor_desconto',
            'valor_pago', 'valor_final',
            'descricao', 'observacoes',
            'forma_pagamento', 'comprovante',
            'criado_por', 'criado_por_nome',
            'recebido_por', 'recebido_por_nome',
            'created_at', 'updated_at',
        ]


class ContaReceberCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContaReceber
        fields = [
            'tipo', 'status',
            'orcamento', 'ordem_servico',
            'cliente', 'data_vencimento',
            'valor_original', 'valor_juros', 'valor_desconto', 'valor_pago',
            'descricao', 'observacoes',
            'forma_pagamento', 'comprovante',
        ]

    def create(self, validated_data):
        validated_data['criado_por'] = self.context['request'].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Se está recebendo pagamento, adicionar recebido_por
        if validated_data.get('valor_pago', 0) > instance.valor_pago:
            instance.recebido_por = self.context['request'].user

        return super().update(instance, validated_data)


class ContaPagarListSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = ContaPagar
        fields = [
            'id', 'numero', 'tipo', 'tipo_display', 'status', 'status_display',
            'fornecedor', 'documento_fornecedor',
            'data_emissao', 'data_vencimento', 'data_pagamento',
            'valor_original', 'valor_final', 'valor_pago',
            'numero_documento',
            'created_at', 'updated_at',
        ]


class ContaPagarDetailSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    criado_por_nome = serializers.CharField(source='criado_por.username', read_only=True)
    pago_por_nome = serializers.CharField(source='pago_por.username', read_only=True)

    class Meta:
        model = ContaPagar
        fields = [
            'id', 'numero', 'tipo', 'tipo_display', 'status', 'status_display',
            'fornecedor', 'documento_fornecedor',
            'data_emissao', 'data_vencimento', 'data_pagamento',
            'valor_original', 'valor_juros', 'valor_desconto',
            'valor_pago', 'valor_final',
            'descricao', 'observacoes', 'numero_documento',
            'forma_pagamento', 'comprovante',
            'criado_por', 'criado_por_nome',
            'pago_por', 'pago_por_nome',
            'created_at', 'updated_at',
        ]


class ContaPagarCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContaPagar
        fields = [
            'tipo', 'status',
            'fornecedor', 'documento_fornecedor',
            'data_vencimento',
            'valor_original', 'valor_juros', 'valor_desconto', 'valor_pago',
            'descricao', 'observacoes', 'numero_documento',
            'forma_pagamento', 'comprovante',
        ]

    def create(self, validated_data):
        validated_data['criado_por'] = self.context['request'].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Se está efetuando pagamento, adicionar pago_por
        if validated_data.get('valor_pago', 0) > instance.valor_pago:
            instance.pago_por = self.context['request'].user

        return super().update(instance, validated_data)
