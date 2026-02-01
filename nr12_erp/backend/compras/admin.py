from django.contrib import admin
from .models import Fornecedor, PedidoCompra, ItemPedidoCompra


class ItemPedidoCompraInline(admin.TabularInline):
    model = ItemPedidoCompra
    extra = 1


@admin.register(Fornecedor)
class FornecedorAdmin(admin.ModelAdmin):
    list_display = ['nome', 'cnpj_cpf', 'especialidade', 'telefone', 'cidade', 'ativo']
    list_filter = ['ativo', 'uf']
    search_fields = ['nome', 'cnpj_cpf', 'especialidade']


@admin.register(PedidoCompra)
class PedidoCompraAdmin(admin.ModelAdmin):
    list_display = ['numero', 'fornecedor', 'status', 'destino', 'valor_total', 'data_pedido']
    list_filter = ['status', 'destino']
    search_fields = ['numero', 'fornecedor__nome', 'numero_nf']
    inlines = [ItemPedidoCompraInline]
    readonly_fields = ['numero', 'valor_total', 'created_at', 'updated_at']
