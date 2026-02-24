# backend/manutencao/models_alertas.py
"""
Sistema de Alertas Automáticos de Manutenção
Gera alertas baseados em horímetro, calendário e checklist NR12
"""

from django.db import models
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal


class ManutencaoAlerta(models.Model):
    """
    Alertas automáticos de manutenção preventiva
    Gerados por rotina cron ou signal
    """

    TIPO_CHOICES = [
        ('PREVENTIVA_VENCIDA', 'Manutenção Preventiva Vencida'),
        ('PREVENTIVA_PROXIMA', 'Manutenção Preventiva Próxima'),
        ('CHECKLIST_VENCIDO', 'Checklist NR12 Vencido'),
        ('CHECKLIST_PROXIMO', 'Checklist NR12 Próximo'),
        ('COMPONENTE_VIDA_UTIL', 'Componente Próximo da Vida Útil'),
        ('OPERADOR_RECICLAGEM', 'Operador Precisa de Reciclagem NR12'),
    ]

    PRIORIDADE_CHOICES = [
        ('BAIXA', 'Baixa'),
        ('MEDIA', 'Média'),
        ('ALTA', 'Alta'),
        ('CRITICA', 'Crítica'),
    ]

    equipamento = models.ForeignKey(
        'equipamentos.Equipamento',
        on_delete=models.CASCADE,
        related_name='alertas_manutencao'
    )

    tipo = models.CharField(max_length=30, choices=TIPO_CHOICES)
    prioridade = models.CharField(max_length=10, choices=PRIORIDADE_CHOICES, default='MEDIA')

    titulo = models.CharField(max_length=200)
    mensagem = models.TextField()

    # Gatilho que gerou o alerta
    leitura_atual = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Horímetro/KM no momento do alerta'
    )
    leitura_limite = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Leitura limite que disparou o alerta'
    )
    data_limite = models.DateField(
        null=True,
        blank=True,
        help_text='Data limite que disparou o alerta'
    )

    # Relacionamentos opcionais
    plano_manutencao = models.ForeignKey(
        'equipamentos.PlanoManutencaoItem',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='alertas'
    )
    programacao_manutencao = models.ForeignKey(
        'nr12.ProgramacaoManutencao',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='alertas'
    )

    # Controle do alerta
    lido = models.BooleanField(default=False)
    data_lido = models.DateTimeField(null=True, blank=True)
    lido_por = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alertas_lidos'
    )

    resolvido = models.BooleanField(default=False)
    data_resolucao = models.DateTimeField(null=True, blank=True)
    resolvido_por = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alertas_resolvidos'
    )
    manutencao_realizada = models.ForeignKey(
        'manutencao.Manutencao',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alertas'
    )

    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-prioridade', '-criado_em']
        verbose_name = 'Alerta de Manutenção'
        verbose_name_plural = 'Alertas de Manutenção'
        indexes = [
            models.Index(fields=['equipamento', 'lido', 'resolvido']),
            models.Index(fields=['tipo', 'prioridade']),
            models.Index(fields=['-criado_em']),
        ]

    def __str__(self):
        return f"{self.equipamento.codigo} - {self.get_tipo_display()} [{self.get_prioridade_display()}]"

    def marcar_como_lido(self, usuario):
        """Marca o alerta como lido"""
        self.lido = True
        self.data_lido = timezone.now()
        self.lido_por = usuario
        self.save(update_fields=['lido', 'data_lido', 'lido_por', 'atualizado_em'])

    def resolver(self, usuario, manutencao=None):
        """Marca o alerta como resolvido"""
        self.resolvido = True
        self.data_resolucao = timezone.now()
        self.resolvido_por = usuario
        if manutencao:
            self.manutencao_realizada = manutencao
        self.save(update_fields=['resolvido', 'data_resolucao', 'resolvido_por', 'manutencao_realizada', 'atualizado_em'])

    @property
    def dias_em_aberto(self):
        """Número de dias desde a criação do alerta"""
        return (timezone.now() - self.criado_em).days

    @property
    def esta_critico(self):
        """Verifica se o alerta está crítico (mais de 7 dias sem resolução)"""
        return not self.resolvido and self.dias_em_aberto > 7


