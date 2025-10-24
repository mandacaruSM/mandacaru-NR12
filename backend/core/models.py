# backend/core/models.py
from django.conf import settings
from django.contrib.auth.models import User
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
import secrets


class Profile(models.Model):
    ROLE_CHOICES = [
        ("ADMIN", "Administrador"),
        ("SUPERVISOR", "Supervisor"),
        ("OPERADOR", "Operador"),
        ("TECNICO", "Técnico"),
        ("FINANCEIRO", "Financeiro"),
        ("COMPRAS", "Compras"),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="ADMIN")
    modules_enabled = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f"{self.user.username} ({self.role})"


class AuditLog(models.Model):
    source = models.CharField(max_length=10, default="WEB")  # WEB/BOT/API
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=200)
    path = models.CharField(max_length=500)
    method = models.CharField(max_length=10)
    before_json = models.JSONField(null=True, blank=True)
    after_json = models.JSONField(null=True, blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Log de Auditoria'
        verbose_name_plural = 'Logs de Auditoria'


class Operador(models.Model):
    """
    Operador de equipamentos - pode ser vinculado via Telegram ou Web
    """
    # ==================== DADOS PESSOAIS ====================
    nome_completo = models.CharField(max_length=200, verbose_name="Nome Completo")
    cpf = models.CharField(
        max_length=14, 
        unique=True, 
        verbose_name="CPF",
        help_text="Formato: 000.000.000-00"
    )
    data_nascimento = models.DateField(verbose_name="Data de Nascimento")
    foto = models.ImageField(
        upload_to='operadores/%Y/%m/',
        null=True,
        blank=True,
        verbose_name="Foto"
    )
    
    # ==================== CONTATO ====================
    email = models.EmailField(blank=True, verbose_name="E-mail")
    telefone = models.CharField(
        max_length=20, 
        blank=True,
        verbose_name="Telefone",
        help_text="Formato: (00) 00000-0000"
    )
    
    # ==================== TELEGRAM ====================
    telegram_chat_id = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        unique=True,
        verbose_name="Telegram Chat ID",
        help_text="ID único do chat do Telegram"
    )
    telegram_username = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Username do Telegram",
        help_text="@username do operador no Telegram"
    )
    telegram_vinculado_em = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Data de vinculação do Telegram"
    )
    
    # ==================== CÓDIGO DE VINCULAÇÃO ====================
    codigo_vinculacao = models.CharField(
        max_length=8,
        unique=True,
        null=True,
        blank=True,
        verbose_name="Código de Vinculação",
        help_text="Código de 8 dígitos para vincular Telegram"
    )
    codigo_valido_ate = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Código válido até"
    )
    
    # ==================== ENDEREÇO ====================
    logradouro = models.CharField(max_length=255, blank=True, verbose_name="Logradouro")
    numero = models.CharField(max_length=20, blank=True, verbose_name="Número")
    complemento = models.CharField(max_length=100, blank=True, verbose_name="Complemento")
    bairro = models.CharField(max_length=100, blank=True, verbose_name="Bairro")
    cidade = models.CharField(max_length=100, blank=True, verbose_name="Cidade")
    uf = models.CharField(max_length=2, blank=True, verbose_name="UF")
    cep = models.CharField(max_length=9, blank=True, verbose_name="CEP")
    
    # ==================== RELACIONAMENTOS ====================
    clientes = models.ManyToManyField(
        'cadastro.Cliente',
        through='OperadorCliente',
        related_name='operadores',
        verbose_name="Clientes"
    )
    equipamentos_autorizados = models.ManyToManyField(
        'equipamentos.Equipamento',
        through='OperadorEquipamento',
        related_name='operadores_autorizados',
        verbose_name="Equipamentos Autorizados",
        blank=True
    )
    
    # ==================== STATUS E DATAS ====================
    ativo = models.BooleanField(default=True, verbose_name="Ativo")
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    criado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='operadores_criados',
        verbose_name="Criado por"
    )
    
    class Meta:
        ordering = ['nome_completo']
        verbose_name = 'Operador'
        verbose_name_plural = 'Operadores'
        indexes = [
            models.Index(fields=['cpf']),
            models.Index(fields=['telegram_chat_id']),
            models.Index(fields=['codigo_vinculacao']),
        ]
    
    def __str__(self):
        return f"{self.nome_completo}"
    
    def clean(self):
        """Validações customizadas"""
        # Validar formato CPF básico
        if self.cpf:
            cpf_limpo = ''.join(filter(str.isdigit, self.cpf))
            if len(cpf_limpo) != 11:
                raise ValidationError({'cpf': 'CPF deve ter 11 dígitos'})
    
    def gerar_codigo_vinculacao(self):
        """Gera código de 8 dígitos para vincular Telegram"""
        from django.utils import timezone
        from datetime import timedelta
        
        # Gerar código único
        while True:
            codigo = ''.join([str(secrets.randbelow(10)) for _ in range(8)])
            if not Operador.objects.filter(codigo_vinculacao=codigo).exists():
                break
        
        self.codigo_vinculacao = codigo
        self.codigo_valido_ate = timezone.now() + timedelta(hours=24)
        self.save(update_fields=['codigo_vinculacao', 'codigo_valido_ate'])
        return codigo
    
    def vincular_telegram(self, chat_id, username=None):
        """Vincula conta do Telegram ao operador"""
        from django.utils import timezone
        
        self.telegram_chat_id = str(chat_id)
        self.telegram_username = username or ''
        self.telegram_vinculado_em = timezone.now()
        self.codigo_vinculacao = None  # Limpa o código usado
        self.codigo_valido_ate = None
        self.save(update_fields=[
            'telegram_chat_id', 
            'telegram_username', 
            'telegram_vinculado_em',
            'codigo_vinculacao',
            'codigo_valido_ate'
        ])
    
    def desvincular_telegram(self):
        """Remove vinculação do Telegram"""
        self.telegram_chat_id = None
        self.telegram_username = ''
        self.telegram_vinculado_em = None
        self.save(update_fields=[
            'telegram_chat_id',
            'telegram_username',
            'telegram_vinculado_em'
        ])
    
    def tem_acesso_equipamento(self, equipamento_id):
        """Verifica se operador tem acesso ao equipamento"""
        return self.equipamentos_autorizados.filter(id=equipamento_id).exists()
    
    @property
    def telegram_vinculado(self):
        """Retorna True se Telegram está vinculado"""
        return bool(self.telegram_chat_id)
    
    @property
    def total_checklists(self):
        """Total de checklists realizados"""
        return self.checklists.count()
    
    @property
    def taxa_aprovacao(self):
        """Percentual de checklists aprovados"""
        total = self.checklists.filter(status='CONCLUIDO').count()
        if total == 0:
            return 0
        aprovados = self.checklists.filter(resultado_geral='APROVADO').count()
        return round((aprovados / total) * 100, 2)


