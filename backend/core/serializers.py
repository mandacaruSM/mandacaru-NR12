# backend/core/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Profile, Operador, Supervisor,
    OperadorCliente, OperadorEquipamento
)


# ============================================
# SERIALIZERS EXISTENTES (Me, Profile, etc)
# ============================================

class ProfileSerializer(serializers.Serializer):
    role = serializers.CharField()
    modules_enabled = serializers.ListField(child=serializers.CharField())


class MeSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    email = serializers.EmailField(allow_blank=True)
    profile = ProfileSerializer()


class OnboardingSerializer(serializers.Serializer):
    nome_completo = serializers.CharField()
    data_nascimento = serializers.CharField()  # DD/MM/AAAA
    chat_id = serializers.CharField()


# ============================================
# OPERADORES
# ============================================

class OperadorSerializer(serializers.ModelSerializer):
    """Serializer básico para lista"""
    clientes_nomes = serializers.SerializerMethodField()
    total_equipamentos = serializers.SerializerMethodField()
    total_checklists = serializers.SerializerMethodField()
    taxa_aprovacao = serializers.SerializerMethodField()
    telegram_vinculado = serializers.SerializerMethodField()
    
    class Meta:
        model = Operador
        fields = [
            'id', 'nome_completo', 'cpf', 'data_nascimento',
            'email', 'telefone', 'foto',
            'telegram_chat_id', 'telegram_username', 'telegram_vinculado_em',
            'telegram_vinculado', 'codigo_vinculacao', 'codigo_valido_ate',
            'logradouro', 'numero', 'complemento', 'bairro',
            'cidade', 'uf', 'cep',
            'ativo', 'criado_em', 'atualizado_em',
            'clientes_nomes', 'total_equipamentos',
            'total_checklists', 'taxa_aprovacao'
        ]
        read_only_fields = [
            'criado_em', 'atualizado_em', 'telegram_vinculado_em',
            'codigo_vinculacao', 'codigo_valido_ate'
        ]
    
    def get_clientes_nomes(self, obj):
        return [c.nome_razao for c in obj.clientes.all()]
    
    def get_total_equipamentos(self, obj):
        return obj.equipamentos_autorizados.count()
    
    def get_total_checklists(self, obj):
        return obj.total_checklists
    
    def get_taxa_aprovacao(self, obj):
        return obj.taxa_aprovacao
    
    def get_telegram_vinculado(self, obj):
        return obj.telegram_vinculado


class OperadorDetailSerializer(serializers.ModelSerializer):
    """Serializer detalhado com todos os relacionamentos"""
    clientes = serializers.SerializerMethodField()
    equipamentos_autorizados_detalhes = serializers.SerializerMethodField()
    checklists_recentes = serializers.SerializerMethodField()
    estatisticas = serializers.SerializerMethodField()
    telegram_vinculado = serializers.SerializerMethodField()
    
    class Meta:
        model = Operador
        fields = '__all__'
    
    def get_clientes(self, obj):
        # Evitar importação circular
        from cadastro.serializers import ClienteSerializer
        return ClienteSerializer(obj.clientes.all(), many=True).data
    
    def get_equipamentos_autorizados_detalhes(self, obj):
        from equipamentos.serializers import EquipamentoSerializer
        return EquipamentoSerializer(
            obj.equipamentos_autorizados.filter(ativo=True),
            many=True
        ).data
    
    def get_checklists_recentes(self, obj):
        from nr12.serializers import ChecklistRealizadoSerializer
        checklists = obj.checklists.all().order_by('-data_hora_inicio')[:10]
        return ChecklistRealizadoSerializer(checklists, many=True).data
    
    def get_estatisticas(self, obj):
        return {
            'total_checklists': obj.total_checklists,
            'taxa_aprovacao': obj.taxa_aprovacao,
            'total_equipamentos': obj.equipamentos_autorizados.count(),
            'total_clientes': obj.clientes.count()
        }
    
    def get_telegram_vinculado(self, obj):
        return obj.telegram_vinculado


class OperadorCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer para criar/atualizar operadores"""
    clientes_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Operador
        fields = [
            'nome_completo', 'cpf', 'data_nascimento',
            'email', 'telefone', 'foto',
            'logradouro', 'numero', 'complemento', 'bairro',
            'cidade', 'uf', 'cep',
            'ativo', 'clientes_ids'
        ]
    
    def create(self, validated_data):
        clientes_ids = validated_data.pop('clientes_ids', [])
        operador = Operador.objects.create(**validated_data)
        
        # Vincular clientes
        if clientes_ids:
            from cadastro.models import Cliente
            for cliente_id in clientes_ids:
                try:
                    cliente = Cliente.objects.get(id=cliente_id)
                    OperadorCliente.objects.create(
                        operador=operador,
                        cliente=cliente,
                        vinculado_por=self.context['request'].user
                    )
                except Cliente.DoesNotExist:
                    pass
        
        return operador
    
    def update(self, instance, validated_data):
        clientes_ids = validated_data.pop('clientes_ids', None)
        
        # Atualizar campos básicos
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Atualizar clientes se fornecido
        if clientes_ids is not None:
            # Remover vínculos antigos
            OperadorCliente.objects.filter(operador=instance).delete()
            
            # Criar novos vínculos
            from cadastro.models import Cliente
            for cliente_id in clientes_ids:
                try:
                    cliente = Cliente.objects.get(id=cliente_id)
                    OperadorCliente.objects.create(
                        operador=instance,
                        cliente=cliente,
                        vinculado_por=self.context['request'].user
                    )
                except Cliente.DoesNotExist:
                    pass
        
        return instance


# ============================================
# SUPERVISORES
# ============================================

class SupervisorSerializer(serializers.ModelSerializer):
    """Serializer básico para lista"""
    clientes_nomes = serializers.SerializerMethodField()
    total_operadores = serializers.SerializerMethodField()
    telegram_vinculado = serializers.SerializerMethodField()
    
    class Meta:
        model = Supervisor
        fields = [
            'id', 'nome_completo', 'cpf', 'data_nascimento',
            'email', 'telefone', 'foto',
            'telegram_chat_id', 'telegram_username', 'telegram_vinculado_em',
            'telegram_vinculado', 'codigo_vinculacao', 'codigo_valido_ate',
            'ativo', 'criado_em', 'atualizado_em',
            'clientes_nomes', 'total_operadores'
        ]
        read_only_fields = [
            'criado_em', 'atualizado_em', 'telegram_vinculado_em',
            'codigo_vinculacao', 'codigo_valido_ate'
        ]
    
    def get_clientes_nomes(self, obj):
        return [c.nome_razao for c in obj.clientes.all()]
    
    def get_total_operadores(self, obj):
        return obj.operadores_supervisionados.count()
    
    def get_telegram_vinculado(self, obj):
        return obj.telegram_vinculado


# ============================================
# RELACIONAMENTOS
# ============================================

class OperadorEquipamentoSerializer(serializers.ModelSerializer):
    """Serializer para autorização de equipamentos"""
    operador_nome = serializers.CharField(source='operador.nome_completo', read_only=True)
    equipamento_codigo = serializers.CharField(source='equipamento.codigo', read_only=True)
    equipamento_descricao = serializers.CharField(source='equipamento.descricao', read_only=True)
    autorizado_por_username = serializers.CharField(source='autorizado_por.username', read_only=True)
    esta_valido = serializers.SerializerMethodField()
    
    class Meta:
        model = OperadorEquipamento
        fields = '__all__'
    
    def get_esta_valido(self, obj):
        return obj.esta_valido()


class OperadorClienteSerializer(serializers.ModelSerializer):
    """Serializer para vínculo operador-cliente"""
    operador_nome = serializers.CharField(source='operador.nome_completo', read_only=True)
    cliente_nome = serializers.CharField(source='cliente.nome_razao', read_only=True)
    vinculado_por_username = serializers.CharField(source='vinculado_por.username', read_only=True)
    
    class Meta:
        model = OperadorCliente
        fields = '__all__'