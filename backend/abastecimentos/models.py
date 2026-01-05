from django.db import models

class Abastecimento(models.Model):
    TIPO_COMBUSTIVEL_CHOICES = [
        ("DIESEL", "Diesel"),
        ("GASOLINA", "Gasolina"),
        ("ETANOL", "Etanol"),
        ("GNV", "GNV"),
        ("OUTRO", "Outro"),
    ]

    equipamento = models.ForeignKey(
        "equipamentos.Equipamento",
        on_delete=models.PROTECT,
        related_name="abastecimentos"
    )
    data = models.DateField()
    horimetro_km = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Horímetro ou KM no momento do abastecimento"
    )

    # Relacionamento com produto de combustível
    produto = models.ForeignKey(
        "almoxarifado.Produto",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        limit_choices_to={'tipo': 'COMBUSTIVEL'},
        related_name="abastecimentos",
        help_text="Produto de combustível do almoxarifado"
    )

    tipo_combustivel = models.CharField(
        max_length=20,
        choices=TIPO_COMBUSTIVEL_CHOICES,
        default="DIESEL"
    )
    quantidade_litros = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Quantidade em litros"
    )
    valor_total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Valor total do abastecimento"
    )
    valor_unitario = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        blank=True,
        null=True,
        help_text="Valor por litro (calculado automaticamente)"
    )

    # Local de estoque (tanque/posto)
    local_estoque = models.ForeignKey(
        "almoxarifado.LocalEstoque",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="abastecimentos",
        help_text="Local de onde saiu o combustível"
    )
    local = models.CharField(max_length=150, blank=True, default="", help_text="Descrição do local (alternativa)")
    operador = models.ForeignKey(
        "core.Operador",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="abastecimentos"
    )
    observacoes = models.TextField(blank=True, default="")

    # Nota fiscal
    numero_nota = models.CharField(max_length=50, blank=True, default="")
    nota_fiscal = models.FileField(
        upload_to='abastecimentos/notas/',
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-data", "-horimetro_km"]
        indexes = [
            models.Index(fields=["equipamento", "-data"]),
            models.Index(fields=["data"]),
        ]

    def __str__(self):
        return f"{self.equipamento.codigo} - {self.data} - {self.quantidade_litros}L"

    def save(self, *args, **kwargs):
        # Calcular valor unitário automaticamente
        if self.quantidade_litros and self.valor_total:
            self.valor_unitario = self.valor_total / self.quantidade_litros
        super().save(*args, **kwargs)
