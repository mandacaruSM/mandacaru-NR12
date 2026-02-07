from rest_framework import serializers
from decimal import Decimal
from .models import FioDiamantado, RegistroCorte, MovimentacaoFio


class FioDiamantadoListSerializer(serializers.ModelSerializer):
    """Serializer resumido para listagem"""
    cliente_nome = serializers.CharField(source='cliente.nome_razao', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    localizacao_display = serializers.CharField(source='get_localizacao_display', read_only=True)
    empreendimento_nome = serializers.CharField(source='empreendimento.nome', read_only=True, allow_null=True)
    maquina_instalada_codigo = serializers.CharField(source='maquina_instalada.codigo', read_only=True, allow_null=True)
    diametro_atual_mm = serializers.DecimalField(max_digits=6, decimal_places=2, read_only=True)
    desgaste_total_mm = serializers.DecimalField(max_digits=6, decimal_places=2, read_only=True)
    percentual_vida_util = serializers.FloatField(read_only=True)
    area_total_cortada_m2 = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    precisa_substituicao = serializers.BooleanField(read_only=True)
    valor_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True, allow_null=True)
    custo_por_m2 = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True, allow_null=True)
    total_cortes = serializers.SerializerMethodField()
    cortes_em_andamento = serializers.SerializerMethodField()

    class Meta:
        model = FioDiamantado
        fields = [
            'id', 'codigo', 'fabricante', 'numero_serie', 'status', 'status_display',
            'cliente', 'cliente_nome',
            'comprimento_metros', 'perolas_por_metro',
            'diametro_inicial_mm', 'diametro_minimo_mm', 'diametro_atual_mm',
            'desgaste_total_mm', 'percentual_vida_util',
            'area_total_cortada_m2', 'precisa_substituicao',
            # Novos campos logisticos
            'nota_fiscal', 'valor_por_metro', 'valor_total', 'data_compra',
            'localizacao', 'localizacao_display',
            'empreendimento', 'empreendimento_nome',
            'maquina_instalada', 'maquina_instalada_codigo',
            'custo_por_m2', 'total_cortes', 'cortes_em_andamento',
            'data_cadastro', 'criado_em',
        ]

    def get_total_cortes(self, obj):
        return obj.registros_corte.filter(status='FINALIZADO').count()

    def get_cortes_em_andamento(self, obj):
        return obj.registros_corte.filter(status='EM_ANDAMENTO').count()


class FioDiamantadoDetailSerializer(serializers.ModelSerializer):
    """Serializer completo com todos os campos e metricas"""
    cliente_nome = serializers.CharField(source='cliente.nome_razao', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    localizacao_display = serializers.CharField(source='get_localizacao_display', read_only=True)
    empreendimento_nome = serializers.CharField(source='empreendimento.nome', read_only=True, allow_null=True)
    maquina_instalada_codigo = serializers.CharField(source='maquina_instalada.codigo', read_only=True, allow_null=True)
    maquina_instalada_descricao = serializers.CharField(source='maquina_instalada.descricao', read_only=True, allow_null=True)
    diametro_atual_mm = serializers.DecimalField(max_digits=6, decimal_places=2, read_only=True)
    desgaste_total_mm = serializers.DecimalField(max_digits=6, decimal_places=2, read_only=True)
    percentual_vida_util = serializers.FloatField(read_only=True)
    area_total_cortada_m2 = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    precisa_substituicao = serializers.BooleanField(read_only=True)
    total_perolas = serializers.IntegerField(read_only=True)
    valor_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True, allow_null=True)
    custo_por_m2 = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True, allow_null=True)
    custo_por_mm_desgaste = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True, allow_null=True)
    metricas = serializers.SerializerMethodField()

    class Meta:
        model = FioDiamantado
        fields = '__all__'

    def get_metricas(self, obj):
        """Calcula metricas agregadas do fio"""
        from django.db.models import Sum, Avg, Count

        cortes = obj.registros_corte.filter(status='FINALIZADO')
        if not cortes.exists():
            return {
                'total_cortes': 0,
                'cortes_em_andamento': obj.registros_corte.filter(status='EM_ANDAMENTO').count(),
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
            'cortes_em_andamento': obj.registros_corte.filter(status='EM_ANDAMENTO').count(),
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
            # Novos campos
            'nota_fiscal', 'valor_por_metro', 'data_compra',
            'localizacao', 'empreendimento', 'maquina_instalada',
        ]


