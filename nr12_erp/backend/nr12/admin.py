# backend/nr12/admin.py

from django.contrib import admin
from .models import (
    ModeloChecklist, ItemChecklist,
    ChecklistRealizado, RespostaItemChecklist,
    NotificacaoChecklist,
    # Manutenção Preventiva
    ModeloManutencaoPreventiva, ItemManutencaoPreventiva,
    ProgramacaoManutencao, ManutencaoPreventivaRealizada,
    RespostaItemManutencao
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


# ============================================================
# ADMIN: MANUTENÇÃO PREVENTIVA PROGRAMADA
# ============================================================

class ItemManutencaoPreventivaInline(admin.TabularInline):
    model = ItemManutencaoPreventiva
    extra = 1
    fields = ('ordem', 'categoria', 'descricao', 'tipo_resposta', 'obrigatorio', 'ativo')
    ordering = ['ordem']


@admin.register(ModeloManutencaoPreventiva)
class ModeloManutencaoPreventivaAdmin(admin.ModelAdmin):
    list_display = (
        'nome', 'tipo_equipamento', 'tipo_medicao',
        'intervalo', 'tolerancia', 'ativo', 'criado_em'
    )
    list_filter = ('ativo', 'tipo_medicao', 'tipo_equipamento')
    search_fields = ('nome', 'descricao', 'tipo_equipamento__nome')
    inlines = [ItemManutencaoPreventivaInline]
    readonly_fields = ('criado_em', 'atualizado_em')

    fieldsets = (
        ('Informações Básicas', {
            'fields': ('tipo_equipamento', 'nome', 'descricao')
        }),
        ('Programação', {
            'fields': ('tipo_medicao', 'intervalo', 'tolerancia'),
            'description': 'Define o intervalo em horas ou KM para executar a manutenção'
        }),
        ('Status', {
            'fields': ('ativo',)
        }),
        ('Metadados', {
            'fields': ('criado_em', 'atualizado_em'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ItemManutencaoPreventiva)
class ItemManutencaoPreventivaAdmin(admin.ModelAdmin):
    list_display = (
        'ordem', 'descricao', 'modelo', 'categoria',
        'tipo_resposta', 'obrigatorio', 'ativo'
    )
    list_filter = ('modelo', 'categoria', 'tipo_resposta', 'ativo')
    search_fields = ('descricao', 'instrucoes', 'modelo__nome')
    ordering = ['modelo', 'ordem']

    fieldsets = (
        ('Modelo', {
            'fields': ('modelo', 'ordem')
        }),
        ('Descrição', {
            'fields': ('categoria', 'descricao', 'instrucoes')
        }),
        ('Configurações de Resposta', {
            'fields': ('tipo_resposta', 'obrigatorio', 'requer_observacao_nao_conforme')
        }),
        ('Status', {
            'fields': ('ativo',)
        }),
    )


@admin.register(ProgramacaoManutencao)
class ProgramacaoManutencaoAdmin(admin.ModelAdmin):
    list_display = (
        'equipamento', 'modelo', 'leitura_proxima_manutencao',
        'leitura_ultima_manutencao', 'status', 'ativo'
    )
    list_filter = ('status', 'ativo', 'modelo__tipo_medicao', 'modelo')
    search_fields = (
        'equipamento__codigo', 'equipamento__descricao',
        'modelo__nome'
    )
    readonly_fields = ('criado_em', 'atualizado_em')

    fieldsets = (
        ('Equipamento e Modelo', {
            'fields': ('equipamento', 'modelo')
        }),
        ('Leituras', {
            'fields': (
                'leitura_inicial',
                'leitura_ultima_manutencao',
                'leitura_proxima_manutencao'
            ),
            'description': 'Controle de horímetro/KM para programação da manutenção'
        }),
        ('Status', {
            'fields': ('status', 'ativo')
        }),
        ('Metadados', {
            'fields': ('criado_em', 'atualizado_em'),
            'classes': ('collapse',)
        }),
    )

    actions = ['atualizar_status_programacoes']

    def atualizar_status_programacoes(self, request, queryset):
        """Action para atualizar status baseado na leitura atual dos equipamentos"""
        count = 0
        for programacao in queryset:
            if programacao.equipamento.leitura_atual:
                programacao.atualizar_status(programacao.equipamento.leitura_atual)
                count += 1

        self.message_user(
            request,
            f'{count} programação(ões) atualizada(s) com sucesso.'
        )
    atualizar_status_programacoes.short_description = 'Atualizar status das programações'


class RespostaItemManutencaoInline(admin.TabularInline):
    model = RespostaItemManutencao
    extra = 0
    readonly_fields = ('item', 'resposta', 'observacao', 'data_hora_resposta')
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(ManutencaoPreventivaRealizada)
class ManutencaoPreventivaRealizadaAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'equipamento', 'modelo', 'tecnico',
        'leitura_equipamento', 'data_hora_inicio',
        'status', 'resultado_geral', 'origem'
    )
    list_filter = (
        'status', 'resultado_geral', 'origem',
        'modelo', 'data_hora_inicio'
    )
    search_fields = (
        'equipamento__codigo', 'equipamento__descricao',
        'tecnico__nome', 'modelo__nome'
    )
    readonly_fields = (
        'data_hora_inicio', 'data_hora_fim',
        'criado_em', 'atualizado_em', 'resultado_geral'
    )
    inlines = [RespostaItemManutencaoInline]
    date_hierarchy = 'data_hora_inicio'

    fieldsets = (
        ('Manutenção', {
            'fields': ('programacao', 'modelo', 'equipamento', 'leitura_equipamento')
        }),
        ('Responsável', {
            'fields': ('tecnico', 'tecnico_nome', 'usuario', 'origem')
        }),
        ('Status e Resultado', {
            'fields': ('status', 'resultado_geral', 'observacoes_gerais')
        }),
        ('Vínculo', {
            'fields': ('manutencao',),
            'classes': ('collapse',),
            'description': 'Registro de manutenção associado (módulo manutencao)'
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

    actions = ['finalizar_manutencoes']

    def finalizar_manutencoes(self, request, queryset):
        """Action para finalizar múltiplas manutenções"""
        count = 0
        for manutencao in queryset.filter(status='EM_ANDAMENTO'):
            manutencao.finalizar()
            count += 1

        self.message_user(
            request,
            f'{count} manutenção(ões) finalizada(s) com sucesso.'
        )
    finalizar_manutencoes.short_description = 'Finalizar manutenções selecionadas'


@admin.register(RespostaItemManutencao)
class RespostaItemManutencaoAdmin(admin.ModelAdmin):
    list_display = (
        'manutencao', 'item', 'resposta',
        'valor_numerico', 'tem_observacao', 'data_hora_resposta'
    )
    list_filter = ('resposta', 'item__categoria', 'data_hora_resposta')
    search_fields = (
        'manutencao__equipamento__codigo',
        'item__descricao',
        'observacao'
    )
    readonly_fields = ('data_hora_resposta',)

    def tem_observacao(self, obj):
        return bool(obj.observacao)
    tem_observacao.boolean = True
    tem_observacao.short_description = 'Obs?'