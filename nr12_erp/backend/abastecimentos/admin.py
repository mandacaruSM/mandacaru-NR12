from django.contrib import admin
from .models import Abastecimento

@admin.register(Abastecimento)
class AbastecimentoAdmin(admin.ModelAdmin):
    list_display = ['equipamento', 'data', 'tipo_combustivel', 'quantidade_litros', 'valor_total', 'valor_unitario']
    list_filter = ['tipo_combustivel', 'data']
    search_fields = ['equipamento__codigo', 'local', 'numero_nota']
    date_hierarchy = 'data'
    readonly_fields = ['valor_unitario', 'created_at', 'updated_at']
