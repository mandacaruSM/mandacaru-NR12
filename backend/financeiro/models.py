from django.db import models
from django.conf import settings
from decimal import Decimal


class ContaReceber(models.Model):
    STATUS_CHOICES = [
        ('ABERTA', 'Aberta'),
        ('PAGA', 'Paga'),
        ('VENCIDA', 'Vencida'),
        ('CANCELADA', 'Cancelada'),
    ]

    TIPO_CHOICES = [
        ('ORCAMENTO_PRODUTO', 'Orçamento de Produto'),
        ('ORDEM_SERVICO', 'Ordem de Serviço'),
        ('VENDA', 'Venda Direta'),
        ('OUTROS', 'Outros'),
    ]

    # Identificação
    numero = models.CharField(max_length=20, unique=True, editable=False)
    tipo = models.CharField(max_length=30, choices=TIPO_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ABERTA')

    # Relacionamentos de origem
    orcamento = models.ForeignKey(
        'orcamentos.Orcamento',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='contas_receber'
    )
    ordem_servico = models.ForeignKey(
        'ordens_servico.OrdemServico',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='contas_receber'
    )

    # Cliente
    cliente = models.ForeignKey('cadastro.Cliente', on_delete=models.PROTECT, related_name='contas_receber')

    # Datas
    data_emissao = models.DateField(auto_now_add=True)
    data_vencimento = models.DateField()
    data_pagamento = models.DateField(null=True, blank=True)

    # Valores
    valor_original = models.DecimalField(max_digits=12, decimal_places=2)
    valor_juros = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    valor_desconto = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    valor_pago = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    valor_final = models.DecimalField(max_digits=12, decimal_places=2, editable=False)

    # Informações
    descricao = models.TextField(blank=True, default='')
    observacoes = models.TextField(blank=True, default='')

    # Pagamento
    forma_pagamento = models.CharField(max_length=50, blank=True, default='')
    comprovante = models.CharField(max_length=100, blank=True, default='')

    # Controle
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='contas_receber_criadas'
    )
    recebido_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='contas_receber_recebidas'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-data_vencimento']
        verbose_name = 'Conta a Receber'
        verbose_name_plural = 'Contas a Receber'
        indexes = [
            models.Index(fields=['numero']),
            models.Index(fields=['status']),
            models.Index(fields=['cliente', '-data_vencimento']),
            models.Index(fields=['data_vencimento']),
        ]

    def __str__(self):
        return f"{self.numero} - {self.cliente.nome_razao} - R$ {self.valor_original}"

    def save(self, *args, **kwargs):
        if not self.numero:
            # Gerar número da conta
            ultimo = ContaReceber.objects.order_by('-id').first()
            proximo_numero = 1 if not ultimo else ultimo.id + 1
            self.numero = f"CR-{proximo_numero:06d}"

        # Calcular valor final
        self.valor_final = self.valor_original + self.valor_juros - self.valor_desconto

        # Atualizar status automaticamente
        if self.valor_pago >= self.valor_final and self.status == 'ABERTA':
            self.status = 'PAGA'
            if not self.data_pagamento:
                from django.utils import timezone
                self.data_pagamento = timezone.now().date()

        super().save(*args, **kwargs)


class ContaPagar(models.Model):
    STATUS_CHOICES = [
        ('ABERTA', 'Aberta'),
        ('PAGA', 'Paga'),
        ('VENCIDA', 'Vencida'),
        ('CANCELADA', 'Cancelada'),
    ]

    TIPO_CHOICES = [
        ('FORNECEDOR', 'Fornecedor'),
        ('SALARIO', 'Salário'),
        ('IMPOSTO', 'Imposto'),
        ('ALUGUEL', 'Aluguel'),
        ('SERVICO', 'Serviço'),
        ('OUTROS', 'Outros'),
    ]

    # Identificação
    numero = models.CharField(max_length=20, unique=True, editable=False)
    tipo = models.CharField(max_length=30, choices=TIPO_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ABERTA')

    # Fornecedor/Beneficiário
    fornecedor = models.CharField(max_length=200)
    documento_fornecedor = models.CharField(max_length=20, blank=True, default='')

    # Datas
    data_emissao = models.DateField(auto_now_add=True)
    data_vencimento = models.DateField()
    data_pagamento = models.DateField(null=True, blank=True)

    # Valores
    valor_original = models.DecimalField(max_digits=12, decimal_places=2)
    valor_juros = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    valor_desconto = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    valor_pago = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    valor_final = models.DecimalField(max_digits=12, decimal_places=2, editable=False)

    # Informações
    descricao = models.TextField(blank=True, default='')
    observacoes = models.TextField(blank=True, default='')
    numero_documento = models.CharField(max_length=50, blank=True, default='')

    # Pagamento
    forma_pagamento = models.CharField(max_length=50, blank=True, default='')
    comprovante = models.CharField(max_length=100, blank=True, default='')

    # Controle
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='contas_pagar_criadas'
    )
    pago_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='contas_pagar_pagas'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-data_vencimento']
        verbose_name = 'Conta a Pagar'
        verbose_name_plural = 'Contas a Pagar'
        indexes = [
            models.Index(fields=['numero']),
            models.Index(fields=['status']),
            models.Index(fields=['data_vencimento']),
            models.Index(fields=['fornecedor']),
        ]

    def __str__(self):
        return f"{self.numero} - {self.fornecedor} - R$ {self.valor_original}"

    def save(self, *args, **kwargs):
        if not self.numero:
            # Gerar número da conta
            ultimo = ContaPagar.objects.order_by('-id').first()
            proximo_numero = 1 if not ultimo else ultimo.id + 1
            self.numero = f"CP-{proximo_numero:06d}"

        # Calcular valor final
        self.valor_final = self.valor_original + self.valor_juros - self.valor_desconto

        # Atualizar status automaticamente
        if self.valor_pago >= self.valor_final and self.status == 'ABERTA':
            self.status = 'PAGA'
            if not self.data_pagamento:
                from django.utils import timezone
                self.data_pagamento = timezone.now().date()

        super().save(*args, **kwargs)
