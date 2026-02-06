from django.contrib import admin
from .models import FioDiamantado, RegistroCorte


@admin.register(FioDiamantado)
class FioDiamantadoAdmin(admin.ModelAdmin):
    list_display = ['codigo', 'fabricante', 'cliente', 'status', 'diametro_inicial_mm', 'data_cadastro']
    list_filter = ['status', 'cliente', 'fabricante']
    search_fields = ['codigo', 'numero_serie', 'fabricante']
    date_hierarchy = 'data_cadastro'


@admin.register(RegistroCorte)
class RegistroCorteAdmin(admin.ModelAdmin):
    list_display = ['fio', 'data', 'area_corte_m2', 'desgaste_mm', 'fonte_energia']
    list_filter = ['fonte_energia', 'data']
    search_fields = ['fio__codigo', 'operador_nome']
    date_hierarchy = 'data'
