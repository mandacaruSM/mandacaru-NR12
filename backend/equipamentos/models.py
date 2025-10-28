import uuid
from django.db import models
from django.utils import timezone

class TipoEquipamento(models.Model):
    nome = models.CharField(max_length=100, unique=True)
    descricao = models.CharField(max_length=255, blank=True, default="")
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["nome"]

    def __str__(self):
        return self.nome


class Equipamento(models.Model):
    MEDICAO_CHOICES = [("KM", "Quilômetro"), ("HORA", "Horímetro")]

    cliente = models.ForeignKey("cadastro.Cliente", on_delete=models.PROTECT, related_name="equipamentos")
    empreendimento = models.ForeignKey("cadastro.Empreendimento", on_delete=models.PROTECT, related_name="equipamentos")
    tipo = models.ForeignKey(TipoEquipamento, on_delete=models.PROTECT, related_name="equipamentos")

    codigo = models.CharField(max_length=50, unique=True)  # patrimônio/placa/prefixo
    descricao = models.CharField(max_length=150, blank=True, default="")
    fabricante = models.CharField(max_length=100, blank=True, default="")
    modelo = models.CharField(max_length=100, blank=True, default="")
    ano_fabricacao = models.IntegerField(null=True, blank=True)
    numero_serie = models.CharField(max_length=100, blank=True, default="")

    tipo_medicao = models.CharField(max_length=4, choices=MEDICAO_CHOICES, default="HORA")
    leitura_atual = models.DecimalField(max_digits=12, decimal_places=2, default=0)  # km ou horas

    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)

    @property
    def qr_payload(self) -> str:
        return f"eq:{self.uuid}"
    
    class Meta:
        ordering = ["codigo"]

    def __str__(self):
        return f"{self.codigo} - {self.descricao or self.modelo}"


class PlanoManutencaoItem(models.Model):
    """Plano por equipamento com periodicidade por KM, HORA ou DIAS."""
    MODO_CHOICES = [("KM", "KM"), ("HORA", "HORA"), ("DIAS", "DIAS")]

    equipamento = models.ForeignKey(Equipamento, on_delete=models.CASCADE, related_name="planos")
    titulo = models.CharField(max_length=150)
    modo = models.CharField(max_length=10, choices=MODO_CHOICES)
    periodicidade_valor = models.PositiveIntegerField()  # ex: 250 (km/horas/dias)

    # âncoras para cálculo:
    leitura_base = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    data_base = models.DateField(null=True, blank=True)

    proxima_leitura = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    proxima_data = models.DateField(null=True, blank=True)

    antecedencia_percent = models.PositiveSmallIntegerField(default=10)  # alerta quando faltando x%

    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["titulo"]

    def __str__(self):
        return f"{self.titulo} ({self.modo})"

    def recalc_proximos(self, leitura_atual=None):
        """Recalcula próximos alvos."""
        if self.modo in ("KM", "HORA"):
            base = self.leitura_base if self.leitura_base is not None else (leitura_atual or 0)
            self.proxima_leitura = (base or 0) + self.periodicidade_valor
        elif self.modo == "DIAS":
            base = self.data_base or timezone.now().date()
            from datetime import timedelta
            self.proxima_data = base + timedelta(days=int(self.periodicidade_valor))

    def save(self, *args, **kwargs):
        if not self.pk and not (self.leitura_base or self.data_base):
            # âncora inicial
            if self.modo in ("KM", "HORA"):
                self.leitura_base = self.equipamento.leitura_atual
            else:
                self.data_base = timezone.now().date()
        self.recalc_proximos(leitura_atual=self.equipamento.leitura_atual)
        super().save(*args, **kwargs)


class MedicaoEquipamento(models.Model):
    ORIGEM_CHOICES = [
        ("CHECKLIST", "Checklist"),
        ("ABASTECIMENTO", "Abastecimento"),
        ("MANUTENCAO", "Manutenção"),
        ("MANUAL", "Manual"),
    ]
    equipamento = models.ForeignKey(Equipamento, on_delete=models.CASCADE, related_name="medicoes")
    origem = models.CharField(max_length=20, choices=ORIGEM_CHOICES, default="MANUAL")
    leitura = models.DecimalField(max_digits=12, decimal_places=2)  # km ou horas
    observacao = models.CharField(max_length=255, blank=True, default="")
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-criado_em"]

    def __str__(self):
        return f"{self.equipamento.codigo} {self.leitura} ({self.origem})"
