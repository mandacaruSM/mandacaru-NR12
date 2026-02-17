# backend/core/models.py
from django.conf import settings
from django.contrib.auth.models import User
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
from .validators import validate_cpf
import secrets


class Profile(models.Model):
    ROLE_CHOICES = [
        ("ADMIN", "Administrador"),
        ("SUPERVISOR", "Supervisor"),
        ("OPERADOR", "Operador"),
        ("TECNICO", "Técnico"),
        ("FINANCEIRO", "Financeiro"),
        ("COMPRAS", "Compras"),
        ("CLIENTE", "Cliente"),
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
    # ==================== ACESSO WEB ====================
    user = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='operador_profile',
        verbose_name='Usuário do Sistema'
    )

    # ==================== DADOS PESSOAIS ====================
    nome_completo = models.CharField(max_length=200, verbose_name="Nome Completo")
    cpf = models.CharField(
        max_length=14,
        unique=True,
        validators=[validate_cpf],
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
    empreendimentos_vinculados = models.ManyToManyField(
        'cadastro.Empreendimento',
        related_name='operadores_vinculados',
        verbose_name="Empreendimentos",
        blank=True
    )
    equipamentos_autorizados = models.ManyToManyField(
        'equipamentos.Equipamento',
        through='OperadorEquipamento',
        related_name='operadores_autorizados',
        verbose_name="Equipamentos Autorizados",
        blank=True
    )
    
    # ==================== CONFORMIDADE NR12 ====================
    funcao = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Função",
        help_text="Ex: Operador de Escavadeira, Operador de Pá Carregadeira"
    )
    matricula = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Matrícula",
        help_text="Número de matrícula do funcionário"
    )

    # Curso de Formação NR12
    nr12_curso_data_conclusao = models.DateField(
        null=True,
        blank=True,
        verbose_name="Data Conclusão Curso NR12",
        help_text="Data de conclusão do curso de formação NR12"
    )
    nr12_curso_carga_horaria = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Carga Horária (horas)",
        help_text="Carga horária do curso de formação"
    )
    nr12_entidade_formadora = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Entidade Formadora",
        help_text="Nome da entidade que ministrou o curso"
    )
    nr12_certificado = models.FileField(
        upload_to='operadores/certificados/%Y/%m/',
        null=True,
        blank=True,
        verbose_name="Certificado NR12",
        help_text="Upload do certificado em PDF ou imagem"
    )

    # Reciclagem NR12
    nr12_reciclagem_vencimento = models.DateField(
        null=True,
        blank=True,
        verbose_name="Vencimento da Reciclagem",
        help_text="Data de vencimento da reciclagem NR12"
    )
    nr12_reciclagem_certificado = models.FileField(
        upload_to='operadores/reciclagens/%Y/%m/',
        null=True,
        blank=True,
        verbose_name="Certificado Reciclagem",
        help_text="Upload do certificado de reciclagem"
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

    # ==================== PROPRIEDADES NR12 ====================
    @property
    def nr12_status(self):
        """
        Retorna status da conformidade NR12:
        - VERDE: Tudo em dia
        - AMARELO: Reciclagem vence em menos de 30 dias
        - VERMELHO: Reciclagem vencida ou sem curso
        """
        from datetime import date, timedelta
        hoje = date.today()

        # Sem curso = VERMELHO
        if not self.nr12_curso_data_conclusao:
            return 'VERMELHO'

        # Sem data de reciclagem = considerar só o curso
        if not self.nr12_reciclagem_vencimento:
            # Se curso foi há mais de 2 anos sem reciclagem = VERMELHO
            if self.nr12_curso_data_conclusao < (hoje - timedelta(days=730)):
                return 'VERMELHO'
            return 'VERDE'

        # Reciclagem vencida = VERMELHO
        if self.nr12_reciclagem_vencimento < hoje:
            return 'VERMELHO'

        # Reciclagem vence em menos de 30 dias = AMARELO
        if self.nr12_reciclagem_vencimento < (hoje + timedelta(days=30)):
            return 'AMARELO'

        return 'VERDE'

    @property
    def nr12_dias_para_vencer(self):
        """Dias até vencimento da reciclagem (negativo se já venceu)"""
        from datetime import date
        if not self.nr12_reciclagem_vencimento:
            return None
        return (self.nr12_reciclagem_vencimento - date.today()).days

    @property
    def nr12_pode_operar(self):
        """Retorna True se operador está apto a operar conforme NR12"""
        return self.nr12_status != 'VERMELHO'

    def tem_autorizacao_equipamento_especifico(self, equipamento):
        """
        Verifica se operador tem treinamento específico para o modelo do equipamento.
        O MTE exige treinamento na máquina específica.
        """
        return self.equipamentos_autorizados.filter(id=equipamento.id, ativo=True).exists()


class Supervisor(models.Model):
    """
    Supervisor/Encarregado - gerencia operadores e equipamentos
    """
    # ==================== ACESSO WEB ====================
    user = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='supervisor_profile',
        verbose_name='Usuário do Sistema'
    )

    # ==================== DADOS PESSOAIS ====================
    nome_completo = models.CharField(max_length=200, verbose_name="Nome Completo")
    cpf = models.CharField(
        max_length=14,
        unique=True,
        validators=[validate_cpf],
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
    # Endereço
    logradouro = models.CharField(max_length=255, blank=True, verbose_name="Logradouro")
    numero = models.CharField(max_length=20, blank=True, verbose_name="Número")
    complemento = models.CharField(max_length=100, blank=True, verbose_name="Complemento")
    bairro = models.CharField(max_length=100, blank=True, verbose_name="Bairro")
    cidade = models.CharField(max_length=100, blank=True, verbose_name="Cidade")
    uf = models.CharField(max_length=2, blank=True, verbose_name="UF")
    cep = models.CharField(max_length=9, blank=True, verbose_name="CEP")
    
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
    empreendimentos_vinculados = models.ManyToManyField(
        'cadastro.Empreendimento',
        related_name='supervisores_vinculados',
        verbose_name="Empreendimentos",
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

    def desvincular_telegram(self):
        """Desvincula conta do Telegram do supervisor"""
        self.telegram_chat_id = None
        self.telegram_username = ''
        self.telegram_vinculado_em = None
        self.save(update_fields=[
            'telegram_chat_id',
            'telegram_username',
            'telegram_vinculado_em'
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
