# core/middleware.py
from django.utils.deprecation import MiddlewareMixin

class CookieToAuthorizationMiddleware(MiddlewareMixin):
    """
    Se existir cookie 'access', insere 'Authorization: Bearer <access>' no request.
    Assim, o JWTAuthentication padrão do DRF funciona sem expor token no JS.
    """
    def process_request(self, request):
        # Se já vier header Authorization, não sobrescreve
        if "HTTP_AUTHORIZATION" in request.META:
            return
        access = request.COOKIES.get("access")
        if access:
            request.META["HTTP_AUTHORIZATION"] = f"Bearer {access}"
