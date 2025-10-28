# backend/config/settings.py
import os
from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

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
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
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
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# URLs/Wsgi
ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

# Banco (SQLite em dev)
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# URL base pública do ERP (ajuste para seu domínio)
ERP_PUBLIC_BASE_URL = os.getenv("ERP_PUBLIC_BASE_URL", "https://erp.mandacaru.com.br")
# Usuário do bot para deep link (opcional)
TELEGRAM_BOT_USERNAME = os.getenv("TELEGRAM_BOT_USERNAME", "mandacaru_bot")


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