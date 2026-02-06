from rest_framework import serializers
from decimal import Decimal
from .models import FioDiamantado, RegistroCorte


class FioDiamantadoListSerializer(serializers.ModelSerializer):
    """Serializer resumido para listagem"""
    cliente_nome = serializers.CharField(source='cliente.nome_razao', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    diametro_atual_mm = serializers.DecimalField(max_digits=6, decimal_places=2, read_only=True)
    desgaste_total_mm = serializers.DecimalField(max_digits=6, decimal_places=2, read_only=True)
    percentual_vida_util = serializers.FloatField(read_only=True)
    area_total_cortada_m2 = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    precisa_substituicao = serializers.BooleanField(read_only=True)
    total_cortes = serializers.SerializerMethodField()

    class Meta:
        model = FioDiamantado
        fields = [
            'id', 'codigo', 'fabricante', 'numero_serie', 'status', 'status_display',
            'cliente', 'cliente_nome',
            'comprimento_metros', 'perolas_por_metro',
            'diametro_inicial_mm', 'diametro_minimo_mm', 'diametro_atual_mm',
            'desgaste_total_mm', 'percentual_vida_util',
            'area_total_cortada_m2', 'precisa_substituicao', 'total_cortes',
            'data_cadastro', 'criado_em',
        ]

    def get_total_cortes(self, obj):
        return obj.registros_corte.count()


class FioDiamantadoDetailSerializer(serializers.ModelSerializer):
    """Serializer completo com todos os campos e metricas"""
    cliente_nome = serializers.CharField(source='cliente.nome_razao', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    diametro_atual_mm = serializers.DecimalField(max_digits=6, decimal_places=2, read_only=True)
    desgaste_total_mm = serializers.DecimalField(max_digits=6, decimal_places=2, read_only=True)
    percentual_vida_util = serializers.FloatField(read_only=True)
    area_total_cortada_m2 = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    precisa_substituicao = serializers.BooleanField(read_only=True)
    total_perolas = serializers.IntegerField(read_only=True)
    metricas = serializers.SerializerMethodField()

    class Meta:
        model = FioDiamantado
        fields = '__all__'

    def get_metricas(self, obj):
        """Calcula metricas agregadas do fio"""
        from django.db.models import Sum, Avg, Count

        cortes = obj.registros_corte.all()
        if not cortes.exists():
            return {
                'total_cortes': 0,
                'area_total_m2': 0,
                'tempo_total_horas': 0,
                'velocidade_media_m2h': 0,
                'rendimento_acumulado_m2_mm': 0,
                'eficiencia_m2_metro_fio': 0,
                'consumo_total_combustivel': 0,
                'custo_total_combustivel': 0,
            }

        agregados = cortes.aggregate(
            total_cortes=Count('id'),
            area_total=Sum('area_corte_m2'),
            tempo_total=Sum('tempo_execucao_horas'),
            velocidade_media=Avg('velocidade_corte_m2h'),
            consumo_total=Sum('consumo_combustivel_litros'),
        )

        area_total = agregados['area_total'] or Decimal('0')
        desgaste_total = obj.desgaste_total_mm

        # Rendimento acumulado (m2 por mm de desgaste)
        rendimento_acumulado = 0
        if desgaste_total > 0:
            rendimento_acumulado = float(area_total / desgaste_total)

        # Eficiencia do fio (m2 por metro de fio)
        eficiencia = 0
        if obj.comprimento_metros > 0:
            eficiencia = float(area_total / obj.comprimento_metros)

        # Custo combustivel
        consumo_total = agregados['consumo_total'] or Decimal('0')
        custo_combustivel = float(consumo_total * Decimal('6.50'))

        return {
            'total_cortes': agregados['total_cortes'] or 0,
            'area_total_m2': float(area_total),
            'tempo_total_horas': float(agregados['tempo_total'] or 0),
            'velocidade_media_m2h': float(agregados['velocidade_media'] or 0),
            'rendimento_acumulado_m2_mm': rendimento_acumulado,
            'eficiencia_m2_metro_fio': eficiencia,
            'consumo_total_combustivel': float(consumo_total),
            'custo_total_combustivel': custo_combustivel,
        }


class FioDiamantadoCreateSerializer(serializers.ModelSerializer):
    """Serializer para criacao/edicao"""
    class Meta:
        model = FioDiamantado
        fields = [
            'cliente', 'codigo', 'fabricante', 'numero_serie',
            'comprimento_metros', 'perolas_por_metro',
            'diametro_inicial_mm', 'diametro_minimo_mm',
            'status', 'observacoes',
        ]


class RegistroCorteListSerializer(serializers.ModelSerializer):
    """Serializer resumido para listagem de cortes"""
    fio_codigo = serializers.CharField(source='fio.codigo', read_only=True)
    maquina_codigo = serializers.CharField(source='maquina.codigo', read_only=True)
    maquina_descricao = serializers.CharField(source='maquina.descricao', read_only=True)
    gerador_codigo = serializers.CharField(source='gerador.codigo', read_only=True, allow_null=True)
    fonte_energia_display = serializers.CharField(source='get_fonte_energia_display', read_only=True)
    rendimento_m2_por_mm = serializers.DecimalField(max_digits=10, decimal_places=4, read_only=True)
    custo_combustivel = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = RegistroCorte
        fields = [
            'id', 'fio', 'fio_codigo',
            'maquina', 'maquina_codigo', 'maquina_descricao',
            'gerador', 'gerador_codigo',
            'fonte_energia', 'fonte_energia_display',
            'data', 'hora_inicial', 'hora_final',
            'horimetro_inicial', 'horimetro_final',
            'comprimento_corte_m', 'altura_largura_corte_m', 'area_corte_m2',
            'diametro_inicial_mm', 'diametro_final_mm', 'desgaste_mm',
            'tempo_execucao_horas', 'velocidade_corte_m2h',
            'consumo_combustivel_litros', 'custo_combustivel',
            'rendimento_m2_por_mm',
            'operador_nome', 'criado_em',
        ]


class RegistroCorteCreateSerializer(serializers.ModelSerializer):
    """Serializer para criacao/edicao de cortes"""
    class Meta:
        model = RegistroCorte
        fields = [
            'fio', 'maquina', 'gerador', 'fonte_energia',
            'data', 'hora_inicial', 'hora_final',
            'horimetro_inicial', 'horimetro_final',
            'comprimento_corte_m', 'altura_largura_corte_m',
            'diametro_inicial_mm', 'diametro_final_mm',
            'consumo_combustivel_litros',
            'operador_nome', 'observacoes',
        ]

    def validate(self, data):
        # Validar que diametro final <= diametro inicial
        if data.get('diametro_final_mm') and data.get('diametro_inicial_mm'):
            if data['diametro_final_mm'] > data['diametro_inicial_mm']:
                raise serializers.ValidationError({
                    'diametro_final_mm': 'Diametro final nao pode ser maior que o inicial'
                })

        # Validar que horimetro final >= horimetro inicial
        if data.get('horimetro_final') and data.get('horimetro_inicial'):
            if data['horimetro_final'] < data['horimetro_inicial']:
                raise serializers.ValidationError({
                    'horimetro_final': 'Horimetro final nao pode ser menor que o inicial'
                })

        # Validar que se fonte_energia == GERADOR_DIESEL, deve ter gerador
        if data.get('fonte_energia') == 'GERADOR_DIESEL' and not data.get('gerador'):
            raise serializers.ValidationError({
                'gerador': 'Gerador e obrigatorio quando a fonte de energia e Diesel'
            })

        return data


class HistoricoDesgasteSerializer(serializers.Serializer):
    """Serializer para dados do grafico de desgaste"""
    data = serializers.DateField()
    diametro_mm = serializers.DecimalField(max_digits=6, decimal_places=2)
    area_corte_m2 = serializers.DecimalField(max_digits=12, decimal_places=4)
    area_acumulada_m2 = serializers.DecimalField(max_digits=12, decimal_places=4)


class DashboardFioSerializer(serializers.Serializer):
    """Serializer para dados do dashboard"""
    fio = FioDiamantadoDetailSerializer()
    historico_desgaste = HistoricoDesgasteSerializer(many=True)
    custos_por_fonte = serializers.DictField()
    alertas = serializers.ListField()
