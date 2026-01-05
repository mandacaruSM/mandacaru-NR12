from django.contrib import admin
from .models import Manutencao, AnexoManutencao

class AnexoInline(admin.TabularInline):
    model = AnexoManutencao
    extra = 0

@admin.register(Manutencao)
class ManutencaoAdmin(admin.ModelAdmin):
    list_display = ('id', 'equipamento', 'tipo', 'data', 'horimetro', 'tecnico')
    list_filter = ('tipo', 'data')
    search_fields = ('descricao', 'observacoes')
    inlines = [AnexoInline]
