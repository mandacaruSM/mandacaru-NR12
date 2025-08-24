from django.contrib import admin
from .models import TipoEquipamento, Equipamento, PlanoManutencaoItem, MedicaoEquipamento

@admin.register(TipoEquipamento)
class TipoEquipamentoAdmin(admin.ModelAdmin):
    list_display = ("nome", "ativo")
    search_fields = ("nome",)
    list_filter = ("ativo",)

@admin.register(Equipamento)
class EquipamentoAdmin(admin.ModelAdmin):
    list_display = ("codigo","cliente","empreendimento","tipo","tipo_medicao","leitura_atual","ativo")
    search_fields = ("codigo","descricao","fabricante","modelo","numero_serie")
    list_filter = ("ativo","tipo_medicao","tipo","cliente","empreendimento")

@admin.register(PlanoManutencaoItem)
class PlanoManutencaoItemAdmin(admin.ModelAdmin):
    list_display = ("titulo","equipamento","modo","periodicidade_valor","proxima_leitura","proxima_data","ativo")
    search_fields = ("titulo","equipamento__codigo")
    list_filter = ("ativo","modo","equipamento")

@admin.register(MedicaoEquipamento)
class MedicaoEquipamentoAdmin(admin.ModelAdmin):
    list_display = ("equipamento","origem","leitura","criado_em")
    search_fields = ("equipamento__codigo",)
    list_filter = ("origem","equipamento")
