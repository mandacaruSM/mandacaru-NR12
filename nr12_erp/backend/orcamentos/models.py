from django.db import models
from django.conf import settings
from decimal import Decimal


class Orcamento(models.Model):
    TIPO_CHOICES = [
        ('MANUTENCAO_CORRETIVA', 'Manutenção Corretiva'),
        ('MANUTENCAO_PREVENTIVA', 'Manutenção Preventiva'),
        ('PRODUTO', 'Venda de Produto'),
    ]

    STATUS_CHOICES = [
        ('RASCUNHO', 'Rascunho'),
        ('ENVIADO', 'Enviado ao Cliente'),
        ('APROVADO', 'Aprovado'),
        ('REJEITADO', 'Rejeitado'),
        ('CANCELADO', 'Cancelado'),
    ]

    # Identificação
    numero = models.CharField(max_length=20, unique=True, editable=False)
    tipo = models.CharField(max_length=30, choices=TIPO_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='RASCUNHO')

    # Relacionamentos
    cliente = models.ForeignKey('cadastro.Cliente', on_delete=models.PROTECT, related_name='orcamentos')
    empreendimento = models.ForeignKey('cadastro.Empreendimento', on_delete=models.PROTECT, related_name='orcamentos', null=True, blank=True)
    equipamento = models.ForeignKey('equipamentos.Equipamento', on_delete=models.PROTECT, related_name='orcamentos', null=True, blank=True)

    # Datas
    data_emissao = models.DateField(auto_now_add=True)
    data_validade = models.DateField()
    data_aprovacao = models.DateField(null=True, blank=True)

    # Valores
    valor_servicos = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    valor_produtos = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Deslocamento
    km_deslocado = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name='KM Deslocado')
    valor_km = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name='Valor do KM')
    valor_deslocamento = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name='Valor do Deslocamento')

    valor_desconto = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    valor_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Informações
    descricao = models.TextField(blank=True, default='')
    observacoes = models.TextField(blank=True, default='')
    prazo_execucao_dias = models.PositiveIntegerField(default=1, help_text='Prazo em dias para execução')

    # Controle
    criado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='orcamentos_criados')
    aprovado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='orcamentos_aprovados')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['numero']),
            models.Index(fields=['cliente', '-data_emissao']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.numero} - {self.cliente.nome_razao}"

    def save(self, *args, **kwargs):
        if not self.numero:
            # Gerar número do orçamento
            ultimo = Orcamento.objects.order_by('-id').first()
            proximo_numero = 1 if not ultimo else ultimo.id + 1
            self.numero = f"ORC-{proximo_numero:06d}"

        # Calcular total
        self.calcular_total()
        super().save(*args, **kwargs)

    def calcular_total(self):
        """Calcula o valor total do orçamento"""
        self.valor_total = (
            self.valor_servicos +
            self.valor_produtos +
            self.valor_deslocamento -
            self.valor_desconto
        )


class ItemOrcamento(models.Model):
    TIPO_CHOICES = [
        ('SERVICO', 'Serviço'),
        ('PRODUTO', 'Produto'),
    ]

    orcamento = models.ForeignKey(Orcamento, on_delete=models.CASCADE, related_name='itens')
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)

    # Produto (se for produto)
    produto = models.ForeignKey('almoxarifado.Produto', on_delete=models.PROTECT, null=True, blank=True)

    # Descrição (para serviços ou override de produto)
    descricao = models.CharField(max_length=255)
    quantidade = models.DecimalField(max_digits=10, decimal_places=2)
    valor_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    valor_total = models.DecimalField(max_digits=10, decimal_places=2, editable=False)

    observacao = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"{self.descricao} - {self.quantidade}"

    def save(self, *args, **kwargs):
        # Calcular valor_total apenas se quantidade e valor_unitario estiverem definidos
        if self.quantidade is not None and self.valor_unitario is not None:
            self.valor_total = self.quantidade * self.valor_unitario
        elif self.valor_total is None:
            self.valor_total = 0

        super().save(*args, **kwargs)

        # Atualizar totais do orçamento
        self.orcamento.valor_servicos = sum(
            item.valor_total for item in self.orcamento.itens.filter(tipo='SERVICO')
        )
        self.orcamento.valor_produtos = sum(
            item.valor_total for item in self.orcamento.itens.filter(tipo='PRODUTO')
        )
        self.orcamento.save()
