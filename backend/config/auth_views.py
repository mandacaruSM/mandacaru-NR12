# backend/config/auth_views.py
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.contrib.auth import authenticate
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken

COOKIE_ACCESS = "access"
COOKIE_REFRESH = "refresh"

def _set_auth_cookies(resp: JsonResponse, access: str, refresh: str):
    # Em produção: secure=True e samesite="None" (se front/back forem domínios diferentes)
    cookie_args = {
        "httponly": True,
        "secure": False if settings.DEBUG else True,
        "samesite": "Lax" if settings.DEBUG else "None",
        "path": "/",
    }
    resp.set_cookie(COOKIE_ACCESS, access, **cookie_args, max_age=60*60*1)       # 1h
    resp.set_cookie(COOKIE_REFRESH, refresh, **cookie_args, max_age=60*60*24*7) # 7d

def _clear_auth_cookies(resp: JsonResponse):
    resp.delete_cookie(COOKIE_ACCESS, path="/")
    resp.delete_cookie(COOKIE_REFRESH, path="/")

@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    """
    Espera JSON: {"username": "...", "password": "..."}
    Retorna cookies HttpOnly: access + refresh
    """
    data = request.data or {}
    user = authenticate(username=data.get("username"), password=data.get("password"))
    if not user:
        return JsonResponse({"detail": "Credenciais inválidas."}, status=401)

    refresh = RefreshToken.for_user(user)
    access = str(refresh.access_token)

    resp = JsonResponse({"detail": "ok"})
    _set_auth_cookies(resp, access=access, refresh=str(refresh))
    return resp

@api_view(["POST"])
def logout(request):
    """
    Blacklista o refresh (se existir) e limpa cookies.
    """
    try:
        refresh_cookie = request.COOKIES.get(COOKIE_REFRESH)
        if refresh_cookie:
            RefreshToken(refresh_cookie).blacklist()
    except Exception:
        pass

    resp = JsonResponse({"detail": "ok"})
    _clear_auth_cookies(resp)
    return resp
