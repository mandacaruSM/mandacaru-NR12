"""
Permissões customizadas baseadas em roles e módulos habilitados
"""
from django.db import models
from rest_framework import permissions


def get_user_role_safe(user):
    """Retorna role do usuário de forma segura, sem risco de 500."""
    try:
        if user.is_superuser:
            return 'ADMIN'
        if hasattr(user, 'profile') and user.profile:
            return user.profile.role
    except Exception:
        pass
    return None


def filter_by_role(queryset, user):
    """
    Filtra queryset baseado no role do usuário de forma segura.
    Uso: qs = filter_by_role(qs, request.user)

    Lógica:
    - ADMIN/superuser: vê tudo
    - CLIENTE: vê apenas dados do seu cliente (por campo 'cliente' ou 'equipamento__cliente')
    - SUPERVISOR: vê dados dos empreendimentos que supervisiona
    - OPERADOR/TECNICO: veem tudo (controle feito por HasModuleAccess)
    """
    import logging
    logger = logging.getLogger(__name__)

    if not user.is_authenticated:
        logger.warning(f"filter_by_role: usuário não autenticado")
        return queryset.none()

    role = get_user_role_safe(user)
    model_name = queryset.model.__name__
    logger.info(f"filter_by_role: user={user.username}, role={role}, model={model_name}")

    # Se não conseguiu determinar o role, bloqueia acesso por segurança
    if role is None:
        logger.warning(f"filter_by_role: role é None para user={user.username}")
        return queryset.none()

    if role == 'ADMIN':
        logger.info(f"filter_by_role: ADMIN - retornando queryset completo")
        return queryset

    if role == 'CLIENTE':
        try:
            cliente = getattr(user, 'cliente_profile', None)
            if not cliente:
                return queryset.none()
            model = queryset.model
            # Model é Cliente
            if model.__name__ == 'Cliente':
                return queryset.filter(id=cliente.id)
            # Model é Empreendimento
            if model.__name__ == 'Empreendimento':
                return queryset.filter(cliente=cliente)
            # Tecnico/Operador com M2M 'clientes'
            if model.__name__ in ('Tecnico', 'Operador'):
                return queryset.filter(clientes=cliente).distinct()
            # Model tem campo 'cliente' direto (Orcamento, OrdemServico, ContaReceber, PedidoCompra)
            if hasattr(model, 'cliente'):
                return queryset.filter(cliente=cliente)
            # Model tem campo 'equipamento' (Abastecimento, Manutencao, ChecklistRealizado)
            if hasattr(model, 'equipamento'):
                return queryset.filter(equipamento__cliente=cliente)
            # Model tem campo 'checklist' (RespostaItemChecklist)
            if hasattr(model, 'checklist'):
                return queryset.filter(checklist__equipamento__cliente=cliente)
            # Model tem campo 'manutencao' (RespostaItemManutencao)
            if hasattr(model, 'manutencao'):
                return queryset.filter(manutencao__equipamento__cliente=cliente)
            # Model tem campo 'ordem_servico' (ItemOrdemServico)
            if hasattr(model, 'ordem_servico'):
                return queryset.filter(ordem_servico__cliente=cliente)
            # Model tem campo 'orcamento' (ItemOrcamento)
            if hasattr(model, 'orcamento'):
                return queryset.filter(orcamento__cliente=cliente)
            # Model tem campo 'pedido' (ItemPedidoCompra)
            if hasattr(model, 'pedido'):
                return queryset.filter(pedido__cliente=cliente)
            # Model tem campo 'conta_receber' (Pagamento)
            if hasattr(model, 'conta_receber'):
                return queryset.filter(conta_receber__cliente=cliente)
        except Exception:
            pass
        return queryset.none()

    if role == 'SUPERVISOR':
        try:
            supervisor = getattr(user, 'supervisor_profile', None)
            if not supervisor:
                return queryset
            model = queryset.model

            # Pega os clientes vinculados ao supervisor (acesso igual ao CLIENTE)
            clientes_ids = list(supervisor.clientes.values_list('id', flat=True))
            logger.info(f"filter_by_role SUPERVISOR: clientes_ids={clientes_ids}")

            # Se não tem clientes vinculados, não vê nada
            if not clientes_ids:
                return queryset.none()

            # Model é Cliente - vê apenas os clientes vinculados
            if model.__name__ == 'Cliente':
                return queryset.filter(id__in=clientes_ids)

            # Model é Empreendimento - vê empreendimentos dos clientes vinculados
            if model.__name__ == 'Empreendimento':
                return queryset.filter(cliente_id__in=clientes_ids)

            # Tecnico/Operador com M2M 'clientes'
            if model.__name__ in ('Tecnico', 'Operador'):
                return queryset.filter(clientes__id__in=clientes_ids).distinct()

            # Supervisor - vê apenas ele mesmo
            if model.__name__ == 'Supervisor':
                return queryset.filter(id=supervisor.id)

            # Model tem campo 'cliente' direto (Orcamento, OrdemServico, ContaReceber, PedidoCompra, Equipamento)
            if hasattr(model, 'cliente'):
                return queryset.filter(cliente_id__in=clientes_ids)

            # Model tem campo 'equipamento' (Abastecimento, Manutencao, ChecklistRealizado)
            if hasattr(model, 'equipamento'):
                return queryset.filter(equipamento__cliente_id__in=clientes_ids)

            # Model tem campo 'checklist' (RespostaItemChecklist)
            if hasattr(model, 'checklist'):
                return queryset.filter(checklist__equipamento__cliente_id__in=clientes_ids)

            # Model tem campo 'manutencao' (RespostaItemManutencao)
            if hasattr(model, 'manutencao'):
                return queryset.filter(manutencao__equipamento__cliente_id__in=clientes_ids)

            # Model tem campo 'empreendimento'
            if hasattr(model, 'empreendimento'):
                return queryset.filter(empreendimento__cliente_id__in=clientes_ids)

            # Model tem campo 'ordem_servico' (ItemOrdemServico)
            if hasattr(model, 'ordem_servico'):
                return queryset.filter(ordem_servico__cliente_id__in=clientes_ids)

            # Model tem campo 'orcamento' (ItemOrcamento)
            if hasattr(model, 'orcamento'):
                return queryset.filter(orcamento__cliente_id__in=clientes_ids)

            # Model tem campo 'pedido' (ItemPedidoCompra)
            if hasattr(model, 'pedido'):
                return queryset.filter(pedido__cliente_id__in=clientes_ids)

            # Model tem campo 'conta_receber' (Pagamento)
            if hasattr(model, 'conta_receber'):
                return queryset.filter(conta_receber__cliente_id__in=clientes_ids)

        except Exception as e:
            logger.error(f"filter_by_role SUPERVISOR error: {e}")
            pass
        return queryset.none()

    if role == 'OPERADOR':
        try:
            operador = getattr(user, 'operador_profile', None)
            if not operador:
                return queryset
            model = queryset.model
            # Operador ve apenas equipamentos autorizados
            if model.__name__ == 'Equipamento':
                return queryset.filter(
                    models.Q(id__in=operador.equipamentos_autorizados.values_list('id', flat=True)) |
                    models.Q(cliente__in=operador.clientes.all())
                ).distinct()
            # Models com equipamento (Checklist, Abastecimento, Manutencao, etc)
            if hasattr(model, 'equipamento'):
                return queryset.filter(
                    models.Q(equipamento__in=operador.equipamentos_autorizados.all()) |
                    models.Q(equipamento__cliente__in=operador.clientes.all())
                ).distinct()
            # Models com checklist (RespostaItemChecklist)
            if hasattr(model, 'checklist'):
                return queryset.filter(
                    models.Q(checklist__equipamento__in=operador.equipamentos_autorizados.all()) |
                    models.Q(checklist__equipamento__cliente__in=operador.clientes.all())
                ).distinct()
            # Models com manutencao (RespostaItemManutencao)
            if hasattr(model, 'manutencao'):
                return queryset.filter(
                    models.Q(manutencao__equipamento__in=operador.equipamentos_autorizados.all()) |
                    models.Q(manutencao__equipamento__cliente__in=operador.clientes.all())
                ).distinct()
            # Sub-recursos com FK indireto
            if hasattr(model, 'ordem_servico'):
                return queryset.filter(
                    models.Q(ordem_servico__cliente__in=operador.clientes.all()) |
                    models.Q(ordem_servico__equipamento__cliente__in=operador.clientes.all())
                ).distinct()
            if hasattr(model, 'orcamento'):
                return queryset.filter(
                    models.Q(orcamento__cliente__in=operador.clientes.all()) |
                    models.Q(orcamento__equipamento__cliente__in=operador.clientes.all())
                ).distinct()
            if hasattr(model, 'pedido'):
                return queryset.filter(
                    pedido__cliente__in=operador.clientes.all()
                ).distinct()
            if hasattr(model, 'conta_receber'):
                return queryset.filter(
                    conta_receber__cliente__in=operador.clientes.all()
                ).distinct()
            # Empreendimento
            if model.__name__ == 'Empreendimento':
                return queryset.filter(cliente__in=operador.clientes.all())
            # Cliente
            if model.__name__ == 'Cliente':
                return queryset.filter(id__in=operador.clientes.values_list('id', flat=True))
        except Exception:
            pass
        return queryset

    # TECNICO, FINANCEIRO, COMPRAS: retorna tudo (HasModuleAccess controla acesso)
    if role in ('TECNICO', 'FINANCEIRO', 'COMPRAS'):
        return queryset

    # Role desconhecido: bloqueia por segurança
    return queryset.none()


