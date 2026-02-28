import uuid
from django.db import models
from django.utils import timezone
from simple_history.models import HistoricalRecords

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

    # Consumo nominal de combustível
    consumo_nominal_L_h = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Consumo Nominal (L/h)",
        help_text="Consumo de combustível em litros por hora (para equipamentos com horímetro)"
    )
    consumo_nominal_km_L = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Consumo Nominal (km/L)",
        help_text="Consumo de combustível em quilômetros por litro (para veículos)"
    )

    # Tracking de manutenção e operação
    data_ultima_leitura = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Data da Última Leitura',
        help_text='Data/hora da última atualização do horímetro/odômetro'
    )

    status_operacional = models.CharField(
        max_length=20,
        choices=[
            ('OPERACIONAL', 'Operacional'),
            ('EM_MANUTENCAO', 'Em Manutenção'),
            ('PARADO', 'Parado'),
            ('DESATIVADO', 'Desativado'),
        ],
        default='OPERACIONAL',
        verbose_name='Status Operacional'
    )

    data_ultima_manutencao = models.DateField(
        null=True,
        blank=True,
        verbose_name='Data da Última Manutenção',
        help_text='Data da última manutenção preventiva ou corretiva realizada'
    )

    leitura_ultima_manutencao = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='Leitura na Última Manutenção',
        help_text='Horímetro/KM registrado na última manutenção'
    )

    proxima_manutencao_leitura = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='Próxima Manutenção (Leitura)',
        help_text='Leitura prevista para próxima manutenção preventiva'
    )

    proxima_manutencao_data = models.DateField(
        null=True,
        blank=True,
        verbose_name='Próxima Manutenção (Data)',
        help_text='Data prevista para próxima manutenção preventiva'
    )

    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    qr_code = models.ImageField(upload_to='qrcodes/equipamentos/', blank=True, null=True, verbose_name="QR Code")

    # Auditoria: registra quem criou/alterou e quando
    history = HistoricalRecords(
        history_change_reason_field=models.TextField(null=True),
        table_name='equipamentos_equipamento_history'
    )

    @property
    def qr_payload(self) -> str:
        from django.conf import settings
        base_url = getattr(settings, 'ERP_PUBLIC_BASE_URL', 'https://erp.mandacaru.com.br').rstrip('/')
        return f"{base_url}/dashboard/equipamento/{self.uuid}"

    def gerar_qr_code(self):
        """Gera e salva o QR code do equipamento"""
        from core.qr_utils import save_qr_code_to_file
        filename = f"equipamento_{self.id}_{self.uuid}.png"
        # Usar código + descrição como texto inferior
        bottom_text = f"{self.codigo} - {self.descricao or self.modelo}"
        qr_file = save_qr_code_to_file(
            data=self.qr_payload,
            filename=filename,
            top_text="MANDACARU S M",
            bottom_text=bottom_text
        )
        self.qr_code.save(filename, qr_file, save=True)

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        # Gera QR code automaticamente após salvar
        if not self.qr_code:
            self.gerar_qr_code()

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


class ItemManutencao(models.Model):
    """Item de manutenção vinculado a um equipamento (filtros, óleos, correias, etc.)"""
    CATEGORIA_CHOICES = [
        ('FILTRO', 'Filtro'),
        ('OLEO', 'Óleo/Lubrificante'),
        ('CORREIA', 'Correia'),
        ('PNEU', 'Pneu'),
        ('BATERIA', 'Bateria'),
        ('FLUIDO', 'Fluido'),
        ('OUTRO', 'Outro'),
    ]

    equipamento = models.ForeignKey(
        Equipamento,
        on_delete=models.CASCADE,
        related_name="itens_manutencao"
    )
    produto = models.ForeignKey(
        'almoxarifado.Produto',
        on_delete=models.PROTECT,
        related_name="itens_manutencao",
        help_text="Produto do almoxarifado vinculado a este item"
    )
    categoria = models.CharField(
        max_length=20,
        choices=CATEGORIA_CHOICES,
        default='OUTRO',
        help_text="Categoria do item de manutenção"
    )
    descricao = models.CharField(
        max_length=200,
        blank=True,
        default="",
        help_text="Descrição adicional ou localização do item"
    )
    quantidade_necessaria = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=1,
        help_text="Quantidade necessária por manutenção"
    )
    periodicidade_km = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Periodicidade em KM (para equipamentos com odômetro)"
    )
    periodicidade_horas = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Periodicidade em horas (para equipamentos com horímetro)"
    )
    periodicidade_dias = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Periodicidade em dias (alternativa à leitura)"
    )
    ativo = models.BooleanField(default=True)
    observacoes = models.TextField(blank=True, default="")
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["categoria", "produto__nome"]
        verbose_name = "Item de Manutenção"
        verbose_name_plural = "Itens de Manutenção"

    def __str__(self):
        return f"{self.equipamento.codigo} - {self.get_categoria_display()}: {self.produto.nome}"


class MedicaoEquipamento(models.Model):
    ORIGEM_CHOICES = [
        ("CHECKLIST", "Checklist"),
        ("ABASTECIMENTO", "Abastecimento"),
        ("MANUTENCAO", "Manutenção"),
        ("MANUTENCAO_PREVENTIVA", "Manutenção Preventiva"),
        ("MANUAL", "Manual"),
    ]
    equipamento = models.ForeignKey(Equipamento, on_delete=models.CASCADE, related_name="medicoes")
    origem = models.CharField(max_length=30, choices=ORIGEM_CHOICES, default="MANUAL")
    leitura = models.DecimalField(max_digits=12, decimal_places=2)  # km ou horas
    observacao = models.CharField(max_length=255, blank=True, default="")
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-criado_em"]

    def __str__(self):
        return f"{self.equipamento.codigo} {self.leitura} ({self.origem})"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Atualiza leitura_atual do equipamento se a nova leitura for maior
        if self.leitura and self.leitura > (self.equipamento.leitura_atual or 0):
            self.equipamento.leitura_atual = self.leitura
            self.equipamento.save(update_fields=['leitura_atual'])
