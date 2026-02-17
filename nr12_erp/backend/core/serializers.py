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
    # Campo write-only para permitir que admin defina nova senha
    nova_senha = serializers.CharField(
        write_only=True,
        required=False,
        min_length=6,
        help_text="Nova senha para o usuário do operador (mínimo 6 caracteres). Apenas administradores podem definir."
    )
    clientes_nomes = serializers.SerializerMethodField()
    empreendimentos_nomes = serializers.SerializerMethodField()
    total_equipamentos = serializers.SerializerMethodField()
    total_checklists = serializers.SerializerMethodField()
    taxa_aprovacao = serializers.SerializerMethodField()
    telegram_vinculado = serializers.SerializerMethodField()
    user_username = serializers.CharField(source='user.username', read_only=True, allow_null=True)
    # Campos NR12 computados
    nr12_status = serializers.ReadOnlyField()
    nr12_dias_para_vencer = serializers.ReadOnlyField()
    nr12_pode_operar = serializers.ReadOnlyField()
    clientes_ids = serializers.PrimaryKeyRelatedField(
        queryset=__import__('cadastro.models', fromlist=['Cliente']).Cliente.objects.all(),
        many=True,
        write_only=True,
        required=False,
        source='clientes'
    )
    empreendimentos_ids = serializers.PrimaryKeyRelatedField(
        queryset=__import__('cadastro.models', fromlist=['Empreendimento']).Empreendimento.objects.all(),
        many=True,
        write_only=True,
        required=False,
        source='empreendimentos_vinculados'
    )

    class Meta:
        model = Operador
        fields = [
            'id', 'nome_completo', 'cpf', 'data_nascimento',
            'email', 'telefone', 'foto',
            'funcao', 'matricula',  # Dados profissionais
            'telegram_chat_id', 'telegram_username', 'telegram_vinculado_em',
            'telegram_vinculado', 'codigo_vinculacao', 'codigo_valido_ate',
            'logradouro', 'numero', 'complemento', 'bairro',
            'cidade', 'uf', 'cep',
            # Conformidade NR12
            'nr12_curso_data_conclusao', 'nr12_curso_carga_horaria',
            'nr12_entidade_formadora', 'nr12_certificado',
            'nr12_reciclagem_vencimento', 'nr12_reciclagem_certificado',
            'nr12_status', 'nr12_dias_para_vencer', 'nr12_pode_operar',
            # Status e relacionamentos
            'ativo', 'criado_em', 'atualizado_em',
            'clientes_nomes', 'empreendimentos_nomes', 'total_equipamentos',
            'total_checklists', 'taxa_aprovacao', 'clientes_ids', 'empreendimentos_ids',
            'user_username', 'nova_senha'
        ]
        read_only_fields = [
            'criado_em', 'atualizado_em', 'telegram_vinculado_em',
            'codigo_vinculacao', 'codigo_valido_ate', 'telegram_vinculado',
            'nr12_status', 'nr12_dias_para_vencer', 'nr12_pode_operar'
        ]

    def get_clientes_nomes(self, obj):
        return [c.nome_razao for c in obj.clientes.all()]

    def get_empreendimentos_nomes(self, obj):
        return [e.nome for e in obj.empreendimentos_vinculados.all()]

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
        empreendimentos_data = validated_data.pop('empreendimentos_vinculados', [])
        operador = Operador.objects.create(**validated_data)
        operador.criado_por = self.context['request'].user

        # Vincular clientes
        for cliente in clientes_data:
            OperadorCliente.objects.create(
                operador=operador,
                cliente=cliente,
                vinculado_por=self.context['request'].user
            )

        # Vincular empreendimentos
        for empreendimento in empreendimentos_data:
            operador.empreendimentos_vinculados.add(empreendimento)

        operador.save()
        return operador

    def update(self, instance, validated_data):
        # Extrai nova_senha dos dados validados
        nova_senha = validated_data.pop('nova_senha', None)
        clientes_data = validated_data.pop('clientes', None)
        empreendimentos_data = validated_data.pop('empreendimentos_vinculados', None)

        # Atualizar campos básicos
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Se nova_senha foi fornecida, atualiza ou cria o usuário
        if nova_senha:
            if instance.user:
                # Usuário já existe, apenas atualiza a senha
                instance.user.set_password(nova_senha)
                instance.user.save()
                print(f"[SENHA ALTERADA] Operador: {instance.nome_completo} | Username: {instance.user.username} | Nova senha definida pelo admin")
            else:
                # Usuário não existe, criar automaticamente
                cpf_limpo = ''.join(c for c in (instance.cpf or '') if c.isdigit())
                if cpf_limpo:
                    from .models import Profile
                    if User.objects.filter(username=cpf_limpo).exists():
                        user = User.objects.get(username=cpf_limpo)
                    else:
                        user = User.objects.create_user(
                            username=cpf_limpo,
                            password=nova_senha,
                            email=instance.email or '',
                            first_name=instance.nome_completo[:30] if instance.nome_completo else '',
                        )
                        Profile.objects.create(
                            user=user,
                            role='OPERADOR',
                            modules_enabled=['dashboard', 'equipamentos', 'nr12', 'abastecimentos']
                        )
                    instance.user = user
                    instance.user.set_password(nova_senha)
                    instance.user.save()
                    instance.save()
                    print(f"[USUÁRIO CRIADO] Operador: {instance.nome_completo} | Username: {instance.user.username}")

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

        # Atualizar empreendimentos se fornecido
        if empreendimentos_data is not None:
            instance.empreendimentos_vinculados.clear()
            for empreendimento in empreendimentos_data:
                instance.empreendimentos_vinculados.add(empreendimento)

        return instance


