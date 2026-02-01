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


# Railway usa SECRET_KEY, mas mantém fallback para DJANGO_SECRET_KEY (compatibilidade)
SECRET_KEY = os.environ.get("SECRET_KEY", os.environ.get("DJANGO_SECRET_KEY", "CHANGE_ME"))
DEBUG = os.environ.get("DEBUG", os.environ.get("DJANGO_DEBUG", "False")) == "True"

ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "127.0.0.1,localhost,0.0.0.0").split(",")

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
    "simple_history",  # Auditoria de alterações

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
    'compras.apps.ComprasConfig',
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
    "simple_history.middleware.HistoryRequestMiddleware",  # Auditoria
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

_raw = os.environ.get("CORS_ALLOWED_ORIGINS", "")
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

# Banco de dados - PostgreSQL (Railway/Supabase) ou SQLite (dev)
import dj_database_url

DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL:
    # ✅ Produção: Supabase Pooler (Transaction Mode)
    # - conn_max_age=0: obrigatório para pooler em Transaction Mode
    # - conn_health_checks=False: evita queries extras que quebram com pooler
    # - SSL já vem na URL (?sslmode=require), não duplicar
    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=0,
            conn_health_checks=False,
        )
    }
else:
    # Desenvolvimento local: SQLite
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

# ============================================================================
# SEGURANÇA ADICIONAL PARA PRODUÇÃO
# ============================================================================

# Configurações de Segurança de Senhas
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 8,  # Mínimo 8 caracteres
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Configurações de Segurança HTTP (apenas em produção)
if not DEBUG:
    # Força HTTPS
    SECURE_HSTS_SECONDS = 31536000  # 1 ano
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

    # Content Security
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_BROWSER_XSS_FILTER = True
    X_FRAME_OPTIONS = 'DENY'

    # Referrer Policy
    SECURE_REFERRER_POLICY = 'same-origin'

# Configurações do django-simple-history
SIMPLE_HISTORY_HISTORY_CHANGE_REASON_USE_TEXT_FIELD = True  # Campo de texto para motivo
SIMPLE_HISTORY_FILEFIELD_TO_CHARFIELD = True  # Converte FileField para CharField no histórico

# Logging para auditoria e debug
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        },
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'simple'
        },
        # ⚠️ Railway tem filesystem efêmero - usa console em produção (DEBUG=False)
        'file': {
            'level': 'WARNING',
            'class': 'logging.StreamHandler',  # Console em produção
            'formatter': 'verbose',
        } if not DEBUG else {
            'level': 'WARNING',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'django.log',
            'maxBytes': 1024 * 1024 * 5,  # 5 MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'security_file': {
            'level': 'WARNING',
            'class': 'logging.StreamHandler',  # Console em produção
            'formatter': 'verbose',
        } if not DEBUG else {
            'level': 'WARNING',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'security.log',
            'maxBytes': 1024 * 1024 * 5,  # 5 MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.security': {
            'handlers': ['security_file'],
            'level': 'WARNING',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['file'],
            'level': 'ERROR',
            'propagate': False,
        },
    },
}