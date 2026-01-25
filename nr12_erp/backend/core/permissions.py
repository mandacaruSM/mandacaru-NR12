"""
Permissões customizadas baseadas em roles e módulos habilitados
"""
from rest_framework import permissions


class ClienteFilterMixin:
    """
    Mixin para filtrar automaticamente dados por cliente.
    ViewSets que herdam este mixin filtram automaticamente:
    - ADMIN: Vê tudo
    - SUPERVISOR: Vê seus empreendimentos
    - CLIENTE: Vê apenas seus próprios dados
    """

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if not user.is_authenticated:
            return queryset.none()

        # ADMIN vê tudo
        if hasattr(user, 'profile') and user.profile.role == 'ADMIN':
            return queryset

        # CLIENTE vê apenas seus próprios dados
        if hasattr(user, 'profile') and user.profile.role == 'CLIENTE':
            if hasattr(user, 'cliente_profile'):
                cliente = user.cliente_profile

                # Se o queryset tem campo 'cliente', filtra por ele
                if hasattr(queryset.model, 'cliente'):
                    return queryset.filter(cliente=cliente)

                # Se é o próprio model Cliente, retorna apenas este cliente
                if queryset.model.__name__ == 'Cliente':
                    return queryset.filter(id=cliente.id)

                # Se tem campo 'equipamento' (ex: Abastecimento, Manutencao)
                if hasattr(queryset.model, 'equipamento'):
                    return queryset.filter(equipamento__cliente=cliente)

            return queryset.none()

        # SUPERVISOR vê empreendimentos que supervisiona
        if hasattr(user, 'profile') and user.profile.role == 'SUPERVISOR':
            if hasattr(user, 'supervisor_profile'):
                supervisor = user.supervisor_profile

                # Se tem campo equipamento (ex: Abastecimento, Manutencao)
                if hasattr(queryset.model, 'equipamento'):
                    return queryset.filter(equipamento__empreendimento__supervisor=supervisor)

                # Se tem campo empreendimento, filtra pelos empreendimentos do supervisor
                if hasattr(queryset.model, 'empreendimento'):
                    return queryset.filter(empreendimento__supervisor=supervisor)

                # Se é Empreendimento, filtra pelos que ele supervisiona
                if queryset.model.__name__ == 'Empreendimento':
                    return queryset.filter(supervisor=supervisor)

                # Se tem campo cliente, filtra pelos clientes dos empreendimentos
                if hasattr(queryset.model, 'cliente'):
                    empreendimentos_ids = supervisor.empreendimentos.values_list('cliente_id', flat=True)
                    return queryset.filter(cliente_id__in=empreendimentos_ids)

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