class MovimentacaoFioListSerializer(serializers.ModelSerializer):
    """Serializer para listagem de movimentacoes"""
    fio_codigo = serializers.CharField(source='fio.codigo', read_only=True)
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    empreendimento_origem_nome = serializers.CharField(source='empreendimento_origem.nome', read_only=True, allow_null=True)
    empreendimento_destino_nome = serializers.CharField(source='empreendimento_destino.nome', read_only=True, allow_null=True)
    maquina_codigo = serializers.CharField(source='maquina.codigo', read_only=True, allow_null=True)

    class Meta:
        model = MovimentacaoFio
        fields = [
            'id', 'fio', 'fio_codigo', 'tipo', 'tipo_display', 'data',
            'empreendimento_origem', 'empreendimento_origem_nome',
            'empreendimento_destino', 'empreendimento_destino_nome',
            'maquina', 'maquina_codigo',
            'responsavel', 'observacoes', 'criado_em',
        ]


class MovimentacaoFioCreateSerializer(serializers.ModelSerializer):
    """Serializer para criacao de movimentacoes"""
    class Meta:
        model = MovimentacaoFio
        fields = [
            'fio', 'tipo', 'data',
            'empreendimento_origem', 'empreendimento_destino', 'maquina',
            'responsavel', 'observacoes',
        ]

    def validate(self, data):
        tipo = data.get('tipo')
        fio = data.get('fio')

        if tipo == 'SAIDA_EMPREENDIMENTO':
            if not data.get('empreendimento_destino'):
                raise serializers.ValidationError({
                    'empreendimento_destino': 'Empreendimento destino e obrigatorio para saida'
                })
            if fio.localizacao != 'ALMOXARIFADO':
                raise serializers.ValidationError({
                    'fio': 'Fio precisa estar no almoxarifado para sair para empreendimento'
                })

        elif tipo == 'INSTALACAO_MAQUINA':
            if not data.get('maquina'):
                raise serializers.ValidationError({
                    'maquina': 'Maquina e obrigatoria para instalacao'
                })
            if fio.localizacao == 'MAQUINA':
                raise serializers.ValidationError({
                    'fio': 'Fio ja esta instalado em uma maquina'
                })

        elif tipo == 'REMOCAO_MAQUINA':
            if fio.localizacao != 'MAQUINA':
                raise serializers.ValidationError({
                    'fio': 'Fio nao esta instalado em maquina para ser removido'
                })

        elif tipo == 'RETORNO_ALMOXARIFADO':
            if fio.localizacao == 'ALMOXARIFADO':
                raise serializers.ValidationError({
                    'fio': 'Fio ja esta no almoxarifado'
                })

        return data


class RegistroCorteListSerializer(serializers.ModelSerializer):
    """Serializer resumido para listagem de cortes"""
    fio_codigo = serializers.CharField(source='fio.codigo', read_only=True)
    maquina_codigo = serializers.CharField(source='maquina.codigo', read_only=True)
    maquina_descricao = serializers.CharField(source='maquina.descricao', read_only=True)
    gerador_codigo = serializers.CharField(source='gerador.codigo', read_only=True, allow_null=True)
    empreendimento_nome = serializers.CharField(source='empreendimento.nome', read_only=True)
    fonte_energia_display = serializers.CharField(source='get_fonte_energia_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    rendimento_m2_por_mm = serializers.DecimalField(max_digits=10, decimal_places=4, read_only=True)
    custo_combustivel = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    custo_metro_fio = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True, allow_null=True)

    class Meta:
        model = RegistroCorte
        fields = [
            'id', 'fio', 'fio_codigo',
            'maquina', 'maquina_codigo', 'maquina_descricao',
            'gerador', 'gerador_codigo',
            'empreendimento', 'empreendimento_nome',
            'fonte_energia', 'fonte_energia_display',
            'status', 'status_display',
            'data', 'hora_inicial', 'hora_final',
            'horimetro_inicial', 'horimetro_final',
            'comprimento_corte_m', 'altura_largura_corte_m', 'area_corte_m2',
            'diametro_inicial_mm', 'diametro_final_mm', 'desgaste_mm',
            'tempo_execucao_horas', 'velocidade_corte_m2h',
            'consumo_combustivel_litros', 'custo_combustivel', 'custo_metro_fio',
            'rendimento_m2_por_mm',
            'operador_nome', 'observacoes', 'criado_em', 'atualizado_em',
        ]


class IniciarCorteSerializer(serializers.ModelSerializer):
    """Serializer para INICIAR um corte (apenas campos iniciais)"""
    class Meta:
        model = RegistroCorte
        fields = [
            'fio', 'maquina', 'gerador', 'empreendimento', 'fonte_energia',
            'data', 'hora_inicial', 'horimetro_inicial',
            'diametro_inicial_mm', 'operador_nome', 'observacoes',
        ]

    def validate(self, data):
        # Validar que se fonte_energia == GERADOR_DIESEL, deve ter gerador
        if data.get('fonte_energia') == 'GERADOR_DIESEL' and not data.get('gerador'):
            raise serializers.ValidationError({
                'gerador': 'Gerador e obrigatorio quando a fonte de energia e Diesel'
            })

        # Validar que o fio nao tem corte em andamento
        fio = data.get('fio')
        if fio and fio.registros_corte.filter(status='EM_ANDAMENTO').exists():
            raise serializers.ValidationError({
                'fio': 'Este fio ja possui um corte em andamento'
            })

        return data

    def create(self, validated_data):
        validated_data['status'] = 'EM_ANDAMENTO'
        return super().create(validated_data)


