"""
Permissões customizadas baseadas em roles e módulos habilitados
"""
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
    if not user.is_authenticated:
        return queryset.none()

    role = get_user_role_safe(user)

    if role == 'ADMIN':
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
            # Model tem campo 'cliente' direto (Orcamento, OrdemServico, ContaReceber, PedidoCompra)
            if hasattr(model, 'cliente'):
                return queryset.filter(cliente=cliente)
            # Model tem campo 'equipamento' (Abastecimento, Manutencao, ChecklistRealizado)
            if hasattr(model, 'equipamento'):
                return queryset.filter(equipamento__cliente=cliente)
        except Exception:
            pass
        return queryset.none()

    if role == 'SUPERVISOR':
        try:
            supervisor = getattr(user, 'supervisor_profile', None)
            if not supervisor:
                return queryset
            model = queryset.model
            if model.__name__ == 'Empreendimento':
                return queryset.filter(supervisor=supervisor)
            if hasattr(model, 'equipamento'):
                return queryset.filter(equipamento__empreendimento__supervisor=supervisor)
            if hasattr(model, 'empreendimento'):
                return queryset.filter(empreendimento__supervisor=supervisor)
            if hasattr(model, 'cliente'):
                from cadastro.models import Empreendimento
                clientes_ids = Empreendimento.objects.filter(
                    supervisor=supervisor
                ).values_list('cliente_id', flat=True)
                return queryset.filter(cliente_id__in=clientes_ids)
        except Exception:
            pass

    # OPERADOR, TECNICO, e outros: retorna tudo (HasModuleAccess controla acesso)
    return queryset


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

        # SUPERVISOR vê empreendimentos que supervisiona
        if role == 'SUPERVISOR':
            try:
                supervisor = getattr(user, 'supervisor_profile', None)
                if supervisor:
                    if hasattr(queryset.model, 'equipamento'):
                        return queryset.filter(equipamento__empreendimento__supervisor=supervisor)
                    if hasattr(queryset.model, 'empreendimento'):
                        return queryset.filter(empreendimento__supervisor=supervisor)
                    if queryset.model.__name__ == 'Empreendimento':
                        return queryset.filter(supervisor=supervisor)
                    if hasattr(queryset.model, 'cliente'):
                        empreendimentos_ids = supervisor.empreendimentos.values_list('cliente_id', flat=True)
                        return queryset.filter(cliente_id__in=empreendimentos_ids)
            except Exception:
                pass

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
    Permite gerenciar operadores para ADMIN e SUPERVISOR
    """
    message = "Você não tem permissão para gerenciar operadores."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and hasattr(request.user, 'profile')):
            return False

        # Leitura permitida para supervisor e admin
        if request.method in permissions.SAFE_METHODS:
            return request.user.profile.role in ['ADMIN', 'SUPERVISOR']

        # Escrita apenas para admin
        return request.user.profile.role == 'ADMIN'


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