class ClienteFilterMixin:
    """
    Mixin para filtrar automaticamente dados por cliente.
    ViewSets que herdam este mixin filtram automaticamente:
    - ADMIN: Vê tudo
    - SUPERVISOR: Vê seus empreendimentos
    - CLIENTE: Vê apenas seus próprios dados
    """

    def _get_user_role(self, user):
        """Retorna role do usuário de forma segura"""
        try:
            if hasattr(user, 'profile') and user.profile:
                return user.profile.role
        except Exception:
            pass
        return None

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if not user.is_authenticated:
            return queryset.none()

        # Superuser sempre vê tudo
        if user.is_superuser:
            return queryset

        role = self._get_user_role(user)

        # ADMIN vê tudo
        if role == 'ADMIN':
            return queryset

        # CLIENTE vê apenas seus próprios dados
        if role == 'CLIENTE':
            try:
                cliente = getattr(user, 'cliente_profile', None)
                if cliente:
                    if hasattr(queryset.model, 'cliente'):
                        return queryset.filter(cliente=cliente)
                    if queryset.model.__name__ == 'Cliente':
                        return queryset.filter(id=cliente.id)
                    if hasattr(queryset.model, 'equipamento'):
                        return queryset.filter(equipamento__cliente=cliente)
            except Exception:
                pass
            return queryset.none()

        # SUPERVISOR vê dados dos clientes vinculados (igual ao CLIENTE)
        if role == 'SUPERVISOR':
            try:
                supervisor = getattr(user, 'supervisor_profile', None)
                if supervisor:
                    clientes_ids = list(supervisor.clientes.values_list('id', flat=True))
                    if not clientes_ids:
                        return queryset.none()
                    if queryset.model.__name__ == 'Cliente':
                        return queryset.filter(id__in=clientes_ids)
                    if queryset.model.__name__ == 'Empreendimento':
                        return queryset.filter(cliente_id__in=clientes_ids)
                    if hasattr(queryset.model, 'cliente'):
                        return queryset.filter(cliente_id__in=clientes_ids)
                    if hasattr(queryset.model, 'equipamento'):
                        return queryset.filter(equipamento__cliente_id__in=clientes_ids)
            except Exception:
                pass
            return queryset.none()

        # OPERADOR, TECNICO e outros roles: retorna queryset sem filtro extra
        # (o HasModuleAccess já limita o acesso ao módulo)
        if role in ('OPERADOR', 'TECNICO'):
            return queryset

        return queryset


