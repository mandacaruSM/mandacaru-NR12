from rest_framework import serializers
from .models import TipoEquipamento, Equipamento, PlanoManutencaoItem, MedicaoEquipamento, ItemManutencao

class TipoEquipamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoEquipamento
        fields = "__all__"

class EquipamentoSerializer(serializers.ModelSerializer):
    cliente_nome = serializers.CharField(source="cliente.nome_razao", read_only=True)
    empreendimento_nome = serializers.CharField(source="empreendimento.nome", read_only=True)
    tipo_nome = serializers.CharField(source="tipo.nome", read_only=True)
    consumo_medio = serializers.SerializerMethodField()

    class Meta:
        model = Equipamento
        fields = "__all__"
        read_only_fields = ['uuid', 'qr_code', 'criado_em', 'atualizado_em']

    def get_consumo_medio(self, obj):
        """
        Calcula o consumo médio real baseado nos abastecimentos.

        Para HORIMETRO: retorna L/h (litros por hora)
        Para ODOMETRO: retorna km/L (quilômetros por litro)

        Usa os últimos abastecimentos para calcular a média.
        """
        from abastecimentos.models import Abastecimento
        from decimal import Decimal

        # Buscar os últimos abastecimentos ordenados por horímetro/km
        abastecimentos = Abastecimento.objects.filter(
            equipamento=obj
        ).order_by('horimetro_km').values_list('horimetro_km', 'quantidade_litros')

        abastecimentos_list = list(abastecimentos)

        if len(abastecimentos_list) < 2:
            return None

        # Calcular consumo entre abastecimentos consecutivos
        consumos = []
        for i in range(1, len(abastecimentos_list)):
            leitura_anterior = abastecimentos_list[i-1][0]
            leitura_atual = abastecimentos_list[i][0]
            litros = abastecimentos_list[i][1]

            diferenca_leitura = leitura_atual - leitura_anterior

            if diferenca_leitura > 0 and litros > 0:
                if obj.tipo_medicao == 'HORIMETRO':
                    # L/h = litros / horas
                    consumo = float(litros) / float(diferenca_leitura)
                else:  # ODOMETRO
                    # km/L = km / litros
                    consumo = float(diferenca_leitura) / float(litros)
                consumos.append(consumo)

        if not consumos:
            return None

        # Retornar média arredondada
        media = sum(consumos) / len(consumos)
        return round(media, 2)

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

class ItemManutencaoSerializer(serializers.ModelSerializer):
    equipamento_codigo = serializers.CharField(source="equipamento.codigo", read_only=True)
    produto_nome = serializers.CharField(source="produto.nome", read_only=True)
    produto_codigo = serializers.CharField(source="produto.codigo", read_only=True)
    unidade_sigla = serializers.CharField(source="produto.unidade.sigla", read_only=True)
    categoria_display = serializers.CharField(source="get_categoria_display", read_only=True)

    class Meta:
        model = ItemManutencao
        fields = "__all__"
        read_only_fields = ['criado_em', 'atualizado_em']


class MedicaoEquipamentoSerializer(serializers.ModelSerializer):
    equipamento_codigo = serializers.CharField(source="equipamento.codigo", read_only=True)

    class Meta:
        model = MedicaoEquipamento
        fields = "__all__"
