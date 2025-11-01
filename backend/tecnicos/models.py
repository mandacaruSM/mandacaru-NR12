from django.db import models
from django.core.exceptions import ValidationError

class Tecnico(models.Model):
    # Campo antigo mantido para compatibilidade
    nome = models.CharField(max_length=150, default='', blank=True, verbose_name="Nome")

    # ==================== DADOS PESSOAIS ====================
    nome_completo = models.CharField(max_length=200, blank=True, default='', verbose_name="Nome Completo")
    cpf = models.CharField(
        max_length=14,
        unique=True,
        null=True,
        blank=True,
        verbose_name="CPF",
        help_text="Formato: 000.000.000-00"
    )
    rg = models.CharField(
        max_length=20,
        blank=True,
        default='',
        verbose_name="RG"
    )
    data_nascimento = models.DateField(
        null=True,
        blank=True,
        verbose_name="Data de Nascimento"
    )
    foto = models.ImageField(
        upload_to='tecnicos/%Y/%m/',
        null=True,
        blank=True,
        verbose_name="Foto"
    )

    # ==================== CONTATO ====================
    email = models.EmailField(blank=True, null=True, verbose_name="E-mail")
    telefone = models.CharField(
        max_length=30,
        blank=True,
        null=True,
        verbose_name="Telefone",
        help_text="Formato: (00) 00000-0000"
    )
    telefone_emergencia = models.CharField(
        max_length=20,
        blank=True,
        default='',
        verbose_name="Telefone de Emergência"
    )

    # ==================== ENDEREÇO ====================
    logradouro = models.CharField(max_length=255, blank=True, default='', verbose_name="Logradouro")
    numero = models.CharField(max_length=20, blank=True, default='', verbose_name="Número")
    complemento = models.CharField(max_length=100, blank=True, default='', verbose_name="Complemento")
    bairro = models.CharField(max_length=100, blank=True, default='', verbose_name="Bairro")
    cidade = models.CharField(max_length=100, blank=True, default='', verbose_name="Cidade")
    uf = models.CharField(max_length=2, blank=True, default='', verbose_name="UF")
    cep = models.CharField(max_length=9, blank=True, default='', verbose_name="CEP")

    # ==================== QUALIFICAÇÕES ====================
    especialidade = models.CharField(
        max_length=100,
        blank=True,
        default='',
        verbose_name="Especialidade Principal",
        help_text="Ex: Mecânica Diesel, Hidráulica, Elétrica, etc."
    )
    nivel_experiencia = models.CharField(
        max_length=20,
        choices=[
            ('JUNIOR', 'Júnior'),
            ('PLENO', 'Pleno'),
            ('SENIOR', 'Sênior'),
            ('ESPECIALISTA', 'Especialista'),
        ],
        default='PLENO',
        blank=True,
        verbose_name="Nível de Experiência"
    )
    numero_cnh = models.CharField(
        max_length=20,
        blank=True,
        default='',
        verbose_name="Número CNH"
    )
    categoria_cnh = models.CharField(
        max_length=5,
        blank=True,
        default='',
        verbose_name="Categoria CNH",
        help_text="Ex: B, C, D, E"
    )
    validade_cnh = models.DateField(
        null=True,
        blank=True,
        verbose_name="Validade da CNH"
    )

    # ==================== CERTIFICAÇÕES E CURSOS ====================
    certificacoes = models.TextField(
        blank=True,
        default='',
        verbose_name="Certificações",
        help_text="Liste as certificações relevantes (uma por linha)"
    )
    cursos_treinamentos = models.TextField(
        blank=True,
        default='',
        verbose_name="Cursos e Treinamentos",
        help_text="Liste cursos e treinamentos realizados"
    )

    # ==================== DOCUMENTOS ====================
    documento_cnh = models.FileField(
        upload_to='tecnicos/documentos/cnh/',
        null=True,
        blank=True,
        verbose_name="Documento CNH"
    )
    documento_certificados = models.FileField(
        upload_to='tecnicos/documentos/certificados/',
        null=True,
        blank=True,
        verbose_name="Certificados (PDF)"
    )

    # ==================== OBSERVAÇÕES ====================
    observacoes = models.TextField(
        blank=True,
        default='',
        verbose_name="Observações",
        help_text="Informações adicionais sobre o técnico"
    )

    # ==================== STATUS E DATAS ====================
    ativo = models.BooleanField(default=True, verbose_name="Ativo")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em", null=True, blank=True)

    class Meta:
        ordering = ["nome", "nome_completo"]
        verbose_name = "Técnico"
        verbose_name_plural = "Técnicos"
        indexes = [
            models.Index(fields=["nome"]),
            models.Index(fields=["nome_completo"]),
            models.Index(fields=["cpf"]),
        ]

    def __str__(self):
        return self.nome_completo or self.nome or f"Técnico {self.id}"

    def clean(self):
        """Validações customizadas"""
        if self.cpf:
            cpf_limpo = ''.join(filter(str.isdigit, self.cpf))
            if len(cpf_limpo) != 11:
                raise ValidationError({'cpf': 'CPF deve ter 11 dígitos'})

    def save(self, *args, **kwargs):
        # Sincronizar nome e nome_completo
        if self.nome_completo and not self.nome:
            self.nome = self.nome_completo
        elif self.nome and not self.nome_completo:
            self.nome_completo = self.nome
        super().save(*args, **kwargs)