class Supervisor(models.Model):
    """
    Supervisor/Encarregado - gerencia operadores e equipamentos
    """
    # ==================== DADOS PESSOAIS ====================
    nome_completo = models.CharField(max_length=200, verbose_name="Nome Completo")
    cpf = models.CharField(
        max_length=14,
        unique=True,
        verbose_name="CPF",
        help_text="Formato: 000.000.000-00"
    )
    data_nascimento = models.DateField(verbose_name="Data de Nascimento")
    foto = models.ImageField(
        upload_to='supervisores/%Y/%m/',
        null=True,
        blank=True,
        verbose_name="Foto"
    )
    
    # ==================== CONTATO ====================
    email = models.EmailField(blank=True, verbose_name="E-mail")
    telefone = models.CharField(max_length=20, blank=True, verbose_name="Telefone")
    
    # ==================== TELEGRAM ====================
    telegram_chat_id = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        unique=True,
        verbose_name="Telegram Chat ID"
    )
    telegram_username = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Username do Telegram"
    )
    telegram_vinculado_em = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Data de vinculação do Telegram"
    )
    
    # ==================== CÓDIGO DE VINCULAÇÃO ====================
    codigo_vinculacao = models.CharField(
        max_length=8,
        unique=True,
        null=True,
        blank=True,
        verbose_name="Código de Vinculação"
    )
    codigo_valido_ate = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Código válido até"
    )
    
    # ==================== RELACIONAMENTOS ====================
    clientes = models.ManyToManyField(
        'cadastro.Cliente',
        related_name='supervisores',
        verbose_name="Clientes",
        blank=True
    )
    operadores_supervisionados = models.ManyToManyField(
        Operador,
        related_name='supervisores',
        verbose_name="Operadores Supervisionados",
        blank=True
    )
    
    # ==================== STATUS E DATAS ====================
    ativo = models.BooleanField(default=True, verbose_name="Ativo")
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    criado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='supervisores_criados',
        verbose_name="Criado por"
    )
    
    class Meta:
        ordering = ['nome_completo']
        verbose_name = 'Supervisor'
        verbose_name_plural = 'Supervisores'
        indexes = [
            models.Index(fields=['cpf']),
            models.Index(fields=['telegram_chat_id']),
        ]
    
    def __str__(self):
        return f"{self.nome_completo}"
    
    def gerar_codigo_vinculacao(self):
        """Gera código de 8 dígitos para vincular Telegram"""
        from django.utils import timezone
        from datetime import timedelta
        
        while True:
            codigo = ''.join([str(secrets.randbelow(10)) for _ in range(8)])
            if not Supervisor.objects.filter(codigo_vinculacao=codigo).exists():
                break
        
        self.codigo_vinculacao = codigo
        self.codigo_valido_ate = timezone.now() + timedelta(hours=24)
        self.save(update_fields=['codigo_vinculacao', 'codigo_valido_ate'])
        return codigo
    
    def vincular_telegram(self, chat_id, username=None):
        """Vincula conta do Telegram ao supervisor"""
        from django.utils import timezone
        
        self.telegram_chat_id = str(chat_id)
        self.telegram_username = username or ''
        self.telegram_vinculado_em = timezone.now()
        self.codigo_vinculacao = None
        self.codigo_valido_ate = None
        self.save(update_fields=[
            'telegram_chat_id',
            'telegram_username',
            'telegram_vinculado_em',
            'codigo_vinculacao',
            'codigo_valido_ate'
        ])
    
    @property
    def telegram_vinculado(self):
        return bool(self.telegram_chat_id)


