# backend/nr12/admin.py

from django.contrib import admin
from .models import (
    ModeloChecklist, ItemChecklist, 
    ChecklistRealizado, RespostaItemChecklist,
    NotificacaoChecklist
)


class ItemChecklistInline(admin.TabularInline):
    model = ItemChecklist
    extra = 1
    fields = ('ordem', 'categoria', 'pergunta', 'tipo_resposta', 'obrigatorio', 'ativo')
    ordering = ['ordem']


@admin.register(ModeloChecklist)
class ModeloChecklistAdmin(admin.ModelAdmin):
    list_display = ('nome', 'tipo_equipamento', 'periodicidade', 'ativo', 'criado_em')
    list_filter = ('ativo', 'periodicidade', 'tipo_equipamento')
    search_fields = ('nome', 'descricao', 'tipo_equipamento__nome')
    inlines = [ItemChecklistInline]
    readonly_fields = ('criado_em', 'atualizado_em')

    fieldsets = (
        ('Informações Básicas', {
            'fields': ('tipo_equipamento', 'nome', 'descricao', 'periodicidade')
        }),
        ('Status', {
            'fields': ('ativo',)
        }),
        ('Metadados', {
            'fields': ('criado_em', 'atualizado_em'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ItemChecklist)
class ItemChecklistAdmin(admin.ModelAdmin):
    list_display = ('ordem', 'pergunta', 'modelo', 'categoria', 'tipo_resposta', 'obrigatorio', 'ativo')
    list_filter = ('modelo', 'categoria', 'tipo_resposta', 'ativo')
    search_fields = ('pergunta', 'descricao_ajuda', 'modelo__nome')
    ordering = ['modelo', 'ordem']

    fieldsets = (
        ('Modelo', {
            'fields': ('modelo', 'ordem')
        }),
        ('Pergunta', {
            'fields': ('categoria', 'pergunta', 'descricao_ajuda')
        }),
        ('Configurações de Resposta', {
            'fields': ('tipo_resposta', 'obrigatorio', 'requer_observacao_nao_conforme')
        }),
        ('Status', {
            'fields': ('ativo',)
        }),
    )


class RespostaItemChecklistInline(admin.TabularInline):
    model = RespostaItemChecklist
    extra = 0
    readonly_fields = ('item', 'resposta', 'observacao', 'data_hora_resposta')
    can_delete = False
    
    def has_add_permission(self, request, obj=None):
        return False


@admin.register(ChecklistRealizado)
class ChecklistRealizadoAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'equipamento', 'modelo', 'operador', 
        'data_hora_inicio', 'status', 'resultado_geral', 'origem'
    )
    list_filter = ('status', 'resultado_geral', 'origem', 'modelo', 'data_hora_inicio')
    search_fields = (
        'equipamento__codigo', 'equipamento__descricao',
        'operador__nome_completo', 'modelo__nome'
    )
    readonly_fields = (
        'data_hora_inicio', 'data_hora_fim', 'criado_em', 
        'atualizado_em', 'resultado_geral'
    )
    inlines = [RespostaItemChecklistInline]
    date_hierarchy = 'data_hora_inicio'

    fieldsets = (
        ('Checklist', {
            'fields': ('modelo', 'equipamento', 'leitura_equipamento')
        }),
        ('Responsável', {
            'fields': ('operador', 'usuario', 'origem')
        }),
        ('Status e Resultado', {
            'fields': ('status', 'resultado_geral', 'observacoes_gerais')
        }),
        ('Datas', {
            'fields': ('data_hora_inicio', 'data_hora_fim'),
            'classes': ('collapse',)
        }),
        ('Metadados', {
            'fields': ('criado_em', 'atualizado_em'),
            'classes': ('collapse',)
        }),
    )

    actions = ['finalizar_checklists']

    def finalizar_checklists(self, request, queryset):
        """Action para finalizar múltiplos checklists"""
        count = 0
        for checklist in queryset.filter(status='EM_ANDAMENTO'):
            checklist.finalizar()
            count += 1
        
        self.message_user(
            request,
            f'{count} checklist(s) finalizado(s) com sucesso.'
        )
    finalizar_checklists.short_description = 'Finalizar checklists selecionados'


@admin.register(RespostaItemChecklist)
class RespostaItemChecklistAdmin(admin.ModelAdmin):
    list_display = (
        'checklist', 'item', 'resposta', 
        'valor_numerico', 'tem_observacao', 'data_hora_resposta'
    )
    list_filter = ('resposta', 'item__categoria', 'data_hora_resposta')
    search_fields = (
        'checklist__equipamento__codigo', 
        'item__pergunta', 
        'observacao'
    )
    readonly_fields = ('data_hora_resposta',)

    def tem_observacao(self, obj):
        return bool(obj.observacao)
    tem_observacao.boolean = True
    tem_observacao.short_description = 'Obs?'


@admin.register(NotificacaoChecklist)
class NotificacaoChecklistAdmin(admin.ModelAdmin):
    list_display = ('tipo', 'destinatario', 'checklist', 'lida', 'criado_em')
    list_filter = ('tipo', 'lida', 'criado_em')
    search_fields = ('mensagem', 'destinatario__username', 'checklist__equipamento__codigo')
    readonly_fields = ('criado_em',)
    date_hierarchy = 'criado_em'

    actions = ['marcar_como_lida']

    def marcar_como_lida(self, request, queryset):
        """Action para marcar notificações como lidas"""
        count = queryset.update(lida=True)
        self.message_user(
            request,
            f'{count} notificação(ões) marcada(s) como lida(s).'
        )
    marcar_como_lida.short_description = 'Marcar como lida'