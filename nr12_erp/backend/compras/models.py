from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator

User = get_user_model()


class Fornecedor(models.Model):
    """Cadastro de fornecedores de peças e materiais"""
    nome = models.CharField(max_length=200, verbose_name="Nome / Razão Social")
    cnpj_cpf = models.CharField(max_length=20, blank=True, default='', verbose_name="CNPJ/CPF")
    contato = models.CharField(max_length=150, blank=True, default='', verbose_name="Pessoa de Contato")
    telefone = models.CharField(max_length=30, blank=True, default='', verbose_name="Telefone")
    whatsapp = models.CharField(max_length=30, blank=True, default='', verbose_name="WhatsApp")
    email = models.EmailField(blank=True, null=True, verbose_name="E-mail")
    especialidade = models.CharField(
        max_length=200, blank=True, default='',
        verbose_name="Especialidade",
        help_text="Ex: Peças Hidráulicas, Filtros, Material Elétrico"
    )
    # Endereço
    logradouro = models.CharField(max_length=255, blank=True, default='')
    numero = models.CharField(max_length=20, blank=True, default='')
    complemento = models.CharField(max_length=100, blank=True, default='')
    bairro = models.CharField(max_length=100, blank=True, default='')
    cidade = models.CharField(max_length=100, blank=True, default='')
    uf = models.CharField(max_length=2, blank=True, default='')
    cep = models.CharField(max_length=9, blank=True, default='')

    observacoes = models.TextField(blank=True, default='', verbose_name="Observações")
    ativo = models.BooleanField(default=True, verbose_name="Ativo")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['nome']
        verbose_name = 'Fornecedor'
        verbose_name_plural = 'Fornecedores'

    def __str__(self):
        return self.nome


class StatusPedido(models.TextChoices):
    RASCUNHO = 'RASCUNHO', 'Rascunho'
    ENVIADO = 'ENVIADO', 'Enviado ao Fornecedor'
    APROVADO = 'APROVADO', 'Aprovado'
    PARCIAL = 'PARCIAL', 'Entregue Parcialmente'
    ENTREGUE = 'ENTREGUE', 'Entregue'
    CANCELADO = 'CANCELADO', 'Cancelado'


class DestinoFinanceiro(models.TextChoices):
    PROPRIO = 'PROPRIO', 'Compra Própria (Almoxarifado)'
    CLIENTE = 'CLIENTE', 'Encaminhar para Cliente'


class PedidoCompra(models.Model):
    """Pedido de compra com fluxo de decisão"""
    numero = models.CharField(max_length=20, unique=True, blank=True, verbose_name="Número")
    fornecedor = models.ForeignKey(
        Fornecedor, on_delete=models.PROTECT,
        related_name='pedidos', verbose_name="Fornecedor"
    )
    # Destino financeiro: compra própria ou encaminhar para cliente
    destino = models.CharField(
        max_length=10, choices=DestinoFinanceiro.choices,
        default=DestinoFinanceiro.PROPRIO,
        verbose_name="Destino Financeiro"
    )
    # Vínculo com orçamento (opcional)
    orcamento = models.ForeignKey(
        'orcamentos.Orcamento', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='pedidos_compra',
        verbose_name="Orçamento Vinculado"
    )
    # Vínculo com cliente (quando destino=CLIENTE)
    cliente = models.ForeignKey(
        'cadastro.Cliente', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='pedidos_compra',
        verbose_name="Cliente"
    )
    # Vínculo com equipamento (para saber onde instalar)
    equipamento = models.ForeignKey(
        'equipamentos.Equipamento', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='pedidos_compra',
        verbose_name="Equipamento"
    )
    # Vínculo com ordem de servico (opcional)
    ordem_servico = models.ForeignKey(
        'ordens_servico.OrdemServico', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='pedidos_compra',
        verbose_name="Ordem de Servico"
    )
    status = models.CharField(
        max_length=10, choices=StatusPedido.choices,
        default=StatusPedido.RASCUNHO, verbose_name="Status"
    )
    data_pedido = models.DateField(auto_now_add=True, verbose_name="Data do Pedido")
    data_previsao = models.DateField(null=True, blank=True, verbose_name="Previsão de Entrega")
    data_entrega = models.DateField(null=True, blank=True, verbose_name="Data de Entrega Efetiva")

    # Local de entrega no estoque (para dar entrada)
    local_estoque = models.ForeignKey(
        'almoxarifado.LocalEstoque', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='pedidos_compra',
        verbose_name="Local de Estoque"
    )

    # Local de entrega (endereço de entrega)
    local_entrega = models.ForeignKey(
        'LocalEntrega', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='pedidos_compra',
        verbose_name="Local de Entrega"
    )

    # NF
    numero_nf = models.CharField(max_length=60, blank=True, default='', verbose_name="Número da NF")
    nota_fiscal = models.FileField(upload_to='compras/nf/%Y/%m/', null=True, blank=True, verbose_name="Nota Fiscal (PDF/Foto)")

    observacoes = models.TextField(blank=True, default='', verbose_name="Observações")

    # Totais (calculados)
    valor_total = models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name="Valor Total")

    # Auditoria
    criado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='pedidos_compra_criados')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Pedido de Compra'
        verbose_name_plural = 'Pedidos de Compra'

    def __str__(self):
        return f"PC-{self.numero} ({self.get_status_display()})"

    def save(self, *args, **kwargs):
        if not self.numero:
            last = PedidoCompra.objects.order_by('-id').first()
            next_num = (last.id + 1) if last else 1
            self.numero = f"{next_num:06d}"
        super().save(*args, **kwargs)

    def recalcular_total(self):
        total = self.itens.aggregate(total=models.Sum('valor_total'))['total'] or 0
        self.valor_total = total
        self.save(update_fields=['valor_total'])


