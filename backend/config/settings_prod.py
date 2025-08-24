# backend/config/settings_prod.py
from .settings import *  # importa tudo do base (dev)
import os
from datetime import timedelta

# --- Básico de produção ---
DEBUG = False

# Pegue a SECRET_KEY do ambiente (obrigatória em prod)
SECRET_KEY = os.environ["DJANGO_SECRET_KEY"]

# Hosts/Domínios que podem acessar sua API
# Ex.: "api.seu-dominio.com,localhost,127.0.0.1"
ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

# CORS: URLs do frontend que poderão consumir a API
# Ex.: "https://app.seu-dominio.com,https://erp.seu-dominio.com"
CORS_ALLOWED_ORIGINS = os.environ.get(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000"
).split(",")

# CSRF (se usar cookies; com JWT puro nem precisa, mas é seguro manter)
# Django exige esquema (http/https)
CSRF_TRUSTED_ORIGINS = [
    o if o.startswith("http") else f"https://{o}"
    for o in CORS_ALLOWED_ORIGINS
]

# --- Banco (PostgreSQL recomendado em produção) ---
# Defina as variáveis no ambiente: DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT
if all(os.environ.get(k) for k in ["DB_NAME", "DB_USER", "DB_PASSWORD", "DB_HOST"]):
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ["DB_NAME"],
            "USER": os.environ["DB_USER"],
            "PASSWORD": os.environ["DB_PASSWORD"],
            "HOST": os.environ["DB_HOST"],
            "PORT": os.environ.get("DB_PORT", "5432"),
        }
    }
# Se não definir, cai no SQLite do settings base. (Não recomendado para produção)

# --- JWT (2h access, 30d refresh) ---
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=2),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=30),
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# --- Static files ---
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Whitenoise (opcional mas prático se servir estáticos pelo próprio Django)
# pip install whitenoise
MIDDLEWARE.insert(1, "whitenoise.middleware.WhiteNoiseMiddleware")
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# --- Segurança atrás de proxy/NGINX (se estiver atrás de um proxy que termina TLS) ---
# SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
# SESSION_COOKIE_SECURE = True
# CSRF_COOKIE_SECURE = True

# --- Logging simples para produção ---
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
}
