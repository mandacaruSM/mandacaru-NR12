from rest_framework import serializers
from .models import Cliente, Empreendimento
from .planos import Plano, AssinaturaCliente

class ClienteSerializer(serializers.ModelSerializer):
    # Campo write-only para permitir que admin defina nova senha
    nova_senha = serializers.CharField(
        write_only=True,
        required=False,
        min_length=6,
        help_text="Nova senha para o usuário do cliente (mínimo 6 caracteres). Apenas administradores podem definir."
    )

    # Campo read-only para mostrar o username do cliente
    username = serializers.SerializerMethodField(read_only=True)

    # Campos read-only para informações do plano
    plano_nome = serializers.SerializerMethodField(read_only=True)
    plano_tipo = serializers.SerializerMethodField(read_only=True)
    assinatura_status = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Cliente
        fields = "__all__"
        read_only_fields = ['uuid', 'qr_code', 'username', 'user', 'plano_nome', 'plano_tipo', 'assinatura_status']

    def get_username(self, obj):
        """Retorna username do usuário vinculado ou None"""
        if obj.user:
            return obj.user.username
        return None

    def get_plano_nome(self, obj):
        """Retorna nome do plano da assinatura ou None"""
        if hasattr(obj, 'assinatura') and obj.assinatura:
            return obj.assinatura.plano.nome
        return None

    def get_plano_tipo(self, obj):
        """Retorna tipo do plano da assinatura ou None"""
        if hasattr(obj, 'assinatura') and obj.assinatura:
            return obj.assinatura.plano.tipo
        return None

    def get_assinatura_status(self, obj):
        """Retorna status da assinatura ou None"""
        if hasattr(obj, 'assinatura') and obj.assinatura:
            return obj.assinatura.status
        return None

    def update(self, instance, validated_data):
        # Extrai nova_senha dos dados validados
        nova_senha = validated_data.pop('nova_senha', None)

        # Atualiza campos do Cliente
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Se nova_senha foi fornecida e o usuário existe, atualiza a senha
        if nova_senha and hasattr(instance, 'user') and instance.user:
            instance.user.set_password(nova_senha)
            instance.user.save()

            # Log da alteração de senha
            print(f"[SENHA ALTERADA] Cliente: {instance.nome_razao} | Username: {instance.user.username} | Nova senha definida pelo admin")

        return instance

class EmpreendimentoSerializer(serializers.ModelSerializer):
    # Mudança para tornar o nome do cliente seguro contra nulos também
    cliente_nome = serializers.SerializerMethodField(read_only=True)
    supervisor_nome = serializers.SerializerMethodField(read_only=True)
    link_google_maps = serializers.SerializerMethodField(read_only=True)

    def get_cliente_nome(self, obj):
        return obj.cliente.nome_razao if obj.cliente else "Cliente não definido"

    def get_supervisor_nome(self, obj):
        if obj.supervisor:
            return obj.supervisor.nome_completo
        return None

    def get_link_google_maps(self, obj):
        if obj.latitude and obj.longitude:
            return f"https://www.google.com/maps?q={obj.latitude},{obj.longitude}"
        return None
    tecnicos_vinculados_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        read_only=True,
        source='tecnicos_vinculados'
    )
    tecnicos_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = Empreendimento
        fields = "__all__"
        read_only_fields = ['uuid', 'qr_code', 'tecnicos_vinculados_ids']

    def create(self, validated_data):
        tecnicos_ids = validated_data.pop('tecnicos_ids', [])
        empreendimento = Empreendimento.objects.create(**validated_data)

        # Vincular técnicos
        if tecnicos_ids:
            from tecnicos.models import Tecnico
            for tecnico_id in tecnicos_ids:
                try:
                    tecnico = Tecnico.objects.get(id=tecnico_id)
                    tecnico.empreendimentos_vinculados.add(empreendimento)
                except Tecnico.DoesNotExist:
                    pass

        return empreendimento

    def update(self, instance, validated_data):
        tecnicos_ids = validated_data.pop('tecnicos_ids', None)

        # Atualizar campos básicos
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Atualizar técnicos se fornecido
        if tecnicos_ids is not None:
            from tecnicos.models import Tecnico
            # Remover vínculos antigos
            for tecnico in instance.tecnicos_vinculados.all():
                tecnico.empreendimentos_vinculados.remove(instance)

            # Adicionar novos vínculos
            for tecnico_id in tecnicos_ids:
                try:
                    tecnico = Tecnico.objects.get(id=tecnico_id)
                    tecnico.empreendimentos_vinculados.add(instance)
                except Tecnico.DoesNotExist:
                    pass

        return instance


class PlanoSerializer(serializers.ModelSerializer):
    """Serializer para visualização de planos"""
    features_resumo = serializers.ReadOnlyField()

    class Meta:
        model = Plano
        fields = [
            'id', 'nome', 'tipo', 'descricao', 'valor_mensal',
            'limite_usuarios', 'limite_equipamentos', 'limite_empreendimentos',
            'modulos_habilitados', 'features_resumo',
            'bot_telegram', 'qr_code_equipamento', 'checklist_mobile',
            'backups_automaticos', 'suporte_prioritario', 'suporte_whatsapp',
            'multiempresa', 'customizacoes', 'hospedagem_dedicada',
            'ativo', 'ordem'
        ]
        read_only_fields = ['features_resumo']


class AssinaturaClienteSerializer(serializers.ModelSerializer):
    """Serializer para assinaturas de clientes"""
    plano_nome = serializers.CharField(source='plano.nome', read_only=True)
    plano_valor = serializers.DecimalField(source='plano.valor_mensal', max_digits=10, decimal_places=2, read_only=True)
    cliente_nome = serializers.CharField(source='cliente.nome_razao', read_only=True)
    esta_ativa = serializers.ReadOnlyField()

    class Meta:
        model = AssinaturaCliente
        fields = [
            'id', 'cliente', 'cliente_nome', 'plano', 'plano_nome', 'plano_valor',
            'status', 'esta_ativa', 'data_inicio', 'data_fim_trial',
            'data_proximo_pagamento', 'data_cancelamento', 'observacoes',
            'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['esta_ativa', 'criado_em', 'atualizado_em']
