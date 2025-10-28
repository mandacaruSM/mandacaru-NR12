from django.contrib import admin
from django.utils.html import format_html
from .models import Cliente, Empreendimento

@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ("nome_razao", "tipo_pessoa", "documento", "cidade", "uf", "ativo", "uuid")
    search_fields = ("nome_razao", "documento", "cidade", "email_financeiro")
    list_filter = ("ativo", "uf", "tipo_pessoa")
    readonly_fields = ("qr_preview",)

    def qr_preview(self, obj):
        if getattr(obj, "uuid", None):
            return format_html('<img src="/api/v1/cadastro/qr/{}.png" width="200" height="200" />', obj.uuid)
        return "-"
    qr_preview.short_description = "QR Code"

@admin.register(Empreendimento)
class EmpreendimentoAdmin(admin.ModelAdmin):
    list_display = ("nome", "cliente", "tipo", "distancia_km", "ativo")
    search_fields = ("nome", "cliente__nome_razao")
    list_filter = ("ativo", "tipo")
