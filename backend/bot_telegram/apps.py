# backend/bot_telegram/apps.py
from django.apps import AppConfig


class BotTelegramConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'bot_telegram'
    verbose_name = 'Bot do Telegram'
