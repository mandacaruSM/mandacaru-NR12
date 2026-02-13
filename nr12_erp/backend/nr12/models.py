# backend/nr12/models.py

from django.db import models
from django.contrib.auth.models import User
from simple_history.models import HistoricalRecords


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
    # Cliente dono do modelo (null = modelo global/admin)
    cliente = models.ForeignKey(
        'cadastro.Cliente',
        on_delete=models.CASCADE,
        related_name='modelos_checklist',
        null=True,
        blank=True,
        help_text="Cliente dono do modelo. Se vazio, é um modelo global (admin)."
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
    operador_nome = models.CharField(
        max_length=200,
        blank=True,
        default='',
        help_text="Nome do operador quando não há operador cadastrado"
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

    # Auditoria: registra quem criou/alterou e quando
    history = HistoricalRecords(
        history_change_reason_field=models.TextField(null=True),
        table_name='nr12_checklistrealizado_history'
    )

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


# ============================================================
# MANUTENÇÃO PREVENTIVA PROGRAMADA
# ============================================================

class ModeloManutencaoPreventiva(models.Model):
    """
    Template de manutenção preventiva vinculado a um tipo de equipamento.
    Define os itens de manutenção e o intervalo (horímetro ou KM).
    Ex: Manutenção 250h para Escavadeira Hidráulica
    """
    tipo_equipamento = models.ForeignKey(
        'equipamentos.TipoEquipamento',
        on_delete=models.PROTECT,
        related_name='modelos_manutencao_preventiva'
    )
    nome = models.CharField(
        max_length=150,
        help_text="Ex: Manutenção 250h, Manutenção 500h, Revisão 10.000 km"
    )
    descricao = models.TextField(blank=True, default="")

    # Intervalo baseado em horímetro ou KM
    tipo_medicao = models.CharField(
        max_length=20,
        choices=[
            ('HORIMETRO', 'Horímetro'),
            ('ODOMETRO', 'Odômetro (KM)'),
        ],
        default='HORIMETRO',
        help_text="Tipo de medição para agendar a manutenção"
    )
    intervalo = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Intervalo em horas ou KM para executar a manutenção"
    )
    tolerancia = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Tolerância antes de considerar atrasado (ex: 10h ou 100km)"
    )

    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['tipo_equipamento__nome', 'intervalo', 'nome']
        verbose_name = 'Modelo de Manutenção Preventiva'
        verbose_name_plural = 'Modelos de Manutenção Preventiva'
        indexes = [
            models.Index(fields=['tipo_equipamento', 'ativo']),
        ]

    def __str__(self):
        return f"{self.tipo_equipamento.nome} - {self.nome}"


class ItemManutencaoPreventiva(models.Model):
    """
    Item individual de uma manutenção preventiva.
    Ex: "Trocar óleo do motor", "Verificar tensão das correias"
    """
    modelo = models.ForeignKey(
        ModeloManutencaoPreventiva,
        on_delete=models.CASCADE,
        related_name='itens'
    )
    ordem = models.PositiveIntegerField(default=0)
    categoria = models.CharField(
        max_length=50,
        choices=[
            ('TROCA_OLEO', 'Troca de Óleo'),
            ('TROCA_FILTRO', 'Troca de Filtro'),
            ('LUBRIFICACAO', 'Lubrificação'),
            ('INSPECAO', 'Inspeção'),
            ('AJUSTE', 'Ajuste/Regulagem'),
            ('LIMPEZA', 'Limpeza'),
            ('SUBSTITUICAO', 'Substituição de Peças'),
            ('TESTE', 'Teste Funcional'),
            ('MEDICAO', 'Medição'),
            ('OUTROS', 'Outros'),
        ],
        default='INSPECAO'
    )
    descricao = models.CharField(
        max_length=255,
        help_text="Ex: Trocar óleo do motor, Verificar nível de fluido hidráulico"
    )
    instrucoes = models.TextField(
        blank=True,
        default="",
        help_text="Instruções detalhadas para o técnico"
    )
    tipo_resposta = models.CharField(
        max_length=20,
        choices=[
            ('EXECUTADO', 'Executado/Não Executado'),
            ('CONFORME', 'Conforme/Não Conforme'),
            ('NUMERO', 'Valor Numérico'),
            ('TEXTO', 'Texto Livre'),
        ],
        default='EXECUTADO'
    )
    obrigatorio = models.BooleanField(default=True)
    requer_observacao_nao_conforme = models.BooleanField(
        default=True,
        help_text="Exige observação quando não executado ou não conforme"
    )
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['modelo', 'ordem', 'id']
        verbose_name = 'Item de Manutenção Preventiva'
        verbose_name_plural = 'Itens de Manutenção Preventiva'

    def __str__(self):
        return f"[{self.ordem}] {self.descricao}"


