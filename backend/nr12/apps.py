# backend/nr12/apps.py

from django.apps import AppConfig


class Nr12Config(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'nr12'
    verbose_name = 'NR12 - Checklists'

    def ready(self):
        import nr12.signals