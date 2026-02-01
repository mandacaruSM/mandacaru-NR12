from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .auth_views import login as cookie_login, logout as cookie_logout, refresh_token, reset_password, change_password, me

urlpatterns = [
    # Redirect root to health check
    path("", RedirectView.as_view(url="/api/v1/health/", permanent=False)),

    # Django Admin
    path("admin/", admin.site.urls),

    # ============================================
    # API v1 - REST Endpoints
    # ============================================

    # Core: health, me, operadores, supervisores, bot
    path("api/v1/", include("core.urls")),

    # Cadastro: clientes, empreendimentos
    path("api/v1/cadastro/", include("cadastro.urls")),

    # Equipamentos: tipos, equipamentos, planos, medições
    path("api/v1/equipamentos/", include("equipamentos.urls")),

    # NR12: modelos, itens, checklists, respostas
    path("api/v1/nr12/", include("nr12.urls")),

    # ============================================
    # Authentication Endpoints
    # ============================================

    # JWT Token Authentication (Classic)
    path("api/v1/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/v1/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # Cookie-based Authentication (HttpOnly)
    # path("api/v1/auth/register/", register, name="auth_register"),  # DESABILITADO POR SEGURANÇA
    path("api/v1/auth/login/", cookie_login, name="auth_cookie_login"),
    path("api/v1/auth/logout/", cookie_logout, name="auth_cookie_logout"),
    path("api/v1/auth/refresh/", refresh_token, name="auth_cookie_refresh"),
    path("api/v1/auth/change-password/", change_password, name="auth_change_password"),
    path("api/v1/auth/reset-password/", reset_password, name="auth_reset_password"),
    path("api/v1/me/", me, name="auth_me"),

    # Outros módulos
    path('api/v1/', include('tecnicos.urls')),
    path('api/v1/', include('manutencao.urls')),
    path('api/v1/', include('abastecimentos.urls')),
    path('api/v1/almoxarifado/', include('almoxarifado.urls')),
    path('api/v1/', include('orcamentos.urls')),
    path('api/v1/compras/', include('compras.urls')),
    path('api/v1/', include('ordens_servico.urls')),
    path('api/v1/financeiro/', include('financeiro.urls')),
    path('api/v1/relatorios/', include('relatorios.urls')),

    # Bot do Telegram
    path('bot/', include('bot_telegram.urls')),
]

# Serve media files (both development and production)
# Em produção, WhiteNoise serve static files, mas media files precisam ser servidos pelo Django
# Para produção com alto tráfego, considere usar um CDN ou storage externo (S3, Cloudinary)
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Serve static files only in development (WhiteNoise handles production)
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)