from rest_framework import serializers
from .models import Abastecimento

class AbastecimentoSerializer(serializers.ModelSerializer):
    equipamento_codigo = serializers.CharField(source="equipamento.codigo", read_only=True)
    equipamento_descricao = serializers.CharField(source="equipamento.descricao", read_only=True)
    operador_nome = serializers.CharField(source="operador.nome_completo", read_only=True)
    produto_nome = serializers.CharField(source="produto.nome", read_only=True)
    local_estoque_nome = serializers.CharField(source="local_estoque.nome", read_only=True)
    tipo_combustivel_display = serializers.CharField(source="get_tipo_combustivel_display", read_only=True)

    class Meta:
        model = Abastecimento
        fields = "__all__"
        read_only_fields = ["valor_unitario", "created_at", "updated_at"]

    def validate(self, data):
        """
        Validação customizada para garantir que horímetro/km seja coerente.
        A validação principal está no signal, mas podemos adicionar feedback aqui também.
        """
        # Validar horímetro/km não pode ser menor que o atual
        equipamento = data.get('equipamento')
        horimetro_km = data.get('horimetro_km')

        if equipamento and horimetro_km is not None:
            # Verifica a leitura atual do equipamento
            if horimetro_km < equipamento.leitura_atual:
                raise serializers.ValidationError({
                    'horimetro_km': (
                        f"A leitura informada ({horimetro_km}) não pode ser menor que "
                        f"a leitura atual do equipamento ({equipamento.leitura_atual}). "
                        f"Tipo de medição: {equipamento.get_tipo_medicao_display()}"
                    )
                })

        # Se produto e local_estoque estiverem definidos, validar estoque disponível
        if data.get('produto') and data.get('local_estoque'):
            from almoxarifado.models import Estoque
            try:
                estoque = Estoque.objects.get(
                    produto=data['produto'],
                    local=data['local_estoque']
                )
                if estoque.saldo < data['quantidade_litros']:
                    raise serializers.ValidationError({
                        'quantidade_litros': f"Saldo insuficiente no estoque. Disponível: {estoque.saldo}L"
                    })
            except Estoque.DoesNotExist:
                raise serializers.ValidationError({
                    'local_estoque': f"Não existe estoque de {data['produto'].nome} no local {data['local_estoque'].nome}"
                })

        return data
