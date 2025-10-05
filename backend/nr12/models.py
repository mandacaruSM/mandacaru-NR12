# backend/nr12/models.py

from django.db import models
from django.contrib.auth.models import User


class ModeloChecklist(models.Model):
    """
    Template de checklist vinculado a um tipo de equipamento.
    Ex: Checklist para Escavadeira Hidráulica
    """
    tipo_equipamento = models.ForeignKey(
        'equipamentos.TipoEquipamento',
        on_delete=models.PROTECT,
        related_name='modelos_checklist'
    )
    nome = models.CharField(max_length=150)
    descricao = models.TextField(blank=True, default="")
    periodicidade = models.CharField(
        max_length=20,
        choices=[
            ('DIARIO', 'Diário'),
            ('SEMANAL', 'Semanal'),
            ('QUINZENAL', 'Quinzenal'),
            ('MENSAL', 'Mensal'),
        ],
        default='DIARIO'
    )
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['tipo_equipamento__nome', 'nome']
        verbose_name = 'Modelo de Checklist'
        verbose_name_plural = 'Modelos de Checklist'

    def __str__(self):
        return f"{self.tipo_equipamento.nome} - {self.nome}"


class ItemChecklist(models.Model):
    """
    Item individual de um checklist.
    Ex: "Verificar nível de óleo do motor"
    """
    modelo = models.ForeignKey(
        ModeloChecklist,
        on_delete=models.CASCADE,
        related_name='itens'
    )
    ordem = models.PositiveIntegerField(default=0)
    categoria = models.CharField(
        max_length=50,
        choices=[
            ('VISUAL', 'Inspeção Visual'),
            ('FUNCIONAL', 'Teste Funcional'),
            ('MEDICAO', 'Medição'),
            ('LIMPEZA', 'Limpeza'),
            ('LUBRIFICACAO', 'Lubrificação'),
            ('DOCUMENTACAO', 'Documentação'),
            ('SEGURANCA', 'Segurança'),
            ('OUTROS', 'Outros'),
        ],
        default='VISUAL'
    )
    pergunta = models.CharField(max_length=255)
    descricao_ajuda = models.TextField(
        blank=True,
        default="",
        help_text="Instruções detalhadas para o operador"
    )
    tipo_resposta = models.CharField(
        max_length=20,
        choices=[
            ('SIM_NAO', 'Sim/Não'),
            ('CONFORME', 'Conforme/Não Conforme'),
            ('NUMERO', 'Valor Numérico'),
            ('TEXTO', 'Texto Livre'),
        ],
        default='CONFORME'
    )
    obrigatorio = models.BooleanField(default=True)
    requer_observacao_nao_conforme = models.BooleanField(
        default=True,
        help_text="Exige observação quando resposta for não conforme"
    )
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['modelo', 'ordem', 'id']
        verbose_name = 'Item de Checklist'
        verbose_name_plural = 'Itens de Checklist'

    def __str__(self):
        return f"[{self.ordem}] {self.pergunta}"