class ProgramacaoManutencao(models.Model):
    """
    Programação de manutenção preventiva para um equipamento específico.
    Controla quando a próxima manutenção deve ser realizada.
    """
    equipamento = models.ForeignKey(
        'equipamentos.Equipamento',
        on_delete=models.CASCADE,
        related_name='programacoes_manutencao'
    )
    modelo = models.ForeignKey(
        ModeloManutencaoPreventiva,
        on_delete=models.PROTECT,
        related_name='programacoes'
    )

    # Controle de leitura
    leitura_inicial = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Leitura (horímetro/KM) quando a programação foi criada"
    )
    leitura_ultima_manutencao = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Leitura da última manutenção realizada"
    )
    leitura_proxima_manutencao = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Leitura prevista para a próxima manutenção"
    )

    status = models.CharField(
        max_length=20,
        choices=[
            ('ATIVA', 'Ativa'),
            ('PENDENTE', 'Pendente'),
            ('EM_ATRASO', 'Em Atraso'),
            ('INATIVA', 'Inativa'),
        ],
        default='ATIVA'
    )

    ativo = models.BooleanField(
        default=True,
        help_text="Programação ativa no sistema"
    )
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['equipamento', 'leitura_proxima_manutencao']
        verbose_name = 'Programação de Manutenção'
        verbose_name_plural = 'Programações de Manutenção'
        unique_together = ['equipamento', 'modelo']
        indexes = [
            models.Index(fields=['equipamento', 'status']),
            models.Index(fields=['status', 'leitura_proxima_manutencao']),
        ]

    def __str__(self):
        return f"{self.equipamento.codigo} - {self.modelo.nome} (Próx: {self.leitura_proxima_manutencao})"

    def atualizar_status(self, leitura_atual):
        """Atualiza o status baseado na leitura atual do equipamento"""
        from decimal import Decimal

        if not self.ativo:
            self.status = 'INATIVA'
        elif leitura_atual >= (self.leitura_proxima_manutencao + self.modelo.tolerancia):
            self.status = 'EM_ATRASO'
        elif leitura_atual >= self.leitura_proxima_manutencao:
            self.status = 'PENDENTE'
        else:
            self.status = 'ATIVA'

        self.save()
        return self.status

    def agendar_proxima(self, leitura_atual):
        """Agenda a próxima manutenção após conclusão"""
        self.leitura_ultima_manutencao = leitura_atual
        self.leitura_proxima_manutencao = leitura_atual + self.modelo.intervalo
        self.status = 'ATIVA'
        self.save()