class IsAdminUser(permissions.BasePermission):
    """
    Permite acesso apenas para usuários com role ADMIN
    """
    message = "Apenas administradores têm acesso a este recurso."

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'profile') and
            request.user.profile.role == 'ADMIN'
        )


class IsSupervisorUser(permissions.BasePermission):
    """
    Permite acesso para usuários com role SUPERVISOR ou ADMIN
    """
    message = "Apenas supervisores ou administradores têm acesso a este recurso."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and hasattr(request.user, 'profile')):
            return False

        return request.user.profile.role in ['ADMIN', 'SUPERVISOR']


class HasModuleAccess(permissions.BasePermission):
    """
    Verifica se o usuário tem acesso ao módulo específico
    Use como: permission_classes = [IsAuthenticated, HasModuleAccess]
    E defina no ViewSet: required_module = 'equipamentos'
    """
    message = "Você não tem permissão para acessar este módulo."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and hasattr(request.user, 'profile')):
            return False

        # Admin tem acesso a tudo
        if request.user.profile.role == 'ADMIN':
            return True

        # Verifica se a view define um módulo requerido
        if not hasattr(view, 'required_module'):
            return True  # Se não definir, permite (para compatibilidade)

        required_module = view.required_module
        user_modules = request.user.profile.modules_enabled or []

        return required_module in user_modules


