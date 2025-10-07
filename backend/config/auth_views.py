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
from django.contrib.auth import authenticate
from django.conf import settings

# Nomes dos cookies
COOKIE_ACCESS = "access"
COOKIE_REFRESH = "refresh"


def _set_auth_cookies(resp: JsonResponse, access: str, refresh: str):
    """
    Define os cookies de autenticação na resposta
    """
    # Em produção: secure=True e samesite="None" (se front/back forem domínios diferentes)
    cookie_args = {
        "httponly": True,
        "secure": False if settings.DEBUG else True,
        "samesite": "Lax" if settings.DEBUG else "None",
        "path": "/",
    }
    resp.set_cookie(COOKIE_ACCESS, access, **cookie_args, max_age=60*60*2)       # 2h
    resp.set_cookie(COOKIE_REFRESH, refresh, **cookie_args, max_age=60*60*24*7) # 7d


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
    Endpoint de login com cookies
    POST /api/v1/auth/login/
    Body: {"username": "...", "password": "..."}
    """
    data = request.data or {}
    username = data.get("username")
    password = data.get("password")
    
    if not username or not password:
        return JsonResponse(
            {"detail": "Username e password são obrigatórios."}, 
            status=400
        )
    
    # Autentica o usuário
    user = authenticate(request, username=username, password=password)
    
    if not user:
        return JsonResponse(
            {"detail": "Credenciais inválidas."}, 
            status=401
        )
    
    # Gera os tokens
    refresh = RefreshToken.for_user(user)
    access = str(refresh.access_token)
    
    # Cria resposta com dados do usuário
    resp = JsonResponse({
        "detail": "Login realizado com sucesso",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
        }
    })
    
    # Define os cookies
    _set_auth_cookies(resp, access, str(refresh))
    
    return resp


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def refresh_token(request):
    """
    Renova o access token usando o refresh token do cookie
    POST /api/v1/auth/refresh/
    """
    refresh_cookie = request.COOKIES.get(COOKIE_REFRESH)
    
    if not refresh_cookie:
        return JsonResponse(
            {"detail": "Refresh token não encontrado."}, 
            status=401
        )
    
    try:
        # Valida e gera novo access token
        refresh = RefreshToken(refresh_cookie)
        access = str(refresh.access_token)
        
        resp = JsonResponse({"detail": "Token renovado com sucesso"})
        
        # Atualiza apenas o access token
        cookie_args = {
            "httponly": True,
            "secure": not settings.DEBUG,
            "samesite": "Lax" if settings.DEBUG else "None",
            "path": "/",
        }
        resp.set_cookie(COOKIE_ACCESS, access, **cookie_args, max_age=60*60*2)
        
        return resp
        
    except Exception as e:
        return JsonResponse(
            {"detail": f"Token inválido ou expirado: {str(e)}"}, 
            status=401
        )


@csrf_exempt
@api_view(["POST"])
def logout(request):
    """
    Endpoint de logout
    POST /api/v1/auth/logout/
    Remove os cookies de autenticação
    """
    refresh_cookie = request.COOKIES.get(COOKIE_REFRESH)
    
    # Tenta invalidar o refresh token no backend
    if refresh_cookie:
        try:
            token = RefreshToken(refresh_cookie)
            token.blacklist()  # Requer django-rest-framework-simplejwt[blacklist]
        except Exception:
            pass  # Ignora erros ao invalidar
    
    resp = JsonResponse({"detail": "Logout realizado com sucesso"})
    _clear_auth_cookies(resp)
    
    return resp