class ManutencaoPreventivaRealizada(models.Model):
    """
    Registro de uma manutenção preventiva completa realizada.
    Similar ao ChecklistRealizado, mas para manutenções preventivas.
    """
    programacao = models.ForeignKey(
        ProgramacaoManutencao,
        on_delete=models.PROTECT,
        related_name='manutencoes_realizadas'
    )
    equipamento = models.ForeignKey(
        'equipamentos.Equipamento',
        on_delete=models.PROTECT,
        related_name='manutencoes_preventivas'
    )
    modelo = models.ForeignKey(
        ModeloManutencaoPreventiva,
        on_delete=models.PROTECT,
        related_name='manutencoes_realizadas'
    )
    tecnico = models.ForeignKey(
        'tecnicos.Tecnico',
        on_delete=models.PROTECT,
        related_name='manutencoes_preventivas',
        null=True,
        blank=True
    )
    tecnico_nome = models.CharField(
        max_length=200,
        blank=True,
        default='',
        help_text="Nome do técnico quando não há técnico cadastrado"
    )
    usuario = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='manutencoes_preventivas_criadas',
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
        help_text="Leitura do horímetro/odômetro no momento da manutenção"
    )

    status = models.CharField(
        max_length=20,
        choices=[
            ('EM_ANDAMENTO', 'Em Andamento'),
            ('CONCLUIDA', 'Concluída'),
            ('CANCELADA', 'Cancelada'),
        ],
        default='EM_ANDAMENTO'
    )

    resultado_geral = models.CharField(
        max_length=20,
        choices=[
            ('COMPLETA', 'Completa'),
            ('COMPLETA_RESTRICAO', 'Completa com Restrição'),
            ('INCOMPLETA', 'Incompleta'),
        ],
        null=True,
        blank=True,
        help_text="Resultado baseado nos itens executados"
    )

    observacoes_gerais = models.TextField(
        blank=True,
        default="",
        help_text="Observações gerais sobre a manutenção"
    )

    # Vínculo com manutenção do módulo manutencao (se necessário)
    manutencao = models.OneToOneField(
        'manutencao.Manutencao',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='manutencao_preventiva_realizada',
        help_text="Registro de manutenção associado"
    )

    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-data_hora_inicio']
        verbose_name = 'Manutenção Preventiva Realizada'
        verbose_name_plural = 'Manutenções Preventivas Realizadas'
        indexes = [
            models.Index(fields=['equipamento', '-data_hora_inicio']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.equipamento.codigo} - {self.modelo.nome} - {self.data_hora_inicio.strftime('%d/%m/%Y %H:%M')}"

    def calcular_resultado(self):
        """Calcula o resultado geral baseado nos itens executados"""
        respostas = self.respostas.all()
        total = respostas.count()

        if total == 0:
            return None

        nao_executados = respostas.filter(resposta='NAO_EXECUTADO').count()
        nao_conformes = respostas.filter(resposta='NAO_CONFORME').count()

        problemas = nao_executados + nao_conformes

        if problemas == 0:
            return 'COMPLETA'
        elif problemas <= (total * 0.2):  # Até 20% com problema
            return 'COMPLETA_RESTRICAO'
        else:
            return 'INCOMPLETA'

    def finalizar(self):
        """Finaliza a manutenção preventiva e atualiza a programação"""
        from django.utils import timezone

        self.data_hora_fim = timezone.now()
        self.status = 'CONCLUIDA'
        self.resultado_geral = self.calcular_resultado()
        self.save()

        # Atualizar programação para próxima manutenção
        if self.programacao:
            self.programacao.agendar_proxima(self.leitura_equipamento)

        # Atualizar leitura do equipamento
        if self.leitura_equipamento:
            from equipamentos.models import MedicaoEquipamento
            MedicaoEquipamento.objects.create(
                equipamento=self.equipamento,
                origem='MANUTENCAO_PREVENTIVA',
                leitura=self.leitura_equipamento,
                observacao=f'Manutenção Preventiva - {self.modelo.nome}'
            )


class RespostaItemManutencao(models.Model):
    """
    Resposta individual de cada item da manutenção preventiva.
    """
    manutencao = models.ForeignKey(
        ManutencaoPreventivaRealizada,
        on_delete=models.CASCADE,
        related_name='respostas'
    )
    item = models.ForeignKey(
        ItemManutencaoPreventiva,
        on_delete=models.PROTECT,
        related_name='respostas'
    )
    resposta = models.CharField(
        max_length=20,
        choices=[
            ('EXECUTADO', 'Executado'),
            ('NAO_EXECUTADO', 'Não Executado'),
            ('CONFORME', 'Conforme'),
            ('NAO_CONFORME', 'Não Conforme'),
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
        help_text="Observações sobre a execução do item"
    )
    foto = models.ImageField(
        upload_to='manutencoes_preventivas/%Y/%m/',
        null=True,
        blank=True,
        help_text="Foto da evidência ou problema encontrado"
    )
    data_hora_resposta = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['manutencao', 'item__ordem']
        verbose_name = 'Resposta de Item de Manutenção'
        verbose_name_plural = 'Respostas de Itens de Manutenção'
        unique_together = ['manutencao', 'item']

    def __str__(self):
        return f"{self.manutencao.id} - {self.item.descricao}: {self.resposta}"

    def is_nao_conforme(self):
        """Verifica se o item não foi executado ou está não conforme"""
        return self.resposta in ['NAO_EXECUTADO', 'NAO_CONFORME']