class ChecklistRealizado(models.Model):
    """
    Registro de um checklist completo realizado por um operador.
    """
    modelo = models.ForeignKey(
        ModeloChecklist,
        on_delete=models.PROTECT,
        related_name='checklists_realizados'
    )
    equipamento = models.ForeignKey(
        'equipamentos.Equipamento',
        on_delete=models.PROTECT,
        related_name='checklists'
    )
    operador = models.ForeignKey(
        'core.Operador',
        on_delete=models.PROTECT,
        related_name='checklists',
        null=True,
        blank=True
    )
    usuario = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='checklists_criados',
        help_text="Usuário web que criou (se não for via bot)"
    )
    origem = models.CharField(
        max_length=20,
        choices=[
            ('WEB', 'Sistema Web'),
            ('BOT', 'Bot Telegram'),
            ('MOBILE', 'App Mobile'),
        ],
        default='WEB'
    )
    data_hora_inicio = models.DateTimeField(auto_now_add=True)
    data_hora_fim = models.DateTimeField(null=True, blank=True)
    leitura_equipamento = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Leitura do horímetro/odômetro no momento do checklist"
    )
    status = models.CharField(
        max_length=20,
        choices=[
            ('EM_ANDAMENTO', 'Em Andamento'),
            ('CONCLUIDO', 'Concluído'),
            ('CANCELADO', 'Cancelado'),
        ],
        default='EM_ANDAMENTO'
    )
    resultado_geral = models.CharField(
        max_length=20,
        choices=[
            ('APROVADO', 'Aprovado'),
            ('APROVADO_RESTRICAO', 'Aprovado com Restrição'),
            ('REPROVADO', 'Reprovado'),
        ],
        null=True,
        blank=True
    )
    observacoes_gerais = models.TextField(blank=True, default="")
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-data_hora_inicio']
        verbose_name = 'Checklist Realizado'
        verbose_name_plural = 'Checklists Realizados'

    def __str__(self):
        return f"{self.equipamento.codigo} - {self.data_hora_inicio.strftime('%d/%m/%Y %H:%M')}"

    def calcular_resultado(self):
        """Calcula o resultado geral baseado nas respostas"""
        respostas = self.respostas.all()
        total = respostas.count()
        
        if total == 0:
            return None
        
        nao_conformes = respostas.filter(resposta='NAO_CONFORME').count()
        
        if nao_conformes == 0:
            return 'APROVADO'
        elif nao_conformes <= (total * 0.2):  # Até 20% de não conformidade
            return 'APROVADO_RESTRICAO'
        else:
            return 'REPROVADO'

    def finalizar(self):
        """Finaliza o checklist e calcula resultado"""
        from django.utils import timezone
        
        self.data_hora_fim = timezone.now()
        self.status = 'CONCLUIDO'
        self.resultado_geral = self.calcular_resultado()
        self.save()

        # Atualizar leitura do equipamento se informada
        if self.leitura_equipamento:
            from equipamentos.models import MedicaoEquipamento
            MedicaoEquipamento.objects.create(
                equipamento=self.equipamento,
                origem='CHECKLIST',
                leitura=self.leitura_equipamento,
                observacao=f'Checklist NR12 - {self.modelo.nome}'
            )


class RespostaItemChecklist(models.Model):
    """
    Resposta individual de cada item do checklist.
    """
    checklist = models.ForeignKey(
        ChecklistRealizado,
        on_delete=models.CASCADE,
        related_name='respostas'
    )
    item = models.ForeignKey(
        ItemChecklist,
        on_delete=models.PROTECT,
        related_name='respostas'
    )
    resposta = models.CharField(
        max_length=20,
        choices=[
            ('CONFORME', 'Conforme'),
            ('NAO_CONFORME', 'Não Conforme'),
            ('SIM', 'Sim'),
            ('NAO', 'Não'),
            ('NA', 'Não Aplicável'),
        ],
        null=True,
        blank=True
    )
    valor_numerico = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Para respostas do tipo numérico"
    )
    valor_texto = models.TextField(
        blank=True,
        default="",
        help_text="Para respostas do tipo texto livre"
    )
    observacao = models.TextField(
        blank=True,
        default="",
        help_text="Observações adicionais, obrigatório para não conformidades"
    )
    foto = models.ImageField(
        upload_to='checklists/%Y/%m/',
        null=True,
        blank=True,
        help_text="Foto da não conformidade ou evidência"
    )
    data_hora_resposta = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['checklist', 'item__ordem']
        verbose_name = 'Resposta de Item'
        verbose_name_plural = 'Respostas de Itens'
        unique_together = ['checklist', 'item']

    def __str__(self):
        return f"{self.checklist.id} - {self.item.pergunta}: {self.resposta}"

    def is_nao_conforme(self):
        """Verifica se a resposta é não conforme"""
        return self.resposta in ['NAO_CONFORME', 'NAO']


class NotificacaoChecklist(models.Model):
    """
    Notificações enviadas quando há não conformidades críticas.
    """
    checklist = models.ForeignKey(
        ChecklistRealizado,
        on_delete=models.CASCADE,
        related_name='notificacoes'
    )
    destinatario = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notificacoes_checklist'
    )
    tipo = models.CharField(
        max_length=20,
        choices=[
            ('NAO_CONFORMIDADE', 'Não Conformidade'),
            ('CHECKLIST_REPROVADO', 'Checklist Reprovado'),
            ('ITEM_CRITICO', 'Item Crítico'),
        ],
        default='NAO_CONFORMIDADE'
    )
    mensagem = models.TextField()
    lida = models.BooleanField(default=False)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-criado_em']
        verbose_name = 'Notificação de Checklist'
        verbose_name_plural = 'Notificações de Checklist'

    def __str__(self):
        return f"{self.tipo} - {self.destinatario.username}"