class OperadorCliente(models.Model):
    """
    Relacionamento M2M entre Operador e Cliente
    Define a quais clientes o operador está vinculado
    """
    operador = models.ForeignKey(
        Operador,
        on_delete=models.CASCADE,
        related_name='vinculos_clientes',
        verbose_name="Operador"
    )
    cliente = models.ForeignKey(
        'cadastro.Cliente',
        on_delete=models.CASCADE,
        related_name='vinculos_operadores',
        verbose_name="Cliente"
    )
    data_vinculo = models.DateField(auto_now_add=True, verbose_name="Data de Vínculo")
    ativo = models.BooleanField(default=True, verbose_name="Ativo")
    vinculado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vinculos_operador_cliente_criados',
        verbose_name="Vinculado por"
    )
    observacoes = models.TextField(blank=True, verbose_name="Observações")
    
    class Meta:
        unique_together = ['operador', 'cliente']
        verbose_name = 'Vínculo Operador-Cliente'
        verbose_name_plural = 'Vínculos Operador-Cliente'
        ordering = ['-data_vinculo']
    
    def __str__(self):
        return f"{self.operador.nome_completo} → {self.cliente.nome_razao}"


class OperadorEquipamento(models.Model):
    """
    Controle de autorização de operadores em equipamentos específicos
    """
    operador = models.ForeignKey(
        Operador,
        on_delete=models.CASCADE,
        related_name='autorizacoes_equipamentos',
        verbose_name="Operador"
    )
    equipamento = models.ForeignKey(
        'equipamentos.Equipamento',
        on_delete=models.CASCADE,
        related_name='autorizacoes_operadores',
        verbose_name="Equipamento"
    )
    data_autorizacao = models.DateField(auto_now_add=True, verbose_name="Data de Autorização")
    data_validade = models.DateField(
        null=True,
        blank=True,
        verbose_name="Válido até",
        help_text="Deixe em branco para autorização permanente"
    )
    autorizado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='autorizacoes_concedidas',
        verbose_name="Autorizado por"
    )
    observacoes = models.TextField(blank=True, verbose_name="Observações")
    ativo = models.BooleanField(default=True, verbose_name="Ativo")
    
    class Meta:
        unique_together = ['operador', 'equipamento']
        verbose_name = 'Autorização de Equipamento'
        verbose_name_plural = 'Autorizações de Equipamentos'
        ordering = ['-data_autorizacao']
    
    def __str__(self):
        return f"{self.operador.nome_completo} → {self.equipamento.codigo}"
    
    def esta_valido(self):
        """Verifica se a autorização ainda está válida"""
        if not self.ativo:
            return False
        if self.data_validade:
            from django.utils import timezone
            return timezone.now().date() <= self.data_validade
        return True