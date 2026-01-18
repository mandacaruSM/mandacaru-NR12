# backend/core/plan_validators.py
"""
Validadores para limites de planos de assinatura
"""
from rest_framework.exceptions import PermissionDenied
from django.contrib.auth import get_user_model

User = get_user_model()


class PlanLimitValidator:
    """
    Validador de limites baseado no plano de assinatura do cliente
    """

    @staticmethod
    def check_user_limit(cliente):
        """
        Verifica se o cliente atingiu o limite de usuários do plano

        Args:
            cliente: Instância de Cliente

        Raises:
            PermissionDenied: Se limite foi atingido

        Returns:
            bool: True se ainda pode criar usuários
        """
        # Verifica se cliente tem assinatura
        if not hasattr(cliente, 'assinatura') or not cliente.assinatura:
            # Sem assinatura = sem limite (modo admin)
            return True

        assinatura = cliente.assinatura
        plano = assinatura.plano

        # Verifica se assinatura está ativa
        if not assinatura.esta_ativa:
            raise PermissionDenied({
                "detail": "Assinatura suspensa ou cancelada. Entre em contato com o suporte.",
                "status": assinatura.status
            })

        # Limite 0 = ilimitado
        if plano.limite_usuarios == 0:
            return True

        # Conta usuários atuais do cliente (exclui admins)
        usuarios_atuais = User.objects.filter(
            cliente_profile=cliente
        ).exclude(
            profile__role='ADMIN'
        ).count()

        if usuarios_atuais >= plano.limite_usuarios:
            raise PermissionDenied({
                "detail": f"Limite de usuários atingido. Seu plano permite até {plano.limite_usuarios} usuários.",
                "plano": plano.nome,
                "limite": plano.limite_usuarios,
                "atual": usuarios_atuais,
                "upgrade_sugerido": _suggest_upgrade(plano, 'usuarios')
            })

        return True

    @staticmethod
    def check_equipment_limit(cliente):
        """
        Verifica se o cliente atingiu o limite de equipamentos do plano

        Args:
            cliente: Instância de Cliente

        Raises:
            PermissionDenied: Se limite foi atingido

        Returns:
            bool: True se ainda pode criar equipamentos
        """
        if not hasattr(cliente, 'assinatura') or not cliente.assinatura:
            return True

        assinatura = cliente.assinatura
        plano = assinatura.plano

        # Verifica se assinatura está ativa
        if not assinatura.esta_ativa:
            raise PermissionDenied({
                "detail": "Assinatura suspensa ou cancelada. Entre em contato com o suporte.",
                "status": assinatura.status
            })

        # Limite 0 = ilimitado
        if plano.limite_equipamentos == 0:
            return True

        # Conta equipamentos atuais
        from equipamentos.models import Equipamento
        equipamentos_atuais = Equipamento.objects.filter(cliente=cliente).count()

        if equipamentos_atuais >= plano.limite_equipamentos:
            raise PermissionDenied({
                "detail": f"Limite de equipamentos atingido. Seu plano permite até {plano.limite_equipamentos} equipamentos.",
                "plano": plano.nome,
                "limite": plano.limite_equipamentos,
                "atual": equipamentos_atuais,
                "upgrade_sugerido": _suggest_upgrade(plano, 'equipamentos')
            })

        return True

    @staticmethod
    def check_empreendimento_limit(cliente):
        """
        Verifica se o cliente atingiu o limite de empreendimentos do plano

        Args:
            cliente: Instância de Cliente

        Raises:
            PermissionDenied: Se limite foi atingido

        Returns:
            bool: True se ainda pode criar empreendimentos
        """
        if not hasattr(cliente, 'assinatura') or not cliente.assinatura:
            return True

        assinatura = cliente.assinatura
        plano = assinatura.plano

        # Verifica se assinatura está ativa
        if not assinatura.esta_ativa:
            raise PermissionDenied({
                "detail": "Assinatura suspensa ou cancelada. Entre em contato com o suporte.",
                "status": assinatura.status
            })

        # Limite 0 = ilimitado
        if plano.limite_empreendimentos == 0:
            return True

        # Conta empreendimentos atuais
        empreendimentos_atuais = cliente.empreendimentos.count()

        if empreendimentos_atuais >= plano.limite_empreendimentos:
            raise PermissionDenied({
                "detail": f"Limite de empreendimentos atingido. Seu plano permite até {plano.limite_empreendimentos} empreendimentos.",
                "plano": plano.nome,
                "limite": plano.limite_empreendimentos,
                "atual": empreendimentos_atuais,
                "upgrade_sugerido": _suggest_upgrade(plano, 'empreendimentos')
            })

        return True


def _suggest_upgrade(plano_atual, recurso):
    """
    Sugere upgrade de plano baseado no recurso limitado

    Args:
        plano_atual: Plano atual do cliente
        recurso: 'usuarios', 'equipamentos' ou 'empreendimentos'

    Returns:
        dict: Informações do plano sugerido ou None
    """
    from cadastro.planos import Plano

    # Mapeamento de ordem dos planos
    ordem_planos = {
        'ESSENCIAL': 1,
        'PROFISSIONAL': 2,
        'AVANCADO': 3,
        'ENTERPRISE': 4
    }

    ordem_atual = ordem_planos.get(plano_atual.tipo, 0)

    # Busca próximo plano disponível
    planos_superiores = Plano.objects.filter(
        ativo=True,
        ordem__gt=plano_atual.ordem
    ).order_by('ordem')

    for plano in planos_superiores:
        # Verifica se plano superior tem limite maior ou ilimitado
        if recurso == 'usuarios':
            if plano.limite_usuarios == 0 or plano.limite_usuarios > plano_atual.limite_usuarios:
                return {
                    "plano_id": plano.id,
                    "plano_nome": plano.nome,
                    "plano_tipo": plano.tipo,
                    "valor_mensal": float(plano.valor_mensal),
                    "novo_limite": plano.limite_usuarios if plano.limite_usuarios > 0 else "Ilimitado"
                }
        elif recurso == 'equipamentos':
            if plano.limite_equipamentos == 0 or plano.limite_equipamentos > plano_atual.limite_equipamentos:
                return {
                    "plano_id": plano.id,
                    "plano_nome": plano.nome,
                    "plano_tipo": plano.tipo,
                    "valor_mensal": float(plano.valor_mensal),
                    "novo_limite": plano.limite_equipamentos if plano.limite_equipamentos > 0 else "Ilimitado"
                }
        elif recurso == 'empreendimentos':
            if plano.limite_empreendimentos == 0 or plano.limite_empreendimentos > plano_atual.limite_empreendimentos:
                return {
                    "plano_id": plano.id,
                    "plano_nome": plano.nome,
                    "plano_tipo": plano.tipo,
                    "valor_mensal": float(plano.valor_mensal),
                    "novo_limite": plano.limite_empreendimentos if plano.limite_empreendimentos > 0 else "Ilimitado"
                }

    return None
