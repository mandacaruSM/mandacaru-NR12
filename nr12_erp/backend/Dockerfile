# backend/Dockerfile
FROM python:3.11-slim

# Evita arquivos .pyc e garante saída de log em tempo real
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Dependências do sistema (psycopg2 precisa de libpq)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Instala dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o código
COPY . .

# Porta padrão do Fly.io
EXPOSE 8000

# Start: collectstatic + migrate + gunicorn (secrets disponíveis em runtime)
CMD ["sh", "-c", "python manage.py collectstatic --noinput --settings=config.settings_prod && python manage.py migrate --settings=config.settings_prod && gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 120"]
