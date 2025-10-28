from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .auth_views import login as cookie_login, logout as cookie_logout, refresh_token

urlpatterns = [
    path("", RedirectView.as_view(url="/api/v1/health/", permanent=False)),
    path("admin/", admin.site.urls),

    # APIs (prefixos organizados)
    path("api/v1/", include("core.urls")),
    path("api/v1/cadastro/", include("cadastro.urls")),
    path("api/v1/equipamentos/", include("equipamentos.urls")),
    path("api/v1/nr12/", include("nr12.urls")),

    # JWT “clássico”
    path("api/v1/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/v1/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # Login/Logout por COOKIE HttpOnly
    path("api/v1/auth/login/", cookie_login, name="auth_cookie_login"),
    path("api/v1/auth/logout/", cookie_logout, name="auth_cookie_logout"),
    path("api/v1/auth/refresh/", refresh_token, name="auth_cookie_refresh"),
]