class LocalEntrega(models.Model):
    """Cadastro de locais de entrega para pedidos de compra"""
    nome = models.CharField(max_length=200, verbose_name="Nome do Local")
    responsavel = models.CharField(max_length=150, blank=True, default='', verbose_name="Responsável")
    telefone = models.CharField(max_length=30, blank=True, default='', verbose_name="Telefone")
    # Endereço
    logradouro = models.CharField(max_length=255, blank=True, default='', verbose_name="Logradouro")
    numero = models.CharField(max_length=20, blank=True, default='', verbose_name="Número")
    complemento = models.CharField(max_length=100, blank=True, default='', verbose_name="Complemento")
    bairro = models.CharField(max_length=100, blank=True, default='', verbose_name="Bairro")
    cidade = models.CharField(max_length=100, blank=True, default='', verbose_name="Cidade")
    uf = models.CharField(max_length=2, blank=True, default='', verbose_name="UF")
    cep = models.CharField(max_length=9, blank=True, default='', verbose_name="CEP")

    observacoes = models.TextField(blank=True, default='', verbose_name="Observações")
    ativo = models.BooleanField(default=True, verbose_name="Ativo")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['nome']
        verbose_name = 'Local de Entrega'
        verbose_name_plural = 'Locais de Entrega'

    def __str__(self):
        return self.nome

    @property
    def endereco_completo(self):
        partes = []
        if self.logradouro:
            endereco = self.logradouro
            if self.numero:
                endereco += f", {self.numero}"
            if self.complemento:
                endereco += f" - {self.complemento}"
            partes.append(endereco)
        if self.bairro:
            partes.append(self.bairro)
        if self.cidade:
            cidade = self.cidade
            if self.uf:
                cidade += f"/{self.uf}"
            partes.append(cidade)
        if self.cep:
            partes.append(f"CEP: {self.cep}")
        return " - ".join(partes) if partes else ""


class ItemPedidoCompra(models.Model):
    """Itens do pedido de compra"""
    pedido = models.ForeignKey(
        PedidoCompra, on_delete=models.CASCADE,
        related_name='itens', verbose_name="Pedido"
    )
    # Produto do almoxarifado (pode ser null se item novo)
    produto = models.ForeignKey(
        'almoxarifado.Produto', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='itens_compra',
        verbose_name="Produto do Almoxarifado"
    )
    # Descrição livre (para itens que não existem no almoxarifado)
    descricao = models.CharField(max_length=300, verbose_name="Descrição")
    codigo_fornecedor = models.CharField(max_length=100, blank=True, default='', verbose_name="Código no Fornecedor")
    quantidade = models.DecimalField(
        max_digits=12, decimal_places=3,
        validators=[MinValueValidator(0.001)],
        verbose_name="Quantidade"
    )
    unidade = models.CharField(max_length=20, default='UN', verbose_name="Unidade")
    valor_unitario = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        validators=[MinValueValidator(0)],
        verbose_name="Valor Unitário"
    )
    valor_total = models.DecimalField(max_digits=14, decimal_places=2, default=0, verbose_name="Valor Total")

    # Rastreamento de entrega parcial
    quantidade_recebida = models.DecimalField(max_digits=12, decimal_places=3, default=0, verbose_name="Qtd Recebida")
    entregue = models.BooleanField(default=False, verbose_name="Entregue")

    class Meta:
        ordering = ['id']
        verbose_name = 'Item do Pedido'
        verbose_name_plural = 'Itens do Pedido'

    def __str__(self):
        return f"{self.descricao} x{self.quantidade}"

    def save(self, *args, **kwargs):
        self.valor_total = self.quantidade * self.valor_unitario
        super().save(*args, **kwargs)
