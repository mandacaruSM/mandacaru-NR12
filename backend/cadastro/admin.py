from django.contrib import admin
from .models import Cliente, Empreendimento

@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ("nome_razao","tipo_pessoa","documento","cidade","uf","ativo")
    search_fields = ("nome_razao","documento","cidade","email_financeiro")
    list_filter = ("ativo","uf","tipo_pessoa")

@admin.register(Empreendimento)
class EmpreendimentoAdmin(admin.ModelAdmin):
    list_display = ("nome","cliente","tipo","distancia_km","ativo")
    search_fields = ("nome","cliente__nome_razao")
    list_filter = ("ativo","tipo")
