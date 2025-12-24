import uuid
from django.db import models

UF_CHOICES = [
    ("AC","AC"),("AL","AL"),("AP","AP"),("AM","AM"),("BA","BA"),("CE","CE"),("DF","DF"),
    ("ES","ES"),("GO","GO"),("MA","MA"),("MT","MT"),("MS","MS"),("MG","MG"),("PA","PA"),
    ("PB","PB"),("PR","PR"),("PE","PE"),("PI","PI"),("RJ","RJ"),("RN","RN"),("RS","RS"),
    ("RO","RO"),("RR","RR"),("SC","SC"),("SP","SP"),("SE","SE"),("TO","TO"),
]

class Cliente(models.Model):

    TIPO_PESSOA = [("PJ","PJ"), ("PF","PF")]
    tipo_pessoa = models.CharField(max_length=2, choices=TIPO_PESSOA, default="PJ")
    nome_razao = models.CharField(max_length=150)
    documento = models.CharField(
        max_length=20,
        blank=True,
        default="",
        db_index=True
    )
    inscricao_estadual = models.CharField(max_length=20, blank=True, default="")
    email_financeiro = models.EmailField(blank=True, default="")
    telefone = models.CharField(max_length=30, blank=True, default="")

    logradouro = models.CharField(max_length=150, blank=True, default="")
    numero = models.CharField(max_length=20, blank=True, default="")
    complemento = models.CharField(max_length=100, blank=True, default="")
    bairro = models.CharField(max_length=100, blank=True, default="")
    cidade = models.CharField(max_length=100, blank=True, default="")
    uf = models.CharField(max_length=2, choices=UF_CHOICES, blank=True, default="")
    cep = models.CharField(max_length=10, blank=True, default="")

    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    qr_code = models.ImageField(upload_to='qrcodes/clientes/', blank=True, null=True, verbose_name="QR Code")

    @property
    def qr_payload(self) -> str:
        # usado no Telegram: /start=cl:{uuid}
        return f"cl:{self.uuid}"

    def gerar_qr_code(self):
        """Gera e salva o QR code do cliente"""
        from core.qr_utils import save_qr_code_to_file
        filename = f"cliente_{self.id}_{self.uuid}.png"
        qr_file = save_qr_code_to_file(
            data=self.qr_payload,
            filename=filename,
            top_text="MANDACARU S M",
            bottom_text=self.nome_razao
        )
        self.qr_code.save(filename, qr_file, save=True)

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        # Gera QR code automaticamente após salvar
        if not self.qr_code:
            self.gerar_qr_code()

    class Meta:
        ordering = ["nome_razao"]
        constraints = [
            models.UniqueConstraint(
                fields=['tipo_pessoa', 'documento'],
                condition=~models.Q(documento=''),
                name='unique_cliente_documento'
            )
        ]

    def __str__(self):
        return self.nome_razao


class Empreendimento(models.Model):
    TIPO = [("LAVRA","Lavra"), ("OBRA","Obra"), ("PLANTA","Planta"), ("OUTRO","Outro")]
    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, related_name="empreendimentos")
    supervisor = models.ForeignKey(
        'core.Supervisor',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='empreendimentos'
    )
    nome = models.CharField(max_length=150)
    tipo = models.CharField(max_length=10, choices=TIPO, default="LAVRA")
    distancia_km = models.DecimalField(max_digits=8, decimal_places=2, default=0)  # sem API Maps por enquanto
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    # Endereço completo (opcional)
    logradouro = models.CharField(max_length=150, blank=True, default="")
    numero = models.CharField(max_length=20, blank=True, default="")
    complemento = models.CharField(max_length=100, blank=True, default="")
    bairro = models.CharField(max_length=100, blank=True, default="")
    cidade = models.CharField(max_length=100, blank=True, default="")
    uf = models.CharField(max_length=2, blank=True, default="")
    cep = models.CharField(max_length=10, blank=True, default="")

    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    qr_code = models.ImageField(upload_to='qrcodes/empreendimentos/', blank=True, null=True, verbose_name="QR Code")

    @property
    def qr_payload(self) -> str:
        # usado no Telegram para identificar empreendimento
        return f"emp:{self.uuid}"

    def gerar_qr_code(self):
        """Gera e salva o QR code do empreendimento"""
        from core.qr_utils import save_qr_code_to_file
        filename = f"empreendimento_{self.id}_{self.uuid}.png"
        qr_file = save_qr_code_to_file(
            data=self.qr_payload,
            filename=filename,
            top_text="MANDACARU S M",
            bottom_text=self.nome
        )
        self.qr_code.save(filename, qr_file, save=True)

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        # Gera QR code automaticamente após salvar
        if not self.qr_code:
            self.gerar_qr_code()

    class Meta:
        ordering = ["nome"]

    def __str__(self):
        return f"{self.nome} ({self.cliente.nome_razao})"
