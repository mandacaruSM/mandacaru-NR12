# backend/config/auth_views.py
"""
Views de autenticação com cookies HTTP-only
Implementa login, logout e refresh de tokens
"""
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.conf import settings
from django.db import IntegrityError

# Nomes dos cookies
COOKIE_ACCESS = "access"
COOKIE_REFRESH = "refresh"


def _set_auth_cookies(resp: JsonResponse, access: str, refresh: str):
    """
    Define os cookies de autenticação na resposta
    """
    # Configuração dos cookies baseada no ambiente
    is_dev = settings.DEBUG
    
    cookie_args = {
        "httponly": True,  # Protege contra XSS
        "secure": not is_dev,  # HTTPS obrigatório em produção
        "samesite": "Lax" if is_dev else "None",  # Cross-site em prod
        "path": "/",
    }
    
    # Access token - 2 horas
    resp.set_cookie(COOKIE_ACCESS, access, **cookie_args, max_age=60*60*2)
    # Refresh token - 7 dias
    resp.set_cookie(COOKIE_REFRESH, refresh, **cookie_args, max_age=60*60*24*7)


def _clear_auth_cookies(resp: JsonResponse):
    """
    Remove os cookies de autenticação
    """
    resp.delete_cookie(COOKIE_ACCESS, path="/")
    resp.delete_cookie(COOKIE_REFRESH, path="/")


# FUNÇÃO DESABILITADA POR SEGURANÇA
# Registro público removido - usuários devem ser criados apenas via signals
# quando um Cliente ou Supervisor é cadastrado no sistema.
#
# @csrf_exempt
# @api_view(["POST"])
# @permission_classes([AllowAny])
# def register(request):
#     """
#     DESABILITADO: Registra um novo usuário
#
#     Esta função foi desabilitada por segurança.
#     Usuários são criados automaticamente quando:
#     - Um Cliente é cadastrado (via signal em core/signals.py)
#     - Um Supervisor é cadastrado (via signal em core/signals.py)
#     """
#     return JsonResponse(
#         {"detail": "Registro público desabilitado. Contate um administrador."},
#         status=403
#     )


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    """
    Autentica usuário e retorna tokens em cookies HTTP-only
    
    Espera JSON:
    {
        "username": "usuario",
        "password": "senha"
    }
    
    Retorna:
    - 200: Login bem-sucedido (cookies definidos)
    - 401: Credenciais inválidas
    """
    data = request.data or {}
    username = data.get("username")
    password = data.get("password")
    
    if not username or not password:
        return JsonResponse(
            {"detail": "Username e password são obrigatórios."},
            status=400
        )
    
    user = authenticate(username=username, password=password)
    if not user:
        return JsonResponse(
            {"detail": "Credenciais inválidas."},
            status=401
        )
    
    # Gerar tokens JWT
    refresh = RefreshToken.for_user(user)
    access = str(refresh.access_token)
    
    # Criar resposta e definir cookies
    resp = JsonResponse({
        "detail": "Login realizado com sucesso.",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email or "",
        }
    })
    _set_auth_cookies(resp, access=access, refresh=str(refresh))
    
    return resp


@api_view(["POST"])
def logout(request):
    """
    Faz logout do usuário
    
    - Tenta blacklistar o refresh token (se existir)
    - Remove os cookies de autenticação
    
    Retorna:
    - 200: Logout bem-sucedido
    """
    try:
        refresh_cookie = request.COOKIES.get(COOKIE_REFRESH)
        if refresh_cookie:
            token = RefreshToken(refresh_cookie)
            token.blacklist()
    except Exception as e:
        # Se falhar ao blacklistar, continua mesmo assim
        pass
    
    resp = JsonResponse({"detail": "Logout realizado com sucesso."})
    _clear_auth_cookies(resp)
    
    return resp


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def refresh_token(request):
    """
    Renova o access token usando o refresh token do cookie
    
    Retorna:
    - 200: Novo access token (cookie atualizado)
    - 401: Refresh token inválido ou expirado
    """
    refresh_cookie = request.COOKIES.get(COOKIE_REFRESH)
    
    if not refresh_cookie:
        return JsonResponse(
            {"detail": "Refresh token não encontrado."},
            status=401
        )
    
    try:
        # Validar e renovar o refresh token
        refresh = RefreshToken(refresh_cookie)
        
        # Gerar novo access token
        new_access = str(refresh.access_token)
        
        # Se ROTATE_REFRESH_TOKENS estiver ativo, gera novo refresh também
        if settings.SIMPLE_JWT.get("ROTATE_REFRESH_TOKENS", False):
            refresh.set_jti()
            refresh.set_exp()
            new_refresh = str(refresh)
        else:
            new_refresh = refresh_cookie
        
        # Criar resposta e atualizar cookies
        resp = JsonResponse({"detail": "Token renovado com sucesso."})
        _set_auth_cookies(resp, access=new_access, refresh=new_refresh)
        
        return resp
        
    except TokenError as e:
        return JsonResponse(
            {"detail": f"Token inválido ou expirado: {str(e)}"},
            status=401
        )
    except Exception as e:
        return JsonResponse(
            {"detail": f"Erro ao renovar token: {str(e)}"},
            status=500
        )


