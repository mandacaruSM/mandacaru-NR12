# backend/nr12/serializers.py

from rest_framework import serializers
from .models import (
    ModeloChecklist, ItemChecklist,
    ChecklistRealizado, RespostaItemChecklist,
    NotificacaoChecklist
)


class ItemChecklistSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemChecklist
        fields = '__all__'


class ItemChecklistListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listagem"""
    class Meta:
        model = ItemChecklist
        fields = ['id', 'ordem', 'categoria', 'pergunta', 'tipo_resposta', 'obrigatorio']


class ModeloChecklistSerializer(serializers.ModelSerializer):
    tipo_equipamento_nome = serializers.CharField(
        source='tipo_equipamento.nome',
        read_only=True
    )
    total_itens = serializers.SerializerMethodField()

    class Meta:
        model = ModeloChecklist
        fields = '__all__'

    def get_total_itens(self, obj):
        return obj.itens.filter(ativo=True).count()


class ModeloChecklistDetailSerializer(serializers.ModelSerializer):
    """Serializer detalhado com itens inclusos"""
    tipo_equipamento_nome = serializers.CharField(
        source='tipo_equipamento.nome',
        read_only=True
    )
    itens = ItemChecklistSerializer(many=True, read_only=True)

    class Meta:
        model = ModeloChecklist
        fields = '__all__'


class RespostaItemChecklistSerializer(serializers.ModelSerializer):
    item_pergunta = serializers.CharField(source='item.pergunta', read_only=True)
    item_categoria = serializers.CharField(source='item.categoria', read_only=True)

    class Meta:
        model = RespostaItemChecklist
        fields = '__all__'

    def validate(self, data):
        """Valida se observação é obrigatória para não conformidades"""
        item = data.get('item')
        resposta = data.get('resposta')
        observacao = data.get('observacao', '')

        if item and item.requer_observacao_nao_conforme:
            if resposta in ['NAO_CONFORME', 'NAO'] and not observacao:
                raise serializers.ValidationError({
                    'observacao': 'Observação é obrigatória para itens não conformes.'
                })

        return data


class ChecklistRealizadoSerializer(serializers.ModelSerializer):
    modelo_nome = serializers.CharField(source='modelo.nome', read_only=True)
    equipamento_codigo = serializers.CharField(source='equipamento.codigo', read_only=True)
    equipamento_descricao = serializers.CharField(source='equipamento.descricao', read_only=True)
    operador_nome = serializers.CharField(source='operador.nome_completo', read_only=True)
    total_respostas = serializers.SerializerMethodField()
    total_nao_conformidades = serializers.SerializerMethodField()

    class Meta:
        model = ChecklistRealizado
        fields = '__all__'

    def get_total_respostas(self, obj):
        return obj.respostas.count()

    def get_total_nao_conformidades(self, obj):
        return obj.respostas.filter(resposta__in=['NAO_CONFORME', 'NAO']).count()


class ChecklistRealizadoDetailSerializer(serializers.ModelSerializer):
    """Serializer detalhado com todas as respostas"""
    modelo_nome = serializers.CharField(source='modelo.nome', read_only=True)
    equipamento_codigo = serializers.CharField(source='equipamento.codigo', read_only=True)
    equipamento_descricao = serializers.CharField(source='equipamento.descricao', read_only=True)
    operador_nome = serializers.CharField(source='operador.nome_completo', read_only=True)
    respostas = RespostaItemChecklistSerializer(many=True, read_only=True)
    total_nao_conformidades = serializers.SerializerMethodField()

    class Meta:
        model = ChecklistRealizado
        fields = '__all__'

    def get_total_nao_conformidades(self, obj):
        return obj.respostas.filter(resposta__in=['NAO_CONFORME', 'NAO']).count()


class ChecklistRealizadoCreateSerializer(serializers.ModelSerializer):
    """Serializer para criação de checklist (usado pelo bot)"""
    respostas = RespostaItemChecklistSerializer(many=True, required=False)

    class Meta:
        model = ChecklistRealizado
        fields = [
            'modelo', 'equipamento', 'operador', 'usuario',
            'origem', 'leitura_equipamento', 'observacoes_gerais',
            'respostas'
        ]

    def create(self, validated_data):
        respostas_data = validated_data.pop('respostas', [])
        checklist = ChecklistRealizado.objects.create(**validated_data)

        # Criar respostas
        for resposta_data in respostas_data:
            RespostaItemChecklist.objects.create(
                checklist=checklist,
                **resposta_data
            )

        # Se todas as respostas foram fornecidas, finalizar automaticamente
        total_itens = checklist.modelo.itens.filter(ativo=True).count()
        if len(respostas_data) == total_itens:
            checklist.finalizar()

        return checklist


class NotificacaoChecklistSerializer(serializers.ModelSerializer):
    destinatario_username = serializers.CharField(
        source='destinatario.username',
        read_only=True
    )
    checklist_equipamento = serializers.CharField(
        source='checklist.equipamento.codigo',
        read_only=True
    )

    class Meta:
        model = NotificacaoChecklist
        fields = '__all__'


# ============================================
# SERIALIZERS ESPECÍFICOS PARA O BOT
# ============================================

class BotModeloChecklistSerializer(serializers.ModelSerializer):
    """Serializer simplificado para o bot"""
    tipo_equipamento_nome = serializers.CharField(source='tipo_equipamento.nome')
    total_itens = serializers.SerializerMethodField()

    class Meta:
        model = ModeloChecklist
        fields = ['id', 'nome', 'tipo_equipamento_nome', 'total_itens']

    def get_total_itens(self, obj):
        return obj.itens.filter(ativo=True).count()


class BotItemChecklistSerializer(serializers.ModelSerializer):
    """Serializer simplificado de item para o bot"""
    class Meta:
        model = ItemChecklist
        fields = [
            'id', 'ordem', 'categoria', 'pergunta',
            'descricao_ajuda', 'tipo_resposta',
            'obrigatorio', 'requer_observacao_nao_conforme'
        ]


class BotChecklistIniciarSerializer(serializers.Serializer):
    """Serializer para iniciar checklist via bot"""
    modelo_id = serializers.IntegerField()
    equipamento_id = serializers.IntegerField()
    operador_id = serializers.IntegerField()
    leitura_equipamento = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        required=False,
        allow_null=True
    )

    def validate_modelo_id(self, value):
        if not ModeloChecklist.objects.filter(id=value, ativo=True).exists():
            raise serializers.ValidationError("Modelo de checklist não encontrado ou inativo.")
        return value

    def validate_equipamento_id(self, value):
        from equipamentos.models import Equipamento
        if not Equipamento.objects.filter(id=value, ativo=True).exists():
            raise serializers.ValidationError("Equipamento não encontrado ou inativo.")
        return value

    def validate_operador_id(self, value):
        from core.models import Operador
        if not Operador.objects.filter(id=value, ativo=True).exists():
            raise serializers.ValidationError("Operador não encontrado ou inativo.")
        return value


class BotRespostaSerializer(serializers.Serializer):
    """Serializer para registrar resposta via bot"""
    checklist_id = serializers.IntegerField()
    item_id = serializers.IntegerField()
    resposta = serializers.ChoiceField(
        choices=['CONFORME', 'NAO_CONFORME', 'SIM', 'NAO', 'NA'],
        required=False,
        allow_null=True
    )
    valor_numerico = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True
    )
    valor_texto = serializers.CharField(required=False, allow_blank=True)
    observacao = serializers.CharField(required=False, allow_blank=True)

    def validate_checklist_id(self, value):
        if not ChecklistRealizado.objects.filter(id=value, status='EM_ANDAMENTO').exists():
            raise serializers.ValidationError("Checklist não encontrado ou já finalizado.")
        return value

    def validate_item_id(self, value):
        if not ItemChecklist.objects.filter(id=value, ativo=True).exists():
            raise serializers.ValidationError("Item não encontrado ou inativo.")
        return value

    def validate(self, data):
        """Valida se já existe resposta para este item"""
        checklist_id = data.get('checklist_id')
        item_id = data.get('item_id')

        if RespostaItemChecklist.objects.filter(
            checklist_id=checklist_id,
            item_id=item_id
        ).exists():
            raise serializers.ValidationError("Já existe resposta para este item.")

        # Valida se observação é obrigatória
        item = ItemChecklist.objects.get(id=item_id)
        resposta = data.get('resposta')
        observacao = data.get('observacao', '')

        if item.requer_observacao_nao_conforme:
            if resposta in ['NAO_CONFORME', 'NAO'] and not observacao:
                raise serializers.ValidationError({
                    'observacao': 'Observação é obrigatória para itens não conformes.'
                })

        return data


class BotChecklistFinalizarSerializer(serializers.Serializer):
    """Serializer para finalizar checklist via bot"""
    checklist_id = serializers.IntegerField()
    observacoes_gerais = serializers.CharField(required=False, allow_blank=True)

    def validate_checklist_id(self, value):
        try:
            checklist = ChecklistRealizado.objects.get(id=value, status='EM_ANDAMENTO')
        except ChecklistRealizado.DoesNotExist:
            raise serializers.ValidationError("Checklist não encontrado ou já finalizado.")

        # Verificar se todos os itens obrigatórios foram respondidos
        total_itens_obrigatorios = checklist.modelo.itens.filter(
            ativo=True,
            obrigatorio=True
        ).count()
        total_respostas = checklist.respostas.count()

        if total_respostas < total_itens_obrigatorios:
            raise serializers.ValidationError(
                f"Checklist incompleto. Faltam {total_itens_obrigatorios - total_respostas} itens obrigatórios."
            )

        return value