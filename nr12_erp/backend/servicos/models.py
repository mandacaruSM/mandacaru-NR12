from django.db import models


class CategoriaServico(models.Model):
    """Categorias de serviços (ex: Manutenção, Instalação, Consultoria)"""
    nome = models.CharField(max_length=60, unique=True)
    descricao = models.TextField(blank=True, default='')
    ativo = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Categoria de Serviço'
        verbose_name_plural = 'Categorias de Serviços'
        ordering = ['nome']

    def __str__(self):
        return self.nome


class Servico(models.Model):
    """Serviços prestados pela empresa com preços e impostos"""

    # Informações básicas
    codigo = models.CharField(max_length=60, unique=True, help_text='Código único do serviço')
    nome = models.CharField(max_length=200, help_text='Nome/descrição do serviço')
    categoria = models.ForeignKey(
        CategoriaServico,
        on_delete=models.PROTECT,
        related_name='servicos',
        null=True,
        blank=True
    )
    descricao_detalhada = models.TextField(blank=True, default='', help_text='Descrição completa do serviço')

    # Preços
    preco_venda = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text='Preço de venda do serviço'
    )
    preco_custo = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        null=True,
        blank=True,
        help_text='Custo estimado do serviço (opcional)'
    )

    # Impostos (percentuais)
    aliquota_iss = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text='Alíquota de ISS (%)'
    )
    aliquota_pis = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text='Alíquota de PIS (%)'
    )
    aliquota_cofins = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text='Alíquota de COFINS (%)'
    )
    aliquota_csll = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text='Alíquota de CSLL (%)'
    )
    aliquota_irpj = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text='Alíquota de IRPJ (%)'
    )

    # Unidade (para controle de tempo/quantidade)
    UNIDADE_CHOICES = [
        ('HORA', 'Hora'),
        ('DIA', 'Dia'),
        ('MES', 'Mês'),
        ('SERVICO', 'Serviço'),
        ('VISITA', 'Visita'),
    ]
    unidade = models.CharField(
        max_length=20,
        choices=UNIDADE_CHOICES,
        default='SERVICO',
        help_text='Unidade de medida do serviço'
    )

    # Tempo estimado (em minutos)
    tempo_estimado = models.IntegerField(
        null=True,
        blank=True,
        help_text='Tempo estimado de execução em minutos'
    )

    # Status
    ativo = models.BooleanField(default=True)

    # Auditoria
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Serviço'
        verbose_name_plural = 'Serviços'
        ordering = ['nome']

    def __str__(self):
        return f"{self.codigo} - {self.nome}"

    @property
    def total_impostos(self):
        """Calcula o total de impostos em percentual"""
        return (
            self.aliquota_iss +
            self.aliquota_pis +
            self.aliquota_cofins +
            self.aliquota_csll +
            self.aliquota_irpj
        )

    @property
    def valor_impostos(self):
        """Calcula o valor total de impostos sobre o preço de venda"""
        return self.preco_venda * (self.total_impostos / 100)

    @property
    def preco_liquido(self):
        """Preço de venda menos impostos"""
        return self.preco_venda - self.valor_impostos
