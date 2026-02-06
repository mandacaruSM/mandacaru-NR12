"""
Modulo de Controle de Fio Diamantado

Este modulo gerencia o ciclo de vida dos fios diamantados usados em maquinas de corte,
incluindo o registro de cortes, calculos de desgaste e metricas de rendimento.
"""
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from cadastro.models import Cliente
from equipamentos.models import Equipamento


class FioDiamantado(models.Model):
    """
    Cadastro do Fio Diamantado (Inventario)
    """
    STATUS_CHOICES = [
        ('ATIVO', 'Ativo'),
        ('FINALIZADO', 'Finalizado'),
        ('MANUTENCAO', 'Em Manutencao'),
    ]

    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.PROTECT,
        related_name='fios_diamantados',
        verbose_name='Cliente'
    )
    codigo = models.CharField(
        max_length=50,
        verbose_name='Codigo do Fio'
    )
    fabricante = models.CharField(
        max_length=100,
        verbose_name='Fabricante'
    )
    numero_serie = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Numero de Serie'
    )
    comprimento_metros = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name='Comprimento (metros)'
    )
    perolas_por_metro = models.IntegerField(
        validators=[MinValueValidator(1)],
        verbose_name='Perolas por Metro'
    )
    diametro_inicial_mm = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name='Diametro Inicial (mm)'
    )
    diametro_minimo_mm = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        default=Decimal('6.0'),
        verbose_name='Diametro Minimo (mm)',
        help_text='Diametro minimo antes da substituicao'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='ATIVO',
        verbose_name='Status'
    )
    observacoes = models.TextField(
        blank=True,
        verbose_name='Observacoes'
    )
    data_cadastro = models.DateField(
        auto_now_add=True,
        verbose_name='Data de Cadastro'
    )
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Fio Diamantado'
        verbose_name_plural = 'Fios Diamantados'
        ordering = ['-criado_em']
        unique_together = ['cliente', 'codigo']

    def __str__(self):
        return f"{self.codigo} - {self.fabricante}"

    @property
    def total_perolas(self):
        """Total de perolas no fio"""
        return int(self.comprimento_metros * self.perolas_por_metro)

    @property
    def diametro_atual_mm(self):
        """Diametro atual baseado no ultimo registro de corte"""
        ultimo_corte = self.registros_corte.order_by('-data', '-hora_final').first()
        if ultimo_corte and ultimo_corte.diametro_final_mm:
            return ultimo_corte.diametro_final_mm
        return self.diametro_inicial_mm

    @property
    def desgaste_total_mm(self):
        """Desgaste total do fio (inicial - atual)"""
        return self.diametro_inicial_mm - self.diametro_atual_mm

    @property
    def percentual_vida_util(self):
        """Percentual de vida util restante"""
        vida_total = self.diametro_inicial_mm - self.diametro_minimo_mm
        if vida_total <= 0:
            return 0
        vida_restante = self.diametro_atual_mm - self.diametro_minimo_mm
        if vida_restante <= 0:
            return 0
        return round((vida_restante / vida_total) * 100, 2)

    @property
    def area_total_cortada_m2(self):
        """Area total cortada em m2"""
        return self.registros_corte.aggregate(
            total=models.Sum('area_corte_m2')
        )['total'] or Decimal('0')

    @property
    def precisa_substituicao(self):
        """Indica se o fio precisa ser substituido"""
        return self.diametro_atual_mm <= self.diametro_minimo_mm


