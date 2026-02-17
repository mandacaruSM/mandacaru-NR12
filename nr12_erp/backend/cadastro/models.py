import uuid
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

# Importa modelos de planos
from .planos import Plano, AssinaturaCliente

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

    # Usuário vinculado ao cliente para acesso ao sistema
    user = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cliente_profile',
        verbose_name='Usuário do Sistema'
    )

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
        # Se falhar, não impede o salvamento do cliente
        if not self.qr_code:
            try:
                self.gerar_qr_code()
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Erro ao gerar QR code para cliente {self.id}: {e}")

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

    # Geolocalização do empreendimento
    latitude = models.DecimalField(
        max_digits=12,
        decimal_places=8,
        null=True,
        blank=True,
        help_text="Latitude do empreendimento"
    )
    longitude = models.DecimalField(
        max_digits=12,
        decimal_places=8,
        null=True,
        blank=True,
        help_text="Longitude do empreendimento"
    )
    raio_geofence = models.PositiveIntegerField(
        default=500,
        help_text="Raio em metros para validação de geofence (área válida para checklists)"
    )
    endereco_geocodificado = models.CharField(
        max_length=300,
        blank=True,
        default="",
        help_text="Endereço obtido via geocodificação reversa"
    )
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
        # Se falhar, não impede o salvamento do empreendimento
        if not self.qr_code:
            try:
                self.gerar_qr_code()
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Erro ao gerar QR code para empreendimento {self.id}: {e}")

    class Meta:
        ordering = ["nome"]

    def __str__(self):
        return f"{self.nome} ({self.cliente.nome_razao})"
