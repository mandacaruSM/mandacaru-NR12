"""
Permissões customizadas baseadas em roles e módulos habilitados
"""
from rest_framework import permissions


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
            # TODO: Implementar lógica quando Cliente tiver campo user
            return False

        return False


class ReadOnly(permissions.BasePermission):
    """
    Permite apenas leitura (GET, HEAD, OPTIONS)
    """
    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS
