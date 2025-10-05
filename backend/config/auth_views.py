# backend/config/auth_views.py
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.contrib.auth import authenticate
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

COOKIE_ACCESS = "access"
COOKIE_REFRESH = "refresh"

def _set_auth_cookies(resp: JsonResponse, access: str, refresh: str):
    """
    Define cookies HttpOnly para access e refresh tokens.
    
    Configurações:
    - Development: secure=False, samesite=Lax (permite localhost)
    - Production: secure=True, samesite=None (requer HTTPS)
    """
    is_development = settings.DEBUG
    
    cookie_args = {
        "httponly": True,
        "secure": not is_development,  # True em produção (requer HTTPS)
        "samesite": "Lax" if is_development else "None",
        "path": "/",
    }
    
    # Access token: 2 horas
    resp.set_cookie(
        COOKIE_ACCESS, 
        access, 
        **cookie_args, 
        max_age=60*60*2
    )
    
    # Refresh token: 7 dias
    resp.set_cookie(
        COOKIE_REFRESH, 
        refresh, 
        **cookie_args, 
        max_age=60*60*24*7
    )
    
    print(f"🍪 Cookies definidos (secure={not is_development}, samesite={cookie_args['samesite']})")

def _clear_auth_cookies(resp: JsonResponse):
    """Remove cookies de autenticação"""
    resp.delete_cookie(COOKIE_ACCESS, path="/")
    resp.delete_cookie(COOKIE_REFRESH, path="/")
    print("🗑️  Cookies removidos")

@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    """
    Autentica usuário e retorna tokens via cookies HttpOnly.
    
    Body (JSON):
    {
        "username": "seu_usuario",
        "password": "sua_senha"
    }
    
    Response:
    - 200: Login bem-sucedido (cookies definidos)
    - 401: Credenciais inválidas
    """
    data = request.data or {}
    username = data.get("username")
    password = data.get("password")
    
    if not username or not password:
        return JsonResponse(
            {"detail": "Usuário e senha são obrigatórios."}, 
            status=400
        )
    
    print(f"🔐 Tentativa de login: {username}")
    
    user = authenticate(username=username, password=password)
    
    if not user:
        print(f"❌ Login falhou: credenciais inválidas para {username}")
        return JsonResponse(
            {"detail": "Usuário ou senha incorretos."}, 
            status=401
        )
    
    if not user.is_active:
        print(f"❌ Login falhou: usuário {username} está inativo")
        return JsonResponse(
            {"detail": "Usuário inativo."}, 
            status=403
        )
    
    # Gera tokens JWT
    refresh = RefreshToken.for_user(user)
    access = str(refresh.access_token)
    
    print(f"✅ Login bem-sucedido: {username}")
    
    resp = JsonResponse({
        "detail": "Login realizado com sucesso.",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
        }
    })
    
    _set_auth_cookies(resp, access=access, refresh=str(refresh))
    
    return resp

@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def refresh_token(request):
    """
    Renova o access token usando o refresh token do cookie.
    
    Response:
    - 200: Token renovado (novo access cookie definido)
    - 401: Refresh token ausente ou inválido
    """
    refresh_cookie = request.COOKIES.get(COOKIE_REFRESH)
    
    if not refresh_cookie:
        print("❌ Refresh falhou: cookie refresh não encontrado")
        return JsonResponse(
            {"detail": "Refresh token não encontrado."}, 
            status=401
        )
    
    try:
        refresh = RefreshToken(refresh_cookie)
        access = str(refresh.access_token)
        
        print("🔄 Token renovado com sucesso")
        
        resp = JsonResponse({"detail": "Token renovado com sucesso."})
        
        # Atualiza apenas o access token
        is_development = settings.DEBUG
        cookie_args = {
            "httponly": True,
            "secure": not is_development,
            "samesite": "Lax" if is_development else "None",
            "path": "/",
        }
        
        resp.set_cookie(
            COOKIE_ACCESS, 
            access, 
            **cookie_args, 
            max_age=60*60*2
        )
        
        return resp
        
    except TokenError as e:
        print(f"❌ Refresh falhou: {str(e)}")
        resp = JsonResponse(
            {"detail": "Token inválido ou expirado."}, 
            status=401
        )
        _clear_auth_cookies(resp)
        return resp
    except Exception as e:
        print(f"❌ Erro inesperado no refresh: {str(e)}")
        return JsonResponse(
            {"detail": "Erro ao renovar token."}, 
            status=500
        )

@api_view(["POST"])
def logout(request):
    """
    Faz logout do usuário, blacklistando o refresh token.
    
    Response:
    - 200: Logout bem-sucedido (cookies removidos)
    """
    try:
        refresh_cookie = request.COOKIES.get(COOKIE_REFRESH)
        
        if refresh_cookie:
            try:
                token = RefreshToken(refresh_cookie)
                token.blacklist()
                print(f"🚪 Logout: token blacklistado para {request.user.username if request.user.is_authenticated else 'usuário anônimo'}")
            except TokenError:
                print("⚠️  Logout: token já estava inválido")
        else:
            print("⚠️  Logout: nenhum refresh token encontrado")
            
    except Exception as e:
        print(f"⚠️  Erro ao blacklistar token: {str(e)}")
    
    resp = JsonResponse({"detail": "Logout realizado com sucesso."})
    _clear_auth_cookies(resp)
    
    return resp