@api_view(["POST"])
def change_password(request):
    """
    Altera a senha do usuário autenticado (requer senha atual)

    Espera JSON:
    {
        "current_password": "senhaAtual123",
        "new_password": "novaSenha456"
    }

    Retorna:
    - 200: Senha alterada com sucesso
    - 400: Senha atual incorreta ou nova senha inválida
    - 401: Não autenticado
    """
    if not request.user.is_authenticated:
        return JsonResponse(
            {"detail": "Não autenticado"},
            status=401
        )

    data = request.data or {}
    current_password = data.get("current_password", "")
    new_password = data.get("new_password", "")

    # Validações
    if not current_password:
        return JsonResponse(
            {"detail": "Senha atual é obrigatória"},
            status=400
        )

    if not new_password or len(new_password) < 6:
        return JsonResponse(
            {"detail": "Nova senha deve ter pelo menos 6 caracteres"},
            status=400
        )

    # Verifica se a senha atual está correta
    user = request.user
    if not user.check_password(current_password):
        return JsonResponse(
            {"detail": "Senha atual incorreta"},
            status=400
        )

    # Verifica se a nova senha é diferente da atual
    if user.check_password(new_password):
        return JsonResponse(
            {"detail": "Nova senha deve ser diferente da senha atual"},
            status=400
        )

    # Altera a senha
    user.set_password(new_password)
    user.save()

    return JsonResponse({
        "detail": "Senha alterada com sucesso",
        "username": user.username
    })


@api_view(["POST"])
@permission_classes([AllowAny])
def reset_password(request):
    """
    Redefine a senha de um usuário baseado no CPF/documento

    Espera JSON:
    {
        "documento": "12345678900",  // CPF ou CNPJ sem pontuação
        "new_password": "novaSenha123"
    }

    Retorna:
    - 200: Senha redefinida com sucesso
    - 404: Usuário não encontrado
    - 400: Dados inválidos
    """
    data = request.data or {}
    documento = data.get("documento", "").strip()
    new_password = data.get("new_password", "")

    if not documento:
        return JsonResponse(
            {"detail": "Documento (CPF/CNPJ) é obrigatório"},
            status=400
        )

    if not new_password or len(new_password) < 6:
        return JsonResponse(
            {"detail": "Nova senha deve ter pelo menos 6 caracteres"},
            status=400
        )

    # Remove pontuação do documento
    documento_limpo = ''.join(filter(str.isdigit, documento))

    try:
        # Busca usuário pelo username (que é o CPF/CNPJ)
        user = User.objects.get(username=documento_limpo)
        user.set_password(new_password)
        user.save()

        return JsonResponse({
            "detail": "Senha redefinida com sucesso",
            "username": user.username
        })

    except User.DoesNotExist:
        return JsonResponse(
            {"detail": "Usuário não encontrado com este documento"},
            status=404
        )
    except Exception as e:
        return JsonResponse(
            {"detail": f"Erro ao redefinir senha: {str(e)}"},
            status=500
        )


@api_view(["GET"])
def me(request):
    """
    Retorna informações do usuário autenticado

    Retorna:
    - 200: Dados do usuário com role e módulos habilitados
    - 401: Não autenticado
    """
    if not request.user.is_authenticated:
        return JsonResponse(
            {"detail": "Não autenticado"},
            status=401
        )

    user = request.user
    profile_data = {}

    if hasattr(user, 'profile'):
        profile = user.profile
        profile_data = {
            "role": profile.role,
            "modules_enabled": profile.modules_enabled or []
        }

    # Busca dados adicionais se for supervisor
    supervisor_data = None
    if hasattr(user, 'supervisor_profile'):
        supervisor = user.supervisor_profile
        supervisor_data = {
            "id": supervisor.id,
            "nome_completo": supervisor.nome_completo,
            "cpf": supervisor.cpf,
            "email": supervisor.email,
            "telefone": supervisor.telefone
        }

    # Busca dados adicionais se for cliente
    cliente_data = None
    if hasattr(user, 'cliente_profile'):
        cliente = user.cliente_profile
        cliente_data = {
            "id": cliente.id,
            "nome_razao": cliente.nome_razao,
            "tipo_pessoa": cliente.tipo_pessoa,
            "documento": cliente.documento,
            "email_financeiro": cliente.email_financeiro,
            "telefone": cliente.telefone
        }

    return JsonResponse({
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        **profile_data,
        "supervisor": supervisor_data,
        "cliente": cliente_data
    })