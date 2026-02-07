"""
Modulo de Controle de Fio Diamantado

Este modulo gerencia o ciclo de vida dos fios diamantados usados em maquinas de corte,
incluindo o registro de cortes, calculos de desgaste e metricas de rendimento.
"""
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from cadastro.models import Cliente, Empreendimento
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

    LOCALIZACAO_CHOICES = [
        ('ALMOXARIFADO', 'Almoxarifado'),
        ('EMPREENDIMENTO', 'Empreendimento'),
        ('MAQUINA', 'Instalado em Maquina'),
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

    # Novos campos de logistica e financeiro
    nota_fiscal = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='Nota Fiscal'
    )
    valor_por_metro = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name='Valor por Metro (R$)'
    )
    data_compra = models.DateField(
        null=True,
        blank=True,
        verbose_name='Data de Compra'
    )

    # Localizacao do fio
    localizacao = models.CharField(
        max_length=20,
        choices=LOCALIZACAO_CHOICES,
        default='ALMOXARIFADO',
        verbose_name='Localizacao'
    )
    empreendimento = models.ForeignKey(
        Empreendimento,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='fios_diamantados',
        verbose_name='Empreendimento'
    )
    maquina_instalada = models.ForeignKey(
        Equipamento,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='fios_instalados',
        verbose_name='Maquina onde esta instalado'
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
    def valor_total(self):
        """Valor total do fio baseado no comprimento e valor por metro"""
        if self.valor_por_metro:
            return self.comprimento_metros * self.valor_por_metro
        return None

    @property
    def total_perolas(self):
        """Total de perolas no fio"""
        return int(self.comprimento_metros * self.perolas_por_metro)

    @property
    def diametro_atual_mm(self):
        """Diametro atual baseado no ultimo registro de corte finalizado"""
        ultimo_corte = self.registros_corte.filter(
            status='FINALIZADO'
        ).order_by('-data', '-hora_final').first()
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
        """Area total cortada em m2 (apenas cortes finalizados)"""
        return self.registros_corte.filter(
            status='FINALIZADO'
        ).aggregate(
            total=models.Sum('area_corte_m2')
        )['total'] or Decimal('0')

    @property
    def precisa_substituicao(self):
        """Indica se o fio precisa ser substituido"""
        return self.diametro_atual_mm <= self.diametro_minimo_mm

    @property
    def custo_por_m2(self):
        """Custo por m2 cortado (valor total / area total cortada)"""
        area = self.area_total_cortada_m2
        if area and area > 0 and self.valor_total:
            return round(self.valor_total / area, 2)
        return None

    @property
    def custo_por_mm_desgaste(self):
        """Custo por mm de desgaste"""
        desgaste = self.desgaste_total_mm
        if desgaste and desgaste > 0 and self.valor_total:
            return round(self.valor_total / desgaste, 2)
        return None


class MovimentacaoFio(models.Model):
    """
    Registro de movimentacao/transferencia do fio
    """
    TIPO_CHOICES = [
        ('ENTRADA', 'Entrada no Almoxarifado'),
        ('SAIDA_EMPREENDIMENTO', 'Saida para Empreendimento'),
        ('INSTALACAO_MAQUINA', 'Instalacao em Maquina'),
        ('REMOCAO_MAQUINA', 'Remocao da Maquina'),
        ('RETORNO_ALMOXARIFADO', 'Retorno ao Almoxarifado'),
    ]

    fio = models.ForeignKey(
        FioDiamantado,
        on_delete=models.PROTECT,
        related_name='movimentacoes',
        verbose_name='Fio Diamantado'
    )
    tipo = models.CharField(
        max_length=30,
        choices=TIPO_CHOICES,
        verbose_name='Tipo de Movimentacao'
    )
    data = models.DateField(
        verbose_name='Data da Movimentacao'
    )

    # Origem e destino
    empreendimento_origem = models.ForeignKey(
        Empreendimento,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='movimentacoes_fio_origem',
        verbose_name='Empreendimento Origem'
    )
    empreendimento_destino = models.ForeignKey(
        Empreendimento,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='movimentacoes_fio_destino',
        verbose_name='Empreendimento Destino'
    )
    maquina = models.ForeignKey(
        Equipamento,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='movimentacoes_fio',
        verbose_name='Maquina'
    )

    responsavel = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Responsavel pela Movimentacao'
    )
    observacoes = models.TextField(
        blank=True,
        verbose_name='Observacoes'
    )
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Movimentacao de Fio'
        verbose_name_plural = 'Movimentacoes de Fio'
        ordering = ['-data', '-criado_em']

    def __str__(self):
        return f"{self.fio.codigo} - {self.get_tipo_display()} - {self.data}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Atualizar localizacao do fio baseado no tipo de movimentacao
        fio = self.fio
        if self.tipo == 'ENTRADA':
            fio.localizacao = 'ALMOXARIFADO'
            fio.empreendimento = None
            fio.maquina_instalada = None
        elif self.tipo == 'SAIDA_EMPREENDIMENTO':
            fio.localizacao = 'EMPREENDIMENTO'
            fio.empreendimento = self.empreendimento_destino
            fio.maquina_instalada = None
        elif self.tipo == 'INSTALACAO_MAQUINA':
            fio.localizacao = 'MAQUINA'
            fio.maquina_instalada = self.maquina
            if self.maquina:
                fio.empreendimento = self.maquina.empreendimento
        elif self.tipo == 'REMOCAO_MAQUINA':
            fio.localizacao = 'EMPREENDIMENTO'
            fio.maquina_instalada = None
        elif self.tipo == 'RETORNO_ALMOXARIFADO':
            fio.localizacao = 'ALMOXARIFADO'
            fio.empreendimento = None
            fio.maquina_instalada = None
        fio.save()


