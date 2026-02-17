from rest_framework import serializers
from .models import Tecnico
from cadastro.models import Cliente, Empreendimento

class TecnicoSerializer(serializers.ModelSerializer):
    # Campo write-only para permitir que admin defina nova senha
    nova_senha = serializers.CharField(
        write_only=True,
        required=False,
        min_length=6,
        help_text="Nova senha para o usuário do técnico (mínimo 6 caracteres). Apenas administradores podem definir."
    )
    clientes_nomes = serializers.SerializerMethodField()
    empreendimentos_nomes = serializers.SerializerMethodField()
    telegram_vinculado = serializers.SerializerMethodField()
    user_username = serializers.SerializerMethodField()
    clientes_ids = serializers.PrimaryKeyRelatedField(
        queryset=Cliente.objects.all(),
        many=True,
        write_only=True,
        required=False,
        source='clientes'
    )
    empreendimentos_ids = serializers.PrimaryKeyRelatedField(
        queryset=Empreendimento.objects.all(),
        many=True,
        write_only=True,
        required=False,
        source='empreendimentos_vinculados'
    )

    class Meta:
        model = Tecnico
        fields = [
            "id",
            "nome",
            "nome_completo",
            "cpf",
            "rg",
            "data_nascimento",
            "foto",
            "email",
            "telefone",
            "telefone_emergencia",
            "telegram_chat_id",
            "telegram_username",
            "telegram_vinculado_em",
            "telegram_vinculado",
            "codigo_vinculacao",
            "codigo_valido_ate",
            "logradouro",
            "numero",
            "complemento",
            "bairro",
            "cidade",
            "uf",
            "cep",
            "especialidade",
            "nivel_experiencia",
            "numero_cnh",
            "categoria_cnh",
            "validade_cnh",
            "certificacoes",
            "cursos_treinamentos",
            "documento_cnh",
            "documento_certificados",
            "observacoes",
            "ativo",
            "created_at",
            "updated_at",
            "clientes_nomes",
            "empreendimentos_nomes",
            "clientes_ids",
            "empreendimentos_ids",
            "nova_senha",
            "user_username"
        ]
        read_only_fields = [
            "id", "created_at", "updated_at",
            "telegram_vinculado_em", "codigo_vinculacao", "codigo_valido_ate", "telegram_vinculado",
            "user_username"
        ]

    def get_clientes_nomes(self, obj):
        return [c.nome_razao for c in obj.clientes.all()]

    def get_empreendimentos_nomes(self, obj):
        return [e.nome for e in obj.empreendimentos_vinculados.all()]

    def get_telegram_vinculado(self, obj):
        return bool(obj.telegram_chat_id)

    def get_user_username(self, obj):
        if hasattr(obj, 'user') and obj.user:
            return obj.user.username
        return None

    def create(self, validated_data):
        clientes_data = validated_data.pop('clientes', [])
        empreendimentos_data = validated_data.pop('empreendimentos_vinculados', [])
        tecnico = Tecnico.objects.create(**validated_data)

        # Vincular clientes
        for cliente in clientes_data:
            tecnico.clientes.add(cliente)

        # Vincular empreendimentos
        for empreendimento in empreendimentos_data:
            tecnico.empreendimentos_vinculados.add(empreendimento)

        tecnico.save()
        return tecnico

    def update(self, instance, validated_data):
        # Extrai nova_senha dos dados validados
        nova_senha = validated_data.pop('nova_senha', None)
        clientes_data = validated_data.pop('clientes', None)
        empreendimentos_data = validated_data.pop('empreendimentos_vinculados', None)

        # Atualizar campos básicos
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Se nova_senha foi fornecida e o usuário existe, atualiza a senha
        if nova_senha and hasattr(instance, 'user') and instance.user:
            instance.user.set_password(nova_senha)
            instance.user.save()
            print(f"[SENHA ALTERADA] Técnico: {instance.nome_completo} | Username: {instance.user.username} | Nova senha definida pelo admin")

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
