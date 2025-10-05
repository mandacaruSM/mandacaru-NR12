# backend/config/urls.py
from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .auth_views import login as cookie_login, logout as cookie_logout, refresh_token

urlpatterns = [
    path("", RedirectView.as_view(url="/api/v1/health/", permanent=False)),
    path("admin/", admin.site.urls),

    # APIs dos módulos
    path("api/v1/", include("core.urls")),
    path("api/v1/", include("cadastro.urls")),
    path("api/v1/", include("equipamentos.urls")),

    # JWT "clássico" (opcional, para testes/integrações diretas)
    path("api/v1/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/v1/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # ✅ Autenticação por COOKIE HttpOnly (recomendado para frontend)
    path("api/v1/auth/login/", cookie_login, name="auth_cookie_login"),
    path("api/v1/auth/logout/", cookie_logout, name="auth_cookie_logout"),
    path("api/v1/auth/refresh/", refresh_token, name="auth_cookie_refresh"),  # ✅ NOVO
]