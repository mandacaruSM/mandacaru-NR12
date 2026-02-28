# backend/cadastro/planos.py
"""
Modelos e configurações de planos de assinatura do sistema
"""
from decimal import Decimal
from django.db import models


class Plano(models.Model):
    """
    Modelo que representa os planos de assinatura do sistema
    Define features, limites e módulos disponíveis por plano
    """

    TIPO_CHOICES = [
        ('ESSENCIAL', 'Essencial'),
        ('PROFISSIONAL', 'Profissional'),
        ('AVANCADO', 'Avançado'),
        ('ENTERPRISE', 'Enterprise'),
    ]

    nome = models.CharField(max_length=100, verbose_name="Nome do Plano")
    tipo = models.CharField(
        max_length=20,
        choices=TIPO_CHOICES,
        unique=True,
        verbose_name="Tipo de Plano"
    )
    descricao = models.TextField(blank=True, default="", verbose_name="Descrição")
    valor_mensal = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Valor Mensal (R$)"
    )
    preco_por_equipamento = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Preço por Equipamento (R$/mês)",
        help_text="Valor cobrado por equipamento ativo por mês"
    )

    # Limites
    limite_usuarios = models.IntegerField(
        default=5,
        help_text="Número máximo de usuários. 0 = ilimitado"
    )
    limite_equipamentos = models.IntegerField(
        default=0,
        help_text="Número máximo de equipamentos. 0 = ilimitado"
    )
    limite_empreendimentos = models.IntegerField(
        default=0,
        help_text="Número máximo de empreendimentos. 0 = ilimitado"
    )

    # Módulos habilitados (JSON com lista de módulos)
    modulos_habilitados = models.JSONField(
        default=list,
        help_text="Lista de módulos disponíveis neste plano"
    )

    # Features especiais
    bot_telegram = models.BooleanField(default=False, verbose_name="Bot Telegram")
    qr_code_equipamento = models.BooleanField(default=False, verbose_name="QR Code por Equipamento")
    checklist_mobile = models.BooleanField(default=False, verbose_name="Checklist Mobile")
    backups_automaticos = models.BooleanField(default=False, verbose_name="Backups Automáticos")
    suporte_prioritario = models.BooleanField(default=False, verbose_name="Suporte Prioritário")
    suporte_whatsapp = models.BooleanField(default=False, verbose_name="Suporte WhatsApp")
    multiempresa = models.BooleanField(default=False, verbose_name="Multi-empresa")
    customizacoes = models.BooleanField(default=False, verbose_name="Customizações")
    hospedagem_dedicada = models.BooleanField(default=False, verbose_name="Hospedagem Dedicada")

    ativo = models.BooleanField(default=True)
    ordem = models.IntegerField(default=0, help_text="Ordem de exibição")
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['ordem', 'valor_mensal']
        verbose_name = "Plano"
        verbose_name_plural = "Planos"

    def __str__(self):
        return f"{self.nome} - R$ {self.valor_mensal}/mês"

    @property
    def features_resumo(self):
        """Retorna resumo das features do plano"""
        features = []

        if self.limite_usuarios == 0:
            features.append("Usuários ilimitados")
        else:
            features.append(f"Até {self.limite_usuarios} usuários")

        if self.limite_equipamentos == 0:
            features.append("Equipamentos ilimitados")
        else:
            features.append(f"Até {self.limite_equipamentos} equipamentos")

        if self.bot_telegram:
            features.append("Bot Telegram integrado")

        if self.qr_code_equipamento:
            features.append("QR Code por equipamento")

        if self.checklist_mobile:
            features.append("Checklist mobile")

        if self.backups_automaticos:
            features.append("Backups automáticos")

        if self.suporte_whatsapp:
            features.append("Suporte WhatsApp")
        elif self.suporte_prioritario:
            features.append("Suporte prioritário")
        else:
            features.append("Suporte por e-mail")

        if self.multiempresa:
            features.append("Multi-empresa")

        if self.customizacoes:
            features.append("Customizações")

        if self.hospedagem_dedicada:
            features.append("Hospedagem dedicada")

        return features


class AssinaturaCliente(models.Model):
    """
    Controla a assinatura de um cliente
    """

    STATUS_CHOICES = [
        ('ATIVA', 'Ativa'),
        ('SUSPENSA', 'Suspensa'),
        ('CANCELADA', 'Cancelada'),
        ('TRIAL', 'Trial'),
    ]

    cliente = models.OneToOneField(
        'Cliente',
        on_delete=models.CASCADE,
        related_name='assinatura'
    )
    plano = models.ForeignKey(
        Plano,
        on_delete=models.PROTECT,
        related_name='assinaturas'
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='ATIVA'
    )

    data_inicio = models.DateField(auto_now_add=True)
    data_fim_trial = models.DateField(null=True, blank=True, help_text="Data de término do período trial")
    data_proximo_pagamento = models.DateField(null=True, blank=True)
    data_cancelamento = models.DateField(null=True, blank=True)

    observacoes = models.TextField(blank=True, default="")

    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Assinatura"
        verbose_name_plural = "Assinaturas"

    def __str__(self):
        return f"{self.cliente.nome_razao} - {self.plano.nome} ({self.status})"

    @property
    def esta_ativa(self):
        """Verifica se a assinatura está ativa"""
        return self.status in ['ATIVA', 'TRIAL']

    def verificar_limite_usuarios(self):
        """Verifica se o cliente atingiu o limite de usuários"""
        if self.plano.limite_usuarios == 0:
            return True  # Ilimitado

        # Conta usuários do cliente (admin não conta)
        from django.contrib.auth import get_user_model
        User = get_user_model()

        usuarios_cliente = User.objects.filter(
            cliente_profile=self.cliente
        ).exclude(
            profile__role='ADMIN'
        ).count()

        return usuarios_cliente < self.plano.limite_usuarios

    def verificar_limite_equipamentos(self):
        """Verifica se o cliente atingiu o limite de equipamentos"""
        if self.plano.limite_equipamentos == 0:
            return True  # Ilimitado

        total_equipamentos = self.cliente.equipamentos.count()
        return total_equipamentos < self.plano.limite_equipamentos

    def verificar_limite_empreendimentos(self):
        """Verifica se o cliente atingiu o limite de empreendimentos"""
        if self.plano.limite_empreendimentos == 0:
            return True  # Ilimitado

        total_empreendimentos = self.cliente.empreendimentos.count()
        return total_empreendimentos < self.plano.limite_empreendimentos
