from django.apps import AppConfig


class AbastecimentosConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'abastecimentos'

    def ready(self):
        import abastecimentos.signals
