from rest_framework import serializers
from .models import Abastecimento

class AbastecimentoSerializer(serializers.ModelSerializer):
    equipamento_codigo = serializers.CharField(source="equipamento.codigo", read_only=True)
    equipamento_descricao = serializers.CharField(source="equipamento.descricao", read_only=True)
    operador_nome = serializers.CharField(source="operador.nome_completo", read_only=True)

    class Meta:
        model = Abastecimento
        fields = "__all__"
        read_only_fields = ["valor_unitario", "created_at", "updated_at"]