class RegistroCorte(models.Model):
    """
    Registro de Corte (Apontamento Diario)
    """
    FONTE_ENERGIA_CHOICES = [
        ('GERADOR_DIESEL', 'Gerador Diesel'),
        ('REDE_ELETRICA', 'Rede Eletrica'),
    ]

    fio = models.ForeignKey(
        FioDiamantado,
        on_delete=models.PROTECT,
        related_name='registros_corte',
        verbose_name='Fio Diamantado'
    )
    maquina = models.ForeignKey(
        Equipamento,
        on_delete=models.PROTECT,
        related_name='cortes_fio_diamantado',
        verbose_name='Maquina de Corte'
    )
    gerador = models.ForeignKey(
        Equipamento,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cortes_como_gerador',
        verbose_name='Gerador (se diesel)'
    )
    fonte_energia = models.CharField(
        max_length=20,
        choices=FONTE_ENERGIA_CHOICES,
        default='REDE_ELETRICA',
        verbose_name='Fonte de Energia'
    )

    # Tempo
    data = models.DateField(verbose_name='Data do Corte')
    hora_inicial = models.TimeField(verbose_name='Hora Inicial')
    hora_final = models.TimeField(verbose_name='Hora Final')
    horimetro_inicial = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='Horimetro Inicial'
    )
    horimetro_final = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='Horimetro Final'
    )

    # Medicoes do Corte
    comprimento_corte_m = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name='Comprimento do Corte (m)'
    )
    altura_largura_corte_m = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name='Altura/Largura do Corte (m)'
    )

    # Medicoes das Perolas
    diametro_inicial_mm = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name='Diametro Inicial do Corte (mm)'
    )
    diametro_final_mm = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name='Diametro Final do Corte (mm)'
    )

    # Campos calculados (armazenados para performance)
    area_corte_m2 = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        editable=False,
        verbose_name='Area do Corte (m2)'
    )
    tempo_execucao_horas = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        editable=False,
        verbose_name='Tempo de Execucao (horas)'
    )
    desgaste_mm = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        editable=False,
        verbose_name='Desgaste (mm)'
    )
    velocidade_corte_m2h = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        editable=False,
        verbose_name='Velocidade de Corte (m2/h)'
    )

    # Consumo do gerador (se aplicavel)
    consumo_combustivel_litros = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='Consumo de Combustivel (litros)'
    )

    operador_nome = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Nome do Operador'
    )
    observacoes = models.TextField(
        blank=True,
        verbose_name='Observacoes'
    )
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Registro de Corte'
        verbose_name_plural = 'Registros de Corte'
        ordering = ['-data', '-hora_final']

    def __str__(self):
        return f"Corte {self.data} - {self.fio.codigo} - {self.area_corte_m2} m2"

    def save(self, *args, **kwargs):
        # Calcular area do corte
        self.area_corte_m2 = self.comprimento_corte_m * self.altura_largura_corte_m

        # Calcular tempo de execucao
        from datetime import datetime, timedelta
        hora_ini = datetime.combine(self.data, self.hora_inicial)
        hora_fim = datetime.combine(self.data, self.hora_final)
        # Se hora final for menor que inicial, assumir que passou da meia-noite
        if hora_fim < hora_ini:
            hora_fim += timedelta(days=1)
        delta = hora_fim - hora_ini
        self.tempo_execucao_horas = Decimal(str(delta.total_seconds() / 3600))

        # Calcular desgaste
        self.desgaste_mm = self.diametro_inicial_mm - self.diametro_final_mm

        # Calcular velocidade de corte
        if self.tempo_execucao_horas > 0:
            self.velocidade_corte_m2h = self.area_corte_m2 / self.tempo_execucao_horas
        else:
            self.velocidade_corte_m2h = Decimal('0')

        super().save(*args, **kwargs)

    @property
    def custo_combustivel(self):
        """Custo estimado de combustivel (se houver consumo)"""
        if self.consumo_combustivel_litros:
            # Preco medio do diesel - pode ser parametrizavel
            preco_diesel = Decimal('6.50')
            return self.consumo_combustivel_litros * preco_diesel
        return Decimal('0')

    @property
    def rendimento_m2_por_mm(self):
        """Rendimento em m2 por mm de desgaste"""
        if self.desgaste_mm > 0:
            return self.area_corte_m2 / self.desgaste_mm
        return Decimal('0')
