from django.db import models
from django.conf import settings

class UnidadeMedida(models.Model):
    sigla = models.CharField(max_length=10, unique=True)  # ex.: UN, PC, L, KG
    descricao = models.CharField(max_length=50)

    def __str__(self):
        return self.sigla

class CategoriaProduto(models.Model):
    nome = models.CharField(max_length=60, unique=True)   # ex.: Peças, Combustíveis, Óleos
    def __str__(self):
        return self.nome

class Produto(models.Model):
    TIPO = (
        ('PECA', 'Peça'),
        ('COMBUSTIVEL', 'Combustível'),
        ('INSUMO', 'Insumo'),
    )
    nome = models.CharField(max_length=120)
    codigo = models.CharField(max_length=60, unique=True)
    tipo = models.CharField(max_length=12, choices=TIPO)
    categoria = models.ForeignKey(CategoriaProduto, on_delete=models.PROTECT)
    unidade = models.ForeignKey(UnidadeMedida, on_delete=models.PROTECT)
    ativo = models.BooleanField(default=True)

    # Só para combustíveis
    densidade_kg_l = models.DecimalField(max_digits=6, decimal_places=3, null=True, blank=True)

    def __str__(self):
        return f"{self.codigo} - {self.nome}"

class LocalEstoque(models.Model):
    TIPO = (
        ('ALMOX', 'Almoxarifado'),
        ('TANQUE', 'Tanque Interno'),
        ('POSTO', 'Posto de Combustível Externo'),  # referência lógica
    )
    nome = models.CharField(max_length=80)
    tipo = models.CharField(max_length=10, choices=TIPO)
    # Opcional: identificação do fornecedor/posto
    fornecedor_nome = models.CharField(max_length=120, blank=True, default='')

    def __str__(self):
        return f"{self.nome} ({self.get_tipo_display()})"

class Estoque(models.Model):
    produto = models.ForeignKey(Produto, on_delete=models.CASCADE)
    local = models.ForeignKey(LocalEstoque, on_delete=models.CASCADE)
    saldo = models.DecimalField(max_digits=14, decimal_places=3, default=0)  # suporte a litros

    class Meta:
        unique_together = ('produto', 'local')

class MovimentoEstoque(models.Model):
    TIPO = (
        ('ENTRADA', 'Entrada'),
        ('SAIDA', 'Saída'),
        ('AJUSTE', 'Ajuste'),
    )
    produto = models.ForeignKey(Produto, on_delete=models.PROTECT)
    local = models.ForeignKey(LocalEstoque, on_delete=models.PROTECT)
    tipo = models.CharField(max_length=10, choices=TIPO)
    quantidade = models.DecimalField(max_digits=14, decimal_places=3)
    data_hora = models.DateTimeField(auto_now_add=True)
    documento = models.CharField(max_length=100, blank=True, default='')  # NF, OS, ID abastecimento, etc.
    observacao = models.TextField(blank=True, default='')
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )

    # Campo de vínculo cruzado com abastecimento (se aplicável)
    abastecimento = models.ForeignKey(
        'abastecimento.RegistroAbastecimento',
        null=True, blank=True, on_delete=models.SET_NULL, related_name='movimentos_estoque'
    )
