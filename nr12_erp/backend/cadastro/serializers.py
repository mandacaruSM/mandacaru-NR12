from rest_framework import serializers
from .models import Cliente, Empreendimento

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

    class Meta:
        model = Cliente
        fields = "__all__"
        read_only_fields = ['uuid', 'qr_code', 'username', 'user']

    def get_username(self, obj):
        """Retorna username do usuário vinculado ou None"""
        if obj.user:
            return obj.user.username
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
    cliente_nome = serializers.CharField(source="cliente.nome_razao", read_only=True)
    supervisor_nome = serializers.CharField(source="supervisor.nome_completo", read_only=True)
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