class CanManageOperadores(permissions.BasePermission):
    """
    Permite gerenciar operadores para ADMIN, SUPERVISOR e CLIENTE
    - ADMIN: acesso total
    - SUPERVISOR: leitura e escrita dos seus empreendimentos
    - CLIENTE: leitura e escrita dos seus operadores
    """
    message = "Você não tem permissão para gerenciar operadores."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and hasattr(request.user, 'profile')):
            return False

        role = request.user.profile.role

        # ADMIN tem acesso total
        if role == 'ADMIN':
            return True

        # SUPERVISOR e CLIENTE podem ler e escrever
        if role in ['SUPERVISOR', 'CLIENTE']:
            return True

        return False


class CanManageSupervisores(permissions.BasePermission):
    """
    Permite gerenciar supervisores para ADMIN e CLIENTE
    - ADMIN: acesso total
    - CLIENTE: pode criar/editar supervisores vinculados ao seu cliente
    """
    message = "Você não tem permissão para gerenciar supervisores."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and hasattr(request.user, 'profile')):
            return False

        role = request.user.profile.role

        # ADMIN tem acesso total
        if role == 'ADMIN':
            return True

        # CLIENTE pode gerenciar seus supervisores
        if role == 'CLIENTE':
            return True

        return False


class CanViewOwnDataOnly(permissions.BasePermission):
    """
    Usuários não-admin só podem ver seus próprios dados
    """
    message = "Você só pode visualizar seus próprios dados."

    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated and hasattr(request.user, 'profile')):
            return False

        # Admin vê tudo
        if request.user.profile.role == 'ADMIN':
            return True

        # Supervisor vê dados relacionados aos seus clientes/empreendimentos
        if request.user.profile.role == 'SUPERVISOR':
            if hasattr(request.user, 'supervisor_profile'):
                supervisor = request.user.supervisor_profile

                # Verifica se o objeto está relacionado aos clientes do supervisor
                if hasattr(obj, 'cliente'):
                    return supervisor.clientes.filter(id=obj.cliente.id).exists()

                # Verifica se o objeto está relacionado aos empreendimentos do supervisor
                if hasattr(obj, 'empreendimento'):
                    return supervisor.empreendimentos_vinculados.filter(id=obj.empreendimento.id).exists()

        # Cliente vê apenas dados do próprio cliente
        if request.user.profile.role == 'CLIENTE':
            if hasattr(request.user, 'cliente_profile'):
                cliente = request.user.cliente_profile

                # Verifica se o objeto está relacionado ao cliente
                if hasattr(obj, 'cliente'):
                    return obj.cliente.id == cliente.id

                # Se é o próprio Cliente
                if obj.__class__.__name__ == 'Cliente':
                    return obj.id == cliente.id

        return False


