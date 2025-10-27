# backend/core/serializers.py - Atualização dos Serializers

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
    """Serializer básico para lista e criação"""
    clientes_nomes = serializers.SerializerMethodField()
    total_equipamentos = serializers.SerializerMethodField()
    total_checklists = serializers.SerializerMethodField()
    taxa_aprovacao = serializers.SerializerMethodField()
    telegram_vinculado = serializers.SerializerMethodField()
    clientes_ids = serializers.PrimaryKeyRelatedField(
        queryset=__import__('cadastro.models', fromlist=['Cliente']).Cliente.objects.all(),
        many=True,
        write_only=True,
        required=False,
        source='clientes'
    )
    
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
            'total_checklists', 'taxa_aprovacao', 'clientes_ids'
        ]
        read_only_fields = [
            'criado_em', 'atualizado_em', 'telegram_vinculado_em',
            'codigo_vinculacao', 'codigo_valido_ate', 'telegram_vinculado'
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
    
    def create(self, validated_data):
        clientes_data = validated_data.pop('clientes', [])
        operador = Operador.objects.create(**validated_data)
        operador.criado_por = self.context['request'].user
        
        # Vincular clientes
        for cliente in clientes_data:
            OperadorCliente.objects.create(
                operador=operador,
                cliente=cliente,
                vinculado_por=self.context['request'].user
            )
        
        operador.save()
        return operador
    
    def update(self, instance, validated_data):
        clientes_data = validated_data.pop('clientes', None)
        
        # Atualizar campos básicos
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Atualizar clientes se fornecido
        if clientes_data is not None:
            # Remover vínculos antigos
            OperadorCliente.objects.filter(operador=instance).delete()
            
            # Criar novos vínculos
            for cliente in clientes_data:
                OperadorCliente.objects.create(
                    operador=instance,
                    cliente=cliente,
                    vinculado_por=self.context['request'].user
                )
        
        return instance


class OperadorDetailSerializer(serializers.ModelSerializer):
    """Serializer detalhado com todos os relacionamentos"""
    clientes = serializers.SerializerMethodField()
    equipamentos_autorizados_detalhes = serializers.SerializerMethodField()
    telegram_vinculado = serializers.SerializerMethodField()
    estatisticas = serializers.SerializerMethodField()
    
    class Meta:
        model = Operador
        fields = '__all__'
    
    def get_clientes(self, obj):
        from cadastro.serializers import ClienteSerializer
        return ClienteSerializer(obj.clientes.all(), many=True).data
    
    def get_equipamentos_autorizados_detalhes(self, obj):
        from equipamentos.serializers import EquipamentoSerializer
        return EquipamentoSerializer(
            obj.equipamentos_autorizados.filter(ativo=True),
            many=True
        ).data
    
    def get_telegram_vinculado(self, obj):
        return obj.telegram_vinculado
    
    def get_estatisticas(self, obj):
        return {
            'total_checklists': obj.total_checklists,
            'taxa_aprovacao': obj.taxa_aprovacao,
            'checklists_aprovados': obj.checklists.filter(
                resultado_geral='APROVADO'
            ).count(),
            'checklists_reprovados': obj.checklists.filter(
                resultado_geral='REPROVADO'
            ).count(),
        }


# ============================================
# SUPERVISORES
# ============================================

class SupervisorSerializer(serializers.ModelSerializer):
    """Serializer básico para lista e criação"""
    clientes_nomes = serializers.SerializerMethodField()
    total_operadores = serializers.SerializerMethodField()
    telegram_vinculado = serializers.SerializerMethodField()
    clientes_ids = serializers.PrimaryKeyRelatedField(
        queryset=__import__('cadastro.models', fromlist=['Cliente']).Cliente.objects.all(),
        many=True,
        write_only=True,
        required=False,
        source='clientes'
    )
    
    class Meta:
        model = Supervisor
        fields = [
            'id', 'nome_completo', 'cpf', 'data_nascimento',
            'email', 'telefone', 'foto',
            'telegram_chat_id', 'telegram_username', 'telegram_vinculado_em',
            'telegram_vinculado', 'codigo_vinculacao', 'codigo_valido_ate',
            'logradouro', 'numero', 'complemento', 'bairro',
            'cidade', 'uf', 'cep',
            'ativo', 'criado_em', 'atualizado_em',
            'clientes_nomes', 'total_operadores', 'clientes_ids'
        ]
        read_only_fields = [
            'criado_em', 'atualizado_em', 'telegram_vinculado_em',
            'codigo_vinculacao', 'codigo_valido_ate', 'telegram_vinculado'
        ]
    
    def get_clientes_nomes(self, obj):
        return [c.nome_razao for c in obj.clientes.all()]
    
    def get_total_operadores(self, obj):
        return obj.operadores_supervisionados.count()
    
    def get_telegram_vinculado(self, obj):
        return obj.telegram_vinculado
    
    def create(self, validated_data):
        clientes_data = validated_data.pop('clientes', [])
        supervisor = Supervisor.objects.create(**validated_data)
        supervisor.criado_por = self.context['request'].user
        
        # Vincular clientes
        for cliente in clientes_data:
            supervisor.clientes.add(cliente)
        
        supervisor.save()
        return supervisor
    
    def update(self, instance, validated_data):
        clientes_data = validated_data.pop('clientes', None)
        
        # Atualizar campos básicos
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Atualizar clientes se fornecido
        if clientes_data is not None:
            instance.clientes.clear()
            for cliente in clientes_data:
                instance.clientes.add(cliente)
        
        return instance


class SupervisorDetailSerializer(serializers.ModelSerializer):
    """Serializer detalhado com todos os relacionamentos"""
    clientes = serializers.SerializerMethodField()
    operadores_supervisionados_detalhes = serializers.SerializerMethodField()
    telegram_vinculado = serializers.SerializerMethodField()
    
    class Meta:
        model = Supervisor
        fields = '__all__'
    
    def get_clientes(self, obj):
        from cadastro.serializers import ClienteSerializer
        return ClienteSerializer(obj.clientes.all(), many=True).data
    
    def get_operadores_supervisionados_detalhes(self, obj):
        return OperadorSerializer(
            obj.operadores_supervisionados.filter(ativo=True),
            many=True
        ).data
    
    def get_telegram_vinculado(self, obj):
        return obj.telegram_vinculado


# ============================================
# RELACIONAMENTOS
# ============================================

def _somente_digitos(s: str) -> str:
    return "".join(ch for ch in s or "" if ch.isdigit())

class OperadorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Operador
        fields = "__all__"

    def validate_cpf(self, value):
        cpf = _somente_digitos(value)
        if len(cpf) != 11:
            raise serializers.ValidationError("CPF inválido (11 dígitos).")
        return value

class SupervisorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supervisor
        fields = "__all__"

    def validate_cpf(self, value):
        cpf = _somente_digitos(value)
        if len(cpf) != 11:
            raise serializers.ValidationError("CPF inválido (11 dígitos).")
        return value

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