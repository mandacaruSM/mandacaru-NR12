from django.contrib import admin
from .models import UnidadeMedida, CategoriaProduto, Produto, LocalEstoque, Estoque, MovimentoEstoque

@admin.register(UnidadeMedida)
class UnidadeMedidaAdmin(admin.ModelAdmin):
    list_display = ('sigla', 'descricao')
    search_fields = ('sigla', 'descricao')
    ordering = ('sigla',)

@admin.register(CategoriaProduto)
class CategoriaProdutoAdmin(admin.ModelAdmin):
    list_display = ('nome',)
    search_fields = ('nome',)
    ordering = ('nome',)

@admin.register(Produto)
class ProdutoAdmin(admin.ModelAdmin):
    list_display = ('codigo', 'nome', 'tipo', 'categoria', 'unidade', 'ativo', 'densidade_kg_l')
    list_filter = ('tipo', 'categoria', 'ativo')
    search_fields = ('codigo', 'nome')
    ordering = ('codigo',)
    list_editable = ('ativo',)
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('codigo', 'nome', 'tipo', 'categoria', 'unidade', 'ativo')
        }),
        ('Informações Específicas', {
            'fields': ('densidade_kg_l',),
            'description': 'Densidade (kg/L) - obrigatório apenas para combustíveis'
        }),
    )

@admin.register(LocalEstoque)
class LocalEstoqueAdmin(admin.ModelAdmin):
    list_display = ('nome', 'tipo', 'fornecedor_nome')
    list_filter = ('tipo',)
    search_fields = ('nome', 'fornecedor_nome')
    ordering = ('nome',)
    fieldsets = (
        ('Informações do Local', {
            'fields': ('nome', 'tipo')
        }),
        ('Informações Adicionais', {
            'fields': ('fornecedor_nome',),
            'description': 'Fornecedor - preencher apenas para postos externos'
        }),
    )

@admin.register(Estoque)
class EstoqueAdmin(admin.ModelAdmin):
    list_display = ('produto', 'local', 'saldo', 'get_unidade')
    list_filter = ('local', 'produto__categoria')
    search_fields = ('produto__codigo', 'produto__nome', 'local__nome')
    ordering = ('produto__codigo',)
    readonly_fields = ('saldo',)

    def get_unidade(self, obj):
        return obj.produto.unidade.sigla
    get_unidade.short_description = 'Unidade'

    def has_add_permission(self, request):
        # Estoque é criado automaticamente ao cadastrar produto/local
        return False

    def has_delete_permission(self, request, obj=None):
        # Não permitir deletar estoques manualmente
        return False

@admin.register(MovimentoEstoque)
class MovimentoEstoqueAdmin(admin.ModelAdmin):
    list_display = ('data_hora', 'produto', 'local', 'tipo', 'quantidade', 'documento', 'criado_por')
    list_filter = ('tipo', 'local', 'data_hora', 'produto__categoria')
    search_fields = ('produto__codigo', 'produto__nome', 'documento', 'observacao')
    ordering = ('-data_hora',)
    readonly_fields = ('data_hora', 'criado_por')
    date_hierarchy = 'data_hora'

    fieldsets = (
        ('Movimento', {
            'fields': ('tipo', 'produto', 'local', 'quantidade')
        }),
        ('Documentação', {
            'fields': ('documento', 'observacao')
        }),
        ('Informações do Sistema', {
            'fields': ('data_hora', 'criado_por', 'abastecimento'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:  # Apenas na criação
            obj.criado_por = request.user
        super().save_model(request, obj, form, change)
