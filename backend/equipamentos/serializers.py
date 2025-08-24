from rest_framework import serializers
from .models import TipoEquipamento, Equipamento, PlanoManutencaoItem, MedicaoEquipamento

class TipoEquipamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoEquipamento
        fields = "__all__"

class EquipamentoSerializer(serializers.ModelSerializer):
    cliente_nome = serializers.CharField(source="cliente.nome_razao", read_only=True)
    empreendimento_nome = serializers.CharField(source="empreendimento.nome", read_only=True)
    tipo_nome = serializers.CharField(source="tipo.nome", read_only=True)

    class Meta:
        model = Equipamento
        fields = "__all__"

    def validate(self, data):
        # garante coerência: empreendimento pertence ao cliente
        emp = data.get("empreendimento") or getattr(self.instance, "empreendimento", None)
        cli = data.get("cliente") or getattr(self.instance, "cliente", None)
        if emp and cli and emp.cliente_id != cli.id:
            raise serializers.ValidationError("Empreendimento não pertence ao Cliente informado.")
        # coerência de tipo_medicao com leitura
        return data

class PlanoManutencaoItemSerializer(serializers.ModelSerializer):
    equipamento_codigo = serializers.CharField(source="equipamento.codigo", read_only=True)

    class Meta:
        model = PlanoManutencaoItem
        fields = "__all__"

class MedicaoEquipamentoSerializer(serializers.ModelSerializer):
    equipamento_codigo = serializers.CharField(source="equipamento.codigo", read_only=True)

    class Meta:
        model = MedicaoEquipamento
        fields = "__all__"
