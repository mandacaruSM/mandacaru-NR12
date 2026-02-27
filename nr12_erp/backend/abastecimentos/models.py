from django.db import models

class Abastecimento(models.Model):
    TIPO_COMBUSTIVEL_CHOICES = [
        ("DIESEL", "Diesel"),
        ("GASOLINA", "Gasolina"),
        ("ETANOL", "Etanol"),
        ("GNV", "GNV"),
        ("OUTRO", "Outro"),
    ]

    ORIGEM_CHOICES = [
        ("ALMOXARIFADO", "Almoxarifado"),
        ("POSTO", "Posto de Gasolina"),
    ]

    equipamento = models.ForeignKey(
        "equipamentos.Equipamento",
        on_delete=models.PROTECT,
        related_name="abastecimentos"
    )
    origem = models.CharField(
        max_length=20,
        choices=ORIGEM_CHOICES,
        default="POSTO",
        help_text="Origem do combustível: Almoxarifado ou Posto de Gasolina"
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

        # Se origem é almoxarifado e tem produto, buscar preços do estoque
        if self.origem == 'ALMOXARIFADO' and self.produto and self.local_estoque:
            from almoxarifado.models import Estoque
            try:
                estoque = Estoque.objects.get(
                    produto=self.produto,
                    local=self.local_estoque
                )
                # Buscar preço do produto (assumindo que existe um campo preco_venda)
                # Se não informou valor_total, calcular baseado no preço do produto
                if not self.valor_total and hasattr(self.produto, 'preco_venda'):
                    self.valor_total = self.quantidade_litros * self.produto.preco_venda
                    self.valor_unitario = self.produto.preco_venda
            except Estoque.DoesNotExist:
                pass

        is_new = self.pk is None
        super().save(*args, **kwargs)

        # Dar baixa automática no estoque se origem for almoxarifado
        if self.origem == 'ALMOXARIFADO' and self.produto and self.local_estoque and is_new:
            from almoxarifado.models import MovimentoEstoque, Estoque
            from django.db import transaction

            with transaction.atomic():
                # Criar movimento de saída
                MovimentoEstoque.objects.create(
                    produto=self.produto,
                    local=self.local_estoque,
                    tipo='SAIDA',
                    quantidade=self.quantidade_litros,
                    documento=f"ABAST-{self.id}",
                    observacao=f"Abastecimento equipamento {self.equipamento.codigo}",
                    abastecimento=self
                )

                # Atualizar saldo do estoque
                try:
                    estoque = Estoque.objects.get(
                        produto=self.produto,
                        local=self.local_estoque
                    )
                    estoque.saldo -= self.quantidade_litros
                    estoque.save()
                except Estoque.DoesNotExist:
                    # Se não existe estoque, criar com saldo negativo (indicando falta)
                    Estoque.objects.create(
                        produto=self.produto,
                        local=self.local_estoque,
                        saldo=-self.quantidade_litros
                    )
