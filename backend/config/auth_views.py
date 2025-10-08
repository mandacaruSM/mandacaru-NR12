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
from django.conf import settings

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