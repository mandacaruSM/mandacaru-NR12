from django.db import models
from django.conf import settings
from decimal import Decimal


class OrdemServico(models.Model):
    STATUS_CHOICES = [
        ('ABERTA', 'Aberta'),
        ('EM_EXECUCAO', 'Em Execução'),
        ('CONCLUIDA', 'Concluída'),
        ('CANCELADA', 'Cancelada'),
    ]

    # Identificação
    numero = models.CharField(max_length=20, unique=True, editable=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ABERTA')

    # Origem
    orcamento = models.ForeignKey('orcamentos.Orcamento', on_delete=models.PROTECT, related_name='ordens_servico')

    # Relacionamentos (herdados do orçamento, mas podem ser alterados)
    cliente = models.ForeignKey('cadastro.Cliente', on_delete=models.PROTECT, related_name='ordens_servico')
    empreendimento = models.ForeignKey('cadastro.Empreendimento', on_delete=models.PROTECT, related_name='ordens_servico', null=True, blank=True)
    equipamento = models.ForeignKey('equipamentos.Equipamento', on_delete=models.PROTECT, related_name='ordens_servico', null=True, blank=True)

    # Datas
    data_abertura = models.DateField(auto_now_add=True)
    data_inicio = models.DateField(null=True, blank=True)
    data_conclusao = models.DateField(null=True, blank=True)
    data_prevista = models.DateField()

    # Valores (herdados do orçamento)
    valor_servicos = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    valor_produtos = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    valor_deslocamento = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    valor_desconto = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    valor_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Valores adicionais (podem surgir durante execução)
    valor_adicional = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    valor_final = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Informações
    descricao = models.TextField(blank=True, default='')
    observacoes = models.TextField(blank=True, default='')

    # Execução
    tecnico_responsavel = models.ForeignKey(
        'tecnicos.Tecnico',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ordens_servico_responsavel'
    )

    # Horímetro/KM (para atualização do equipamento)
    horimetro_inicial = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Horímetro/KM no início do serviço'
    )
    horimetro_final = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Horímetro/KM ao finalizar o serviço'
    )

    # Controle
    aberto_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='ordens_servico_abertas')
    concluido_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='ordens_servico_concluidas')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Ordem de Serviço'
        verbose_name_plural = 'Ordens de Serviço'
        indexes = [
            models.Index(fields=['numero']),
            models.Index(fields=['status']),
            models.Index(fields=['cliente', '-data_abertura']),
        ]

    def __str__(self):
        return f"{self.numero} - {self.cliente.nome_razao}"

    def save(self, *args, **kwargs):
        if not self.numero:
            # Gerar número da OS
            ultimo = OrdemServico.objects.order_by('-id').first()
            proximo_numero = 1 if not ultimo else ultimo.id + 1
            self.numero = f"OS-{proximo_numero:06d}"

        # Recalcular valor_total baseado nos componentes
        self.valor_total = (
            self.valor_servicos +
            self.valor_produtos +
            self.valor_deslocamento -
            self.valor_desconto
        )

        # Calcular valor final (total + adicional)
        self.valor_final = self.valor_total + self.valor_adicional

        super().save(*args, **kwargs)


class ItemOrdemServico(models.Model):
    TIPO_CHOICES = [
        ('SERVICO', 'Serviço'),
        ('PRODUTO', 'Produto'),
    ]

    ordem_servico = models.ForeignKey(OrdemServico, on_delete=models.CASCADE, related_name='itens')
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)

    # Produto (se for produto)
    produto = models.ForeignKey('almoxarifado.Produto', on_delete=models.PROTECT, null=True, blank=True)

    # Descrição
    descricao = models.CharField(max_length=255)
    quantidade = models.DecimalField(max_digits=10, decimal_places=2)
    valor_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    valor_total = models.DecimalField(max_digits=10, decimal_places=2, editable=False)

    observacao = models.TextField(blank=True, default='')
    executado = models.BooleanField(default=False)

    class Meta:
        ordering = ['id']
        verbose_name = 'Item da Ordem de Serviço'
        verbose_name_plural = 'Itens da Ordem de Serviço'

    def __str__(self):
        return f"{self.descricao} - {self.quantidade}"

    def save(self, *args, **kwargs):
        # Calcular valor_total sempre que quantidade e valor_unitario estiverem definidos
        # (os campos são NOT NULL no banco, então sempre terão valor após primeira criação)
        if self.quantidade is not None and self.valor_unitario is not None:
            self.valor_total = self.quantidade * self.valor_unitario

        super().save(*args, **kwargs)

        # Atualizar totais da OS
        self.ordem_servico.valor_servicos = sum(
            item.valor_total for item in self.ordem_servico.itens.filter(tipo='SERVICO')
        )
        self.ordem_servico.valor_produtos = sum(
            item.valor_total for item in self.ordem_servico.itens.filter(tipo='PRODUTO')
        )
        self.ordem_servico.save()
