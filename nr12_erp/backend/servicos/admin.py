from django.contrib import admin
from .models import CategoriaServico, Servico


@admin.register(CategoriaServico)
class CategoriaServicoAdmin(admin.ModelAdmin):
    list_display = ['nome', 'ativo']
    list_filter = ['ativo']
    search_fields = ['nome', 'descricao']


@admin.register(Servico)
class ServicoAdmin(admin.ModelAdmin):
    list_display = [
        'codigo',
        'nome',
        'categoria',
        'preco_venda',
        'total_impostos',
        'unidade',
        'ativo'
    ]
    list_filter = ['categoria', 'ativo', 'unidade']
    search_fields = ['codigo', 'nome', 'descricao_detalhada']
    readonly_fields = ['criado_em', 'atualizado_em']

    fieldsets = (
        ('Informações Básicas', {
            'fields': ('codigo', 'nome', 'categoria', 'descricao_detalhada', 'unidade', 'tempo_estimado')
        }),
        ('Preços', {
            'fields': ('preco_venda', 'preco_custo')
        }),
        ('Impostos (%)', {
            'fields': ('aliquota_iss', 'aliquota_pis', 'aliquota_cofins', 'aliquota_csll', 'aliquota_irpj')
        }),
        ('Status', {
            'fields': ('ativo',)
        }),
        ('Auditoria', {
            'fields': ('criado_em', 'atualizado_em'),
            'classes': ('collapse',)
        }),
    )
