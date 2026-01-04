from rest_framework import serializers
from .models import Cliente, Empreendimento

class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = "__all__"
        read_only_fields = ['uuid', 'qr_code']

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