class OperadorDetailSerializer(serializers.ModelSerializer):
    """Serializer detalhado com todos os relacionamentos"""
    clientes = serializers.SerializerMethodField()
    equipamentos_autorizados_detalhes = serializers.SerializerMethodField()
    telegram_vinculado = serializers.SerializerMethodField()
    estatisticas = serializers.SerializerMethodField()
    user_username = serializers.CharField(source='user.username', read_only=True, allow_null=True)
    
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
    # Campo write-only para permitir que admin defina nova senha
    nova_senha = serializers.CharField(
        write_only=True,
        required=False,
        min_length=6,
        help_text="Nova senha para o usuário do supervisor (mínimo 6 caracteres). Apenas administradores podem definir."
    )
    clientes_nomes = serializers.SerializerMethodField()
    empreendimentos_nomes = serializers.SerializerMethodField()
    total_operadores = serializers.SerializerMethodField()
    telegram_vinculado = serializers.SerializerMethodField()
    clientes_ids = serializers.PrimaryKeyRelatedField(
        queryset=__import__('cadastro.models', fromlist=['Cliente']).Cliente.objects.all(),
        many=True,
        write_only=True,
        required=False,
        source='clientes'
    )
    empreendimentos_ids = serializers.PrimaryKeyRelatedField(
        queryset=__import__('cadastro.models', fromlist=['Empreendimento']).Empreendimento.objects.all(),
        many=True,
        write_only=True,
        required=False,
        source='empreendimentos_vinculados'
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
            'clientes_nomes', 'empreendimentos_nomes', 'total_operadores', 'clientes_ids', 'empreendimentos_ids',
            'nova_senha', 'user_username'
        ]
        read_only_fields = [
            'criado_em', 'atualizado_em', 'telegram_vinculado_em',
            'codigo_vinculacao', 'codigo_valido_ate', 'telegram_vinculado'
        ]

    user_username = serializers.CharField(source='user.username', read_only=True, allow_null=True)

    def get_clientes_nomes(self, obj):
        return [c.nome_razao for c in obj.clientes.all()]

    def get_empreendimentos_nomes(self, obj):
        return [e.nome for e in obj.empreendimentos_vinculados.all()]

    def get_total_operadores(self, obj):
        return obj.operadores_supervisionados.count()

    def get_telegram_vinculado(self, obj):
        return obj.telegram_vinculado

    def create(self, validated_data):
        clientes_data = validated_data.pop('clientes', [])
        empreendimentos_data = validated_data.pop('empreendimentos_vinculados', [])
        supervisor = Supervisor.objects.create(**validated_data)
        supervisor.criado_por = self.context['request'].user

        # Vincular clientes
        for cliente in clientes_data:
            supervisor.clientes.add(cliente)

        # Vincular empreendimentos
        for empreendimento in empreendimentos_data:
            supervisor.empreendimentos_vinculados.add(empreendimento)

        supervisor.save()
        return supervisor

    def update(self, instance, validated_data):
        # Extrai nova_senha dos dados validados
        nova_senha = validated_data.pop('nova_senha', None)
        clientes_data = validated_data.pop('clientes', None)
        empreendimentos_data = validated_data.pop('empreendimentos_vinculados', None)

        # Atualizar campos básicos
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Se nova_senha foi fornecida, atualiza ou cria o usuário
        if nova_senha:
            if instance.user:
                # Usuário já existe, apenas atualiza a senha
                instance.user.set_password(nova_senha)
                instance.user.save()
                print(f"[SENHA ALTERADA] Supervisor: {instance.nome_completo} | Username: {instance.user.username} | Nova senha definida pelo admin")
            else:
                # Usuário não existe, criar automaticamente
                cpf_limpo = ''.join(c for c in (instance.cpf or '') if c.isdigit())
                if cpf_limpo:
                    from .models import Profile
                    if User.objects.filter(username=cpf_limpo).exists():
                        user = User.objects.get(username=cpf_limpo)
                    else:
                        user = User.objects.create_user(
                            username=cpf_limpo,
                            password=nova_senha,
                            email=instance.email or '',
                            first_name=instance.nome_completo[:30] if instance.nome_completo else '',
                        )
                        Profile.objects.create(
                            user=user,
                            role='SUPERVISOR',
                            modules_enabled=['dashboard', 'clientes', 'empreendimentos', 'equipamentos', 'operadores', 'nr12', 'abastecimentos', 'manutencoes']
                        )
                    instance.user = user
                    instance.user.set_password(nova_senha)
                    instance.user.save()
                    instance.save()
                    print(f"[USUÁRIO CRIADO] Supervisor: {instance.nome_completo} | Username: {instance.user.username}")

        # Atualizar clientes se fornecido
        if clientes_data is not None:
            instance.clientes.clear()
            for cliente in clientes_data:
                instance.clientes.add(cliente)

        # Atualizar empreendimentos se fornecido
        if empreendimentos_data is not None:
            instance.empreendimentos_vinculados.clear()
            for empreendimento in empreendimentos_data:
                instance.empreendimentos_vinculados.add(empreendimento)

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