class GatilhoManutencao(models.Model):
    """
    Configuração de gatilhos automáticos de manutenção preventiva
    Define QUANDO avisar baseado em horímetro, calendário ou ambos
    """

    TIPO_GATILHO_CHOICES = [
        ('HORIMETRO', 'Por Horímetro/KM'),
        ('CALENDARIO', 'Por Calendário (dias)'),
        ('AMBOS', 'Horímetro E Calendário'),
    ]

    equipamento = models.ForeignKey(
        'equipamentos.Equipamento',
        on_delete=models.CASCADE,
        related_name='gatilhos_manutencao'
    )

    nome = models.CharField(
        max_length=150,
        help_text='Ex: Revisão 250h, Troca de óleo 500h, Inspeção mensal'
    )
    descricao = models.TextField(blank=True, default='')

    tipo_gatilho = models.CharField(max_length=10, choices=TIPO_GATILHO_CHOICES)

    # Gatilho por horímetro/KM
    intervalo_leitura = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Ex: 250 (a cada 250h ou 250km)'
    )
    antecedencia_leitura = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=Decimal('0.10'),
        help_text='Percentual de antecedência (0.10 = 10%)'
    )

    # Gatilho por calendário
    intervalo_dias = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Ex: 30 (a cada 30 dias)'
    )
    antecedencia_dias = models.PositiveIntegerField(
        default=7,
        help_text='Dias de antecedência para alertar'
    )

    # Itens necessários (para gerar requisição automática)
    itens_necessarios = models.ManyToManyField(
        'almoxarifado.Produto',
        through='ItemGatilhoManutencao',
        related_name='gatilhos_manutencao',
        blank=True
    )

    # Controle
    ativo = models.BooleanField(default=True)
    proxima_execucao_leitura = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    proxima_execucao_data = models.DateField(null=True, blank=True)
    ultima_execucao = models.DateTimeField(null=True, blank=True)

    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['equipamento', 'nome']
        verbose_name = 'Gatilho de Manutenção'
        verbose_name_plural = 'Gatilhos de Manutenção'
        unique_together = [['equipamento', 'nome']]

    def __str__(self):
        return f"{self.equipamento.codigo} - {self.nome}"

    def calcular_proxima_execucao(self):
        """Calcula a próxima data/leitura de execução baseado no tipo de gatilho"""
        if self.tipo_gatilho in ['HORIMETRO', 'AMBOS'] and self.intervalo_leitura:
            # Baseado na última leitura do equipamento
            leitura_atual = self.equipamento.leitura_atual
            if self.equipamento.leitura_ultima_manutencao:
                proxima = self.equipamento.leitura_ultima_manutencao + self.intervalo_leitura
            else:
                proxima = leitura_atual + self.intervalo_leitura
            self.proxima_execucao_leitura = proxima

        if self.tipo_gatilho in ['CALENDARIO', 'AMBOS'] and self.intervalo_dias:
            # Baseado na última manutenção ou data atual
            if self.equipamento.data_ultima_manutencao:
                proxima_data = self.equipamento.data_ultima_manutencao + timedelta(days=self.intervalo_dias)
            else:
                proxima_data = timezone.now().date() + timedelta(days=self.intervalo_dias)
            self.proxima_execucao_data = proxima_data

        self.save(update_fields=['proxima_execucao_leitura', 'proxima_execucao_data', 'atualizado_em'])

    def verificar_e_criar_alerta(self):
        """
        Verifica se deve criar um alerta baseado nos gatilhos configurados
        Retorna o alerta criado ou None
        """
        if not self.ativo:
            return None

        deve_alertar = False
        mensagem_partes = []
        prioridade = 'MEDIA'

        # Verifica gatilho por horímetro/KM
        if self.tipo_gatilho in ['HORIMETRO', 'AMBOS'] and self.proxima_execucao_leitura:
            leitura_atual = self.equipamento.leitura_atual
            leitura_alerta = self.proxima_execucao_leitura - (self.proxima_execucao_leitura * self.antecedencia_leitura)

            if leitura_atual >= self.proxima_execucao_leitura:
                deve_alertar = True
                prioridade = 'ALTA'
                mensagem_partes.append(
                    f"VENCIDA: Leitura atual {leitura_atual} {self.equipamento.get_tipo_medicao_display()} "
                    f"já passou da meta {self.proxima_execucao_leitura}"
                )
            elif leitura_atual >= leitura_alerta:
                deve_alertar = True
                faltam = self.proxima_execucao_leitura - leitura_atual
                mensagem_partes.append(
                    f"PRÓXIMA: Faltam {faltam} {self.equipamento.get_tipo_medicao_display()} "
                    f"para atingir {self.proxima_execucao_leitura}"
                )

        # Verifica gatilho por calendário
        if self.tipo_gatilho in ['CALENDARIO', 'AMBOS'] and self.proxima_execucao_data:
            hoje = timezone.now().date()
            data_alerta = self.proxima_execucao_data - timedelta(days=self.antecedencia_dias)

            if hoje >= self.proxima_execucao_data:
                deve_alertar = True
                prioridade = 'ALTA'
                dias_atraso = (hoje - self.proxima_execucao_data).days
                mensagem_partes.append(
                    f"VENCIDA: {dias_atraso} dias de atraso (venceu em {self.proxima_execucao_data.strftime('%d/%m/%Y')})"
                )
            elif hoje >= data_alerta:
                deve_alertar = True
                if prioridade != 'ALTA':
                    prioridade = 'MEDIA'
                faltam_dias = (self.proxima_execucao_data - hoje).days
                mensagem_partes.append(
                    f"PRÓXIMA: Faltam {faltam_dias} dias para a data prevista ({self.proxima_execucao_data.strftime('%d/%m/%Y')})"
                )

        if deve_alertar:
            # Verifica se já existe alerta não resolvido para este gatilho
            alerta_existente = ManutencaoAlerta.objects.filter(
                equipamento=self.equipamento,
                tipo__in=['PREVENTIVA_VENCIDA', 'PREVENTIVA_PROXIMA'],
                resolvido=False,
                titulo__icontains=self.nome
            ).first()

            if alerta_existente:
                # Atualiza o alerta existente
                alerta_existente.prioridade = prioridade
                alerta_existente.mensagem = f"{self.nome}\n\n" + "\n".join(mensagem_partes)
                alerta_existente.leitura_atual = self.equipamento.leitura_atual
                alerta_existente.save()
                return alerta_existente
            else:
                # Cria novo alerta
                tipo_alerta = 'PREVENTIVA_VENCIDA' if prioridade == 'ALTA' else 'PREVENTIVA_PROXIMA'

                alerta = ManutencaoAlerta.objects.create(
                    equipamento=self.equipamento,
                    tipo=tipo_alerta,
                    prioridade=prioridade,
                    titulo=f"Manutenção: {self.nome}",
                    mensagem="\n".join(mensagem_partes),
                    leitura_atual=self.equipamento.leitura_atual,
                    leitura_limite=self.proxima_execucao_leitura,
                    data_limite=self.proxima_execucao_data,
                )

                self.ultima_execucao = timezone.now()
                self.save(update_fields=['ultima_execucao', 'atualizado_em'])

                return alerta

        return None

    def gerar_requisicao_pecas(self):
        """
        Gera uma requisição automática de peças para esta manutenção
        Retorna a requisição criada ou None
        """
        if not self.itens_necessarios.exists():
            return None

        # TODO: Implementar criação de requisição de almoxarifado
        # Por enquanto, apenas lista os itens necessários
        itens = self.itens_necessarios.through.objects.filter(gatilho=self)
        return list(itens)


class ItemGatilhoManutencao(models.Model):
    """
    Itens necessários para uma manutenção programada
    Ex: Revisão 250h precisa de: 15L óleo, 1 filtro óleo, 1 filtro ar
    """

    gatilho = models.ForeignKey(
        GatilhoManutencao,
        on_delete=models.CASCADE,
        related_name='itens'
    )
    produto = models.ForeignKey(
        'almoxarifado.Produto',
        on_delete=models.CASCADE
    )
    quantidade = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        default=Decimal('1.000')
    )
    observacao = models.CharField(max_length=200, blank=True, default='')

    class Meta:
        unique_together = [['gatilho', 'produto']]
        verbose_name = 'Item do Gatilho'
        verbose_name_plural = 'Itens do Gatilho'

    def __str__(self):
        return f"{self.produto.nome} ({self.quantidade} {self.produto.unidade})"