class RegistroCorte(models.Model):
    """
    Registro de Corte (Apontamento Diario)
    Agora com fluxo de Iniciar -> Finalizar
    """
    STATUS_CHOICES = [
        ('EM_ANDAMENTO', 'Em Andamento'),
        ('FINALIZADO', 'Finalizado'),
        ('CANCELADO', 'Cancelado'),
    ]

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
    empreendimento = models.ForeignKey(
        Empreendimento,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='cortes_fio_diamantado',
        verbose_name='Empreendimento'
    )
    fonte_energia = models.CharField(
        max_length=20,
        choices=FONTE_ENERGIA_CHOICES,
        default='REDE_ELETRICA',
        verbose_name='Fonte de Energia'
    )

    # Status do corte (novo campo para fluxo Iniciar/Finalizar)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='EM_ANDAMENTO',
        verbose_name='Status do Corte'
    )

    # Campos de INICIO do corte
    data = models.DateField(verbose_name='Data do Corte')
    hora_inicial = models.TimeField(verbose_name='Hora Inicial')
    horimetro_inicial = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='Horimetro Inicial'
    )
    diametro_inicial_mm = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name='Diametro Inicial do Corte (mm)'
    )
    operador_nome = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Nome do Operador'
    )

    # Campos de FINALIZACAO do corte (preenchidos posteriormente)
    hora_final = models.TimeField(
        null=True,
        blank=True,
        verbose_name='Hora Final'
    )
    horimetro_final = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='Horimetro Final'
    )
    diametro_final_mm = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name='Diametro Final do Corte (mm)'
    )

    # Medicoes do Bloco cortado (preenchidos na finalizacao)
    comprimento_corte_m = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name='Comprimento do Corte (m)'
    )
    altura_largura_corte_m = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name='Altura/Largura do Corte (m)'
    )

    # Campos calculados (armazenados para performance)
    area_corte_m2 = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        null=True,
        blank=True,
        editable=False,
        verbose_name='Area do Corte (m2)'
    )
    tempo_execucao_horas = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        editable=False,
        verbose_name='Tempo de Execucao (horas)'
    )
    desgaste_mm = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        editable=False,
        verbose_name='Desgaste (mm)'
    )
    velocidade_corte_m2h = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        null=True,
        blank=True,
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

    observacoes = models.TextField(
        blank=True,
        verbose_name='Observacoes'
    )
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Registro de Corte'
        verbose_name_plural = 'Registros de Corte'
        ordering = ['-data', '-criado_em']

    def __str__(self):
        status_str = f" ({self.get_status_display()})" if self.status == 'EM_ANDAMENTO' else ""
        area_str = f" - {self.area_corte_m2} m2" if self.area_corte_m2 else ""
        return f"Corte {self.data} - {self.fio.codigo}{area_str}{status_str}"

    def calcular_metricas(self):
        """Calcula as metricas do corte quando finalizado"""
        if self.status != 'FINALIZADO':
            return

        if not all([self.hora_final, self.comprimento_corte_m,
                    self.altura_largura_corte_m, self.diametro_final_mm]):
            return

        # Calcular area do corte
        self.area_corte_m2 = self.comprimento_corte_m * self.altura_largura_corte_m

        # Calcular tempo de execucao baseado no horimetro da maquina (nao hora do relogio)
        if self.horimetro_final and self.horimetro_inicial:
            self.tempo_execucao_horas = self.horimetro_final - self.horimetro_inicial
        else:
            # Fallback para calculo por hora do relogio se nao tiver horimetro
            from datetime import datetime, timedelta
            hora_ini = datetime.combine(self.data, self.hora_inicial)
            hora_fim = datetime.combine(self.data, self.hora_final)
            if hora_fim < hora_ini:
                hora_fim += timedelta(days=1)
            delta = hora_fim - hora_ini
            self.tempo_execucao_horas = Decimal(str(delta.total_seconds() / 3600))

        # Calcular desgaste
        self.desgaste_mm = self.diametro_inicial_mm - self.diametro_final_mm

        # Calcular velocidade de corte
        if self.tempo_execucao_horas and self.tempo_execucao_horas > 0:
            self.velocidade_corte_m2h = self.area_corte_m2 / self.tempo_execucao_horas
        else:
            self.velocidade_corte_m2h = Decimal('0')

    def save(self, *args, **kwargs):
        # Calcular metricas apenas quando finalizado
        if self.status == 'FINALIZADO':
            self.calcular_metricas()
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
        if self.desgaste_mm and self.desgaste_mm > 0 and self.area_corte_m2:
            return self.area_corte_m2 / self.desgaste_mm
        return Decimal('0')

    @property
    def custo_metro_fio(self):
        """Custo do metro de fio baseado no desgaste deste corte"""
        if self.desgaste_mm and self.desgaste_mm > 0 and self.fio.valor_por_metro:
            # Proporcional ao desgaste em relacao ao desgaste total possivel
            desgaste_total_possivel = self.fio.diametro_inicial_mm - self.fio.diametro_minimo_mm
            if desgaste_total_possivel > 0:
                proporcao = self.desgaste_mm / desgaste_total_possivel
                return self.fio.valor_por_metro * proporcao * self.fio.comprimento_metros
        return None
