from rest_framework import serializers
from .models import ContaReceber, ContaPagar, Pagamento


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


# ============================================
# PAGAMENTO SERIALIZERS
# ============================================

class PagamentoListSerializer(serializers.ModelSerializer):
    tipo_pagamento_display = serializers.CharField(source='get_tipo_pagamento_display', read_only=True)
    forma_pagamento_display = serializers.CharField(source='get_forma_pagamento_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    conta_receber_numero = serializers.CharField(source='conta_receber.numero', read_only=True)
    cliente_nome = serializers.CharField(source='conta_receber.cliente.nome_razao', read_only=True)

    class Meta:
        model = Pagamento
        fields = [
            'id', 'numero',
            'conta_receber', 'conta_receber_numero', 'cliente_nome',
            'tipo_pagamento', 'tipo_pagamento_display',
            'forma_pagamento', 'forma_pagamento_display',
            'status', 'status_display',
            'valor', 'valor_desconto', 'valor_final',
            'data_pagamento',
            'numero_parcela', 'total_parcelas',
            'created_at', 'updated_at',
        ]


class PagamentoDetailSerializer(serializers.ModelSerializer):
    tipo_pagamento_display = serializers.CharField(source='get_tipo_pagamento_display', read_only=True)
    forma_pagamento_display = serializers.CharField(source='get_forma_pagamento_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    conta_receber_numero = serializers.CharField(source='conta_receber.numero', read_only=True)
    cliente_nome = serializers.CharField(source='conta_receber.cliente.nome_razao', read_only=True)
    cliente_documento = serializers.CharField(source='conta_receber.cliente.documento', read_only=True)
    registrado_por_nome = serializers.CharField(source='registrado_por.username', read_only=True)

    class Meta:
        model = Pagamento
        fields = [
            'id', 'numero',
            'conta_receber', 'conta_receber_numero', 'cliente_nome', 'cliente_documento',
            'tipo_pagamento', 'tipo_pagamento_display',
            'forma_pagamento', 'forma_pagamento_display',
            'status', 'status_display',
            'valor', 'valor_desconto', 'valor_final',
            'data_pagamento',
            'numero_parcela', 'total_parcelas',
            'numero_cheque', 'banco_cheque', 'data_compensacao',
            'numero_documento', 'comprovante',
            'observacoes',
            'registrado_por', 'registrado_por_nome',
            'created_at', 'updated_at',
        ]


class PagamentoCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pagamento
        fields = [
            'conta_receber',
            'tipo_pagamento', 'forma_pagamento', 'status',
            'valor', 'valor_desconto',
            'data_pagamento',
            'numero_parcela', 'total_parcelas',
            'numero_cheque', 'banco_cheque', 'data_compensacao',
            'numero_documento', 'comprovante',
            'observacoes',
        ]

    def create(self, validated_data):
        validated_data['registrado_por'] = self.context['request'].user
        return super().create(validated_data)


class PagamentoParceladoSerializer(serializers.Serializer):
    """
    Serializer para criação de pagamentos parcelados.
    Cria múltiplos registros de pagamento de uma vez.
    """
    conta_receber = serializers.IntegerField()
    valor_total = serializers.DecimalField(max_digits=12, decimal_places=2)
    valor_desconto = serializers.DecimalField(max_digits=12, decimal_places=2, default=0)
    forma_pagamento = serializers.ChoiceField(choices=Pagamento.FORMA_PAGAMENTO_CHOICES)
    numero_parcelas = serializers.IntegerField(min_value=1, max_value=24)
    data_primeiro_pagamento = serializers.DateField()
    dias_entre_parcelas = serializers.IntegerField(default=30, min_value=1)
    observacoes = serializers.CharField(required=False, allow_blank=True)

    def validate_conta_receber(self, value):
        try:
            conta = ContaReceber.objects.get(id=value)
            if conta.status == 'PAGA':
                raise serializers.ValidationError("Esta conta já está paga.")
            if conta.status == 'CANCELADA':
                raise serializers.ValidationError("Esta conta está cancelada.")
            return value
        except ContaReceber.DoesNotExist:
            raise serializers.ValidationError("Conta a receber não encontrada.")

    def create(self, validated_data):
        from datetime import timedelta
        from decimal import Decimal

        conta_receber_id = validated_data['conta_receber']
        valor_total = validated_data['valor_total']
        valor_desconto = validated_data.get('valor_desconto', Decimal('0'))
        forma_pagamento = validated_data['forma_pagamento']
        numero_parcelas = validated_data['numero_parcelas']
        data_pagamento = validated_data['data_primeiro_pagamento']
        dias_entre = validated_data['dias_entre_parcelas']
        observacoes = validated_data.get('observacoes', '')
        user = self.context['request'].user

        # Calcular valor de cada parcela
        valor_liquido = valor_total - valor_desconto
        valor_parcela = valor_liquido / numero_parcelas
        desconto_por_parcela = valor_desconto / numero_parcelas

        pagamentos = []
        for i in range(1, numero_parcelas + 1):
            # Ajustar última parcela para compensar arredondamento
            if i == numero_parcelas:
                valor_parcela = valor_liquido - sum(p.valor - p.valor_desconto for p in pagamentos)
                desconto_por_parcela = valor_desconto - sum(p.valor_desconto for p in pagamentos)

            pagamento = Pagamento.objects.create(
                conta_receber_id=conta_receber_id,
                tipo_pagamento='PARCIAL',
                forma_pagamento=forma_pagamento,
                status='PENDENTE',  # Parcelas futuras ficam pendentes
                valor=valor_parcela + desconto_por_parcela,
                valor_desconto=desconto_por_parcela,
                data_pagamento=data_pagamento + timedelta(days=(i - 1) * dias_entre),
                numero_parcela=i,
                total_parcelas=numero_parcelas,
                observacoes=f"{observacoes}\nParcela {i}/{numero_parcelas}".strip(),
                registrado_por=user
            )
            pagamentos.append(pagamento)

        return pagamentos
