from django.db import models
from django.conf import settings

class UnidadeMedida(models.Model):
    sigla = models.CharField(max_length=10, unique=True)    # UN, PC, L, KG
    descricao = models.CharField(max_length=50)
    def __str__(self): return self.sigla

class CategoriaProduto(models.Model):
    nome = models.CharField(max_length=60, unique=True)     # Peças, Combustíveis, Óleos
    def __str__(self): return self.nome

class Produto(models.Model):
    TIPO = (('PECA','Peça'), ('COMBUSTIVEL','Combustível'), ('INSUMO','Insumo'))
    nome = models.CharField(max_length=120)
    codigo = models.CharField(max_length=60, unique=True)
    tipo = models.CharField(max_length=12, choices=TIPO)
    categoria = models.ForeignKey(CategoriaProduto, on_delete=models.PROTECT)
    unidade = models.ForeignKey(UnidadeMedida, on_delete=models.PROTECT)
    ativo = models.BooleanField(default=True)

    # específico de combustível (opcional)
    densidade_kg_l = models.DecimalField(max_digits=6, decimal_places=3, null=True, blank=True)

    # Preços
    preco_venda = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text='Preço de venda do produto'
    )
    preco_custo = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        null=True,
        blank=True,
        help_text='Custo do produto (opcional)'
    )

    # Impostos (percentuais)
    aliquota_icms = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text='Alíquota de ICMS (%)'
    )
    aliquota_ipi = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text='Alíquota de IPI (%)'
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

    def __str__(self): return f"{self.codigo} - {self.nome}"

    @property
    def total_impostos(self):
        """Calcula o total de impostos em percentual"""
        return (
            self.aliquota_icms +
            self.aliquota_ipi +
            self.aliquota_pis +
            self.aliquota_cofins
        )

    @property
    def valor_impostos(self):
        """Calcula o valor total de impostos sobre o preço de venda"""
        return self.preco_venda * (self.total_impostos / 100)

    @property
    def preco_liquido(self):
        """Preço de venda menos impostos"""
        return self.preco_venda - self.valor_impostos

class LocalEstoque(models.Model):
    TIPO = (('ALMOX','Almoxarifado'), ('TANQUE','Tanque Interno'), ('POSTO','Posto Externo'))
    nome = models.CharField(max_length=80)
    tipo = models.CharField(max_length=10, choices=TIPO)
    fornecedor_nome = models.CharField(max_length=120, blank=True, default='')
    def __str__(self): return f"{self.nome} ({self.get_tipo_display()})"

class Estoque(models.Model):
    produto = models.ForeignKey(Produto, on_delete=models.CASCADE)
    local = models.ForeignKey(LocalEstoque, on_delete=models.CASCADE)
    saldo = models.DecimalField(max_digits=14, decimal_places=3, default=0)  # litros/quantidades
    class Meta:
        unique_together = ('produto','local')

class MovimentoEstoque(models.Model):
    TIPO = (('ENTRADA','Entrada'), ('SAIDA','Saída'), ('AJUSTE','Ajuste'))
    produto = models.ForeignKey(Produto, on_delete=models.PROTECT)
    local = models.ForeignKey(LocalEstoque, on_delete=models.PROTECT)
    tipo = models.CharField(max_length=10, choices=TIPO)
    quantidade = models.DecimalField(max_digits=14, decimal_places=3)
    data_hora = models.DateTimeField(auto_now_add=True)
    documento = models.CharField(max_length=100, blank=True, default='')   # NF/OS/ID
    observacao = models.TextField(blank=True, default='')
    criado_por = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    # vínculo com abastecimento (se aplicável)
    abastecimento = models.ForeignKey(
        "abastecimentos.Abastecimento",
        null=True, blank=True, on_delete=models.SET_NULL, related_name="movimentos_estoque"
    )
