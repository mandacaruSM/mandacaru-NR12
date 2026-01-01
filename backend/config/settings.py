# backend/config/settings.py
import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv, find_dotenv  # ✅ adicione find_dotenv aqui

BASE_DIR = Path(__file__).resolve().parent.parent

# 1) raiz do repo: D:\mandacaru_nr12\nr12_erp\.env
load_dotenv(dotenv_path=BASE_DIR.parent / ".env", override=False, encoding="utf-8")
# 2) opcional: backend/.env (se um dia você mover)
load_dotenv(dotenv_path=BASE_DIR / ".env", override=False, encoding="utf-8")
# 3) fallback: encontrar automaticamente subindo diretórios
load_dotenv(find_dotenv(), override=False, encoding="utf-8")


SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "CHANGE_ME")
DEBUG = os.environ.get("DJANGO_DEBUG", "False") == "True"

ALLOWED_HOSTS = os.environ.get(
    "DJANGO_ALLOWED_HOSTS",
    "127.0.0.1,localhost,0.0.0.0"
).split(",")

INSTALLED_APPS = [
    # Django
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Terceiros
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",

    # Apps do projeto
    "core",
    "cadastro.apps.CadastroConfig",
    "equipamentos.apps.EquipamentosConfig",
    "nr12.apps.Nr12Config",
    'manutencao.apps.ManutencaoConfig',
    'tecnicos',
    'abastecimentos.apps.AbastecimentosConfig',
    'almoxarifado.apps.AlmoxarifadoConfig',
    'orcamentos.apps.OrcamentosConfig',
    'ordens_servico.apps.OrdensServicoConfig',
    'financeiro',
    'relatorios',
    'bot_telegram.apps.BotTelegramConfig',
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",  # Para servir arquivos estáticos
    "corsheaders.middleware.CorsMiddleware",   # alto na pilha
    "django.contrib.sessions.middleware.SessionMiddleware",
    "core.middleware.CookieToAuthorizationMiddleware",  # promove cookie -> Authorization
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=2),  # ← AUMENTADO de 30min para 2h
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
}

# --- CORS / CSRF (dev) ---
# Origens padrão em dev (se a env estiver vazia)
_DEV_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]

_raw = os.environ.get("DJANGO_CORS_ORIGINS", "")
# filtra strings vazias e exige scheme (http:// ou https://)
CORS_ALLOWED_ORIGINS = [
    o.strip() for o in _raw.split(",")
    if o.strip().startswith(("http://", "https://"))
]
if not CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS = _DEV_ORIGINS

# Se for usar cookies HttpOnly entre front/back
CORS_ALLOW_CREDENTIALS = True

# CSRF: espelhe as origens do frontend (com scheme)
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS.copy()

LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Bahia"
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# URLs/Wsgi
ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

# Banco de dados - usar PostgreSQL no Render, SQLite em dev
import dj_database_url

if os.environ.get("DATABASE_URL"):
    # Produção: usar PostgreSQL do Render
    DATABASES = {
        "default": dj_database_url.config(
            default=os.environ.get("DATABASE_URL"),
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
else:
    # Desenvolvimento: SQLite
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# URL base pública do ERP (ajuste para seu domínio)
ERP_PUBLIC_BASE_URL = os.getenv("ERP_PUBLIC_BASE_URL", "https://erp.mandacaru.com.br")

# Configurações do Telegram Bot
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_BOT_USERNAME = os.getenv("TELEGRAM_BOT_USERNAME", "mandacaru_bot")
TELEGRAM_WEBHOOK_URL = os.getenv("TELEGRAM_WEBHOOK_URL", "")

# Configurações de segurança para cookies em produção
if not DEBUG:
    SESSION_COOKIE_SECURE = True  # Envia cookies apenas via HTTPS
    CSRF_COOKIE_SECURE = True     # Envia CSRF token apenas via HTTPS
    SECURE_SSL_REDIRECT = False   # Render já faz redirect HTTPS
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

    # ✅ CRITICAL: Configurações para cookies cross-domain (frontend e backend em domínios diferentes)
    SESSION_COOKIE_SAMESITE = 'None'  # Permite cookies cross-domain via HTTPS
    CSRF_COOKIE_SAMESITE = 'None'     # Permite CSRF cross-domain via HTTPS

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# Templates (admin requer este backend)
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]