class FinalizarCorteSerializer(serializers.Serializer):
    """Serializer para FINALIZAR um corte (apenas campos de finalizacao)"""
    hora_final = serializers.TimeField()
    horimetro_final = serializers.DecimalField(max_digits=10, decimal_places=2)
    diametro_final_mm = serializers.DecimalField(max_digits=6, decimal_places=2)
    comprimento_corte_m = serializers.DecimalField(max_digits=10, decimal_places=2)
    altura_largura_corte_m = serializers.DecimalField(max_digits=10, decimal_places=2)
    consumo_combustivel_litros = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    observacoes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        corte = self.context.get('corte')
        if not corte:
            raise serializers.ValidationError('Corte nao encontrado')

        if corte.status != 'EM_ANDAMENTO':
            raise serializers.ValidationError('Este corte nao esta em andamento')

        # Validar que diametro final <= diametro inicial
        if data.get('diametro_final_mm') > corte.diametro_inicial_mm:
            raise serializers.ValidationError({
                'diametro_final_mm': 'Diametro final nao pode ser maior que o inicial'
            })

        # Validar que horimetro final >= horimetro inicial
        if data.get('horimetro_final') < corte.horimetro_inicial:
            raise serializers.ValidationError({
                'horimetro_final': 'Horimetro final nao pode ser menor que o inicial'
            })

        return data

    def update(self, instance, validated_data):
        instance.hora_final = validated_data['hora_final']
        instance.horimetro_final = validated_data['horimetro_final']
        instance.diametro_final_mm = validated_data['diametro_final_mm']
        instance.comprimento_corte_m = validated_data['comprimento_corte_m']
        instance.altura_largura_corte_m = validated_data['altura_largura_corte_m']
        instance.consumo_combustivel_litros = validated_data.get('consumo_combustivel_litros')
        if validated_data.get('observacoes'):
            instance.observacoes = validated_data['observacoes']
        instance.status = 'FINALIZADO'
        instance.save()
        return instance


class RegistroCorteCreateSerializer(serializers.ModelSerializer):
    """Serializer legado para criacao/edicao de cortes (modo completo)"""
    class Meta:
        model = RegistroCorte
        fields = [
            'fio', 'maquina', 'gerador', 'empreendimento', 'fonte_energia',
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

    def create(self, validated_data):
        # Se todos os campos de finalizacao estao presentes, marcar como finalizado
        if all([
            validated_data.get('hora_final'),
            validated_data.get('horimetro_final'),
            validated_data.get('diametro_final_mm'),
            validated_data.get('comprimento_corte_m'),
            validated_data.get('altura_largura_corte_m'),
        ]):
            validated_data['status'] = 'FINALIZADO'
        else:
            validated_data['status'] = 'EM_ANDAMENTO'
        return super().create(validated_data)


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


class CorteEmAndamentoSerializer(serializers.ModelSerializer):
    """Serializer para cortes em andamento na dashboard"""
    fio_codigo = serializers.CharField(source='fio.codigo', read_only=True)
    fio_fabricante = serializers.CharField(source='fio.fabricante', read_only=True)
    maquina_codigo = serializers.CharField(source='maquina.codigo', read_only=True)
    maquina_descricao = serializers.CharField(source='maquina.descricao', read_only=True)
    empreendimento_nome = serializers.CharField(source='empreendimento.nome', read_only=True)
    cliente_nome = serializers.CharField(source='fio.cliente.nome_razao', read_only=True)
    fonte_energia_display = serializers.CharField(source='get_fonte_energia_display', read_only=True)
    tempo_decorrido = serializers.SerializerMethodField()

    class Meta:
        model = RegistroCorte
        fields = [
            'id', 'fio', 'fio_codigo', 'fio_fabricante',
            'maquina', 'maquina_codigo', 'maquina_descricao',
            'empreendimento', 'empreendimento_nome', 'cliente_nome',
            'fonte_energia', 'fonte_energia_display',
            'data', 'hora_inicial', 'horimetro_inicial',
            'diametro_inicial_mm', 'operador_nome',
            'tempo_decorrido', 'criado_em',
        ]

    def get_tempo_decorrido(self, obj):
        """Calcula tempo decorrido desde o inicio do corte"""
        from datetime import datetime, timedelta
        from django.utils import timezone

        agora = timezone.now()
        data_hora_inicio = datetime.combine(obj.data, obj.hora_inicial)
        # Tornar aware se necessario
        if timezone.is_naive(data_hora_inicio):
            data_hora_inicio = timezone.make_aware(data_hora_inicio)

        delta = agora - data_hora_inicio
        horas = delta.total_seconds() / 3600
        return round(horas, 2)