class ReadOnly(permissions.BasePermission):
    """
    Permite apenas leitura (GET, HEAD, OPTIONS)
    """
    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS


class OperadorCanOnlyCreate(permissions.BasePermission):
    """
    Operadores podem apenas criar registros (Checklists, Abastecimentos),
    mas não podem editar/deletar dados mestres de equipamentos.

    - OPERADOR: Apenas POST (criar Checklists/Abastecimentos)
    - ADMIN/SUPERVISOR: Acesso completo
    """
    message = "Operadores só podem criar registros, não editar dados mestres."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and hasattr(request.user, 'profile')):
            return False

        # Admin e Supervisor têm acesso total
        if request.user.profile.role in ['ADMIN', 'SUPERVISOR']:
            return True

        # Operador pode apenas ler (GET) ou criar (POST)
        if request.user.profile.role == 'OPERADOR':
            return request.method in ['GET', 'HEAD', 'OPTIONS', 'POST']

        # Outros perfis (CLIENTE, TECNICO, FINANCEIRO, COMPRAS)
        return True

    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated and hasattr(request.user, 'profile')):
            return False

        # Admin e Supervisor podem tudo
        if request.user.profile.role in ['ADMIN', 'SUPERVISOR']:
            return True

        # Operador pode apenas ler objetos individuais (não PUT/PATCH/DELETE)
        if request.user.profile.role == 'OPERADOR':
            return request.method in permissions.SAFE_METHODS

        return True


class CannotEditMasterData(permissions.BasePermission):
    """
    Operadores NÃO podem editar dados mestres como Equipamentos, Tipos de Equipamento, etc.
    Apenas ADMIN e SUPERVISOR podem editar/deletar.

    Use em ViewSets de dados mestres como EquipamentoViewSet, TipoEquipamentoViewSet.
    """
    message = "Operadores não têm permissão para editar dados mestres."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and hasattr(request.user, 'profile')):
            return False

        # Admin e Supervisor podem tudo
        if request.user.profile.role in ['ADMIN', 'SUPERVISOR']:
            return True

        # Operador pode apenas ler (GET)
        if request.user.profile.role == 'OPERADOR':
            return request.method in permissions.SAFE_METHODS

        # Cliente pode ler
        if request.user.profile.role == 'CLIENTE':
            return request.method in permissions.SAFE_METHODS

        # Outros perfis
        return True


class CanManageNR12Models(permissions.BasePermission):
    """
    Permissão para gerenciar modelos de checklist/manutenção NR12.
    - ADMIN: acesso total (criar/editar modelos globais ou de qualquer cliente)
    - CLIENTE: pode criar/editar modelos vinculados ao seu cliente
    - SUPERVISOR: pode visualizar modelos dos clientes vinculados
    - OPERADOR/TECNICO: apenas leitura
    """
    message = "Você não tem permissão para gerenciar modelos de checklist."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and hasattr(request.user, 'profile')):
            return False

        role = request.user.profile.role

        # Admin tem acesso total
        if role == 'ADMIN':
            return True

        # Cliente pode criar/editar seus próprios modelos
        if role == 'CLIENTE':
            return True

        # Supervisor pode ler, mas não criar/editar
        if role == 'SUPERVISOR':
            return request.method in permissions.SAFE_METHODS

        # Operador e Técnico podem apenas ler
        if role in ['OPERADOR', 'TECNICO']:
            return request.method in permissions.SAFE_METHODS

        return request.method in permissions.SAFE_METHODS

    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated and hasattr(request.user, 'profile')):
            return False

        role = request.user.profile.role

        # Admin pode tudo
        if role == 'ADMIN':
            return True

        # Cliente só pode editar modelos do próprio cliente
        if role == 'CLIENTE':
            cliente = getattr(request.user, 'cliente_profile', None)
            if cliente:
                # Verifica se o modelo pertence ao cliente
                if hasattr(obj, 'cliente') and obj.cliente:
                    return obj.cliente.id == cliente.id
            return request.method in permissions.SAFE_METHODS

        # Supervisor e outros: apenas leitura
        return request.method in permissions.SAFE_METHODS
