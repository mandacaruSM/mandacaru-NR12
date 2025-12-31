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
        if self.valor_pago >= self.valor_final and self.status in ['ABERTA', 'VENCIDA']:
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
        if self.valor_pago >= self.valor_final and self.status in ['ABERTA', 'VENCIDA']:
            self.status = 'PAGA'
            if not self.data_pagamento:
                from django.utils import timezone
                self.data_pagamento = timezone.now().date()

        super().save(*args, **kwargs)


class Pagamento(models.Model):
    """
    Modelo para registro detalhado de pagamentos.
    Permite múltiplos pagamentos parciais para uma mesma ContaReceber.
    """

    TIPO_PAGAMENTO_CHOICES = [
        ('TOTAL', 'Pagamento Total'),
        ('ADIANTAMENTO', 'Adiantamento'),
        ('PARCIAL', 'Pagamento Parcial'),
    ]

    FORMA_PAGAMENTO_CHOICES = [
        ('DINHEIRO', 'Dinheiro'),
        ('PIX', 'PIX'),
        ('CHEQUE', 'Cheque'),
        ('BOLETO', 'Boleto Bancário'),
        ('DEPOSITO', 'Depósito Bancário'),
        ('TRANSFERENCIA', 'Transferência Bancária'),
        ('CARTAO_CREDITO', 'Cartão de Crédito'),
        ('CARTAO_DEBITO', 'Cartão de Débito'),
    ]

    STATUS_CHOICES = [
        ('PENDENTE', 'Pendente'),
        ('CONFIRMADO', 'Confirmado'),
        ('CANCELADO', 'Cancelado'),
    ]

    # Identificação
    numero = models.CharField(max_length=20, unique=True, editable=False)

    # Relacionamento
    conta_receber = models.ForeignKey(
        'ContaReceber',
        on_delete=models.PROTECT,
        related_name='pagamentos'
    )

    # Tipo e status
    tipo_pagamento = models.CharField(max_length=20, choices=TIPO_PAGAMENTO_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='CONFIRMADO')

    # Valores
    valor = models.DecimalField(max_digits=12, decimal_places=2)
    valor_desconto = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    valor_final = models.DecimalField(max_digits=12, decimal_places=2, editable=False)

    # Informações do pagamento
    forma_pagamento = models.CharField(max_length=30, choices=FORMA_PAGAMENTO_CHOICES)
    data_pagamento = models.DateField()

    # Parcelamento (se aplicável)
    numero_parcela = models.IntegerField(null=True, blank=True)
    total_parcelas = models.IntegerField(null=True, blank=True)

    # Dados adicionais conforme forma de pagamento
    numero_cheque = models.CharField(max_length=50, blank=True, default='')
    banco_cheque = models.CharField(max_length=100, blank=True, default='')
    data_compensacao = models.DateField(null=True, blank=True)  # Para cheques

    numero_documento = models.CharField(max_length=100, blank=True, default='')  # Boleto, Depósito, etc.
    comprovante = models.CharField(max_length=200, blank=True, default='')

    # Observações
    observacoes = models.TextField(blank=True, default='')

    # Controle
    registrado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='pagamentos_registrados'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-data_pagamento', '-created_at']
        verbose_name = 'Pagamento'
        verbose_name_plural = 'Pagamentos'
        indexes = [
            models.Index(fields=['numero']),
            models.Index(fields=['conta_receber', '-data_pagamento']),
            models.Index(fields=['data_pagamento']),
            models.Index(fields=['forma_pagamento']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        parcela_info = f" ({self.numero_parcela}/{self.total_parcelas})" if self.numero_parcela else ""
        return f"{self.numero} - {self.get_forma_pagamento_display()} - R$ {self.valor}{parcela_info}"

    def save(self, *args, **kwargs):
        if not self.numero:
            # Gerar número do pagamento
            ultimo = Pagamento.objects.order_by('-id').first()
            proximo_numero = 1 if not ultimo else ultimo.id + 1
            self.numero = f"PAG-{proximo_numero:06d}"

        # Calcular valor final
        self.valor_final = self.valor - self.valor_desconto

        super().save(*args, **kwargs)

        # Atualizar valor_pago da ContaReceber
        if self.status == 'CONFIRMADO':
            self._atualizar_conta_receber()

    def _atualizar_conta_receber(self):
        """Atualiza o valor pago total na ContaReceber"""
        from django.db.models import Sum
        from django.db import transaction

        # Usar transaction.atomic para garantir consistência
        with transaction.atomic():
            # Refresh da conta para pegar valores mais recentes
            conta = ContaReceber.objects.select_for_update().get(pk=self.conta_receber.pk)

            # Calcular total pago de todos os pagamentos confirmados
            total_pago = Pagamento.objects.filter(
                conta_receber=conta,
                status='CONFIRMADO'
            ).aggregate(total=Sum('valor_final'))['total'] or Decimal('0')

            conta.valor_pago = total_pago
            conta.save()
