from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "core"

    def ready(self):
        from . import signals  # noqa
        self._iniciar_scheduler()

    def _iniciar_scheduler(self):
        import os
        import sys
        # Só inicia quando rodando via gunicorn (produção no Fly.io)
        # Evita rodar durante migrate, collectstatic, shell, tests, etc.
        is_gunicorn = any("gunicorn" in arg for arg in sys.argv)
        if not is_gunicorn:
            return
        try:
            from apscheduler.schedulers.background import BackgroundScheduler
            from apscheduler.triggers.cron import CronTrigger

            scheduler = BackgroundScheduler(timezone="America/Bahia")

            scheduler.add_job(
                _limpar_fotos_antigas,
                trigger=CronTrigger(hour=3, minute=0),  # 03:00 horário de Brasília todo dia
                id="limpar_fotos_antigas",
                replace_existing=True,
            )
            scheduler.start()
        except Exception:
            pass  # Não deixa o app falhar por causa do scheduler


def _limpar_fotos_antigas():
    """Remove fotos de checklists com mais de 15 dias."""
    import logging
    logger = logging.getLogger(__name__)
    try:
        from django.utils import timezone
        from datetime import timedelta
        from nr12.models import RespostaItemChecklist

        data_limite = timezone.now() - timedelta(days=15)
        respostas = RespostaItemChecklist.objects.filter(
            foto__isnull=False,
            data_hora_resposta__lt=data_limite,
        ).exclude(foto="")

        total = respostas.count()
        removidas = 0
        for resposta in respostas:
            try:
                resposta.foto.delete(save=False)
                resposta.foto = None
                resposta.save(update_fields=["foto"])
                removidas += 1
            except Exception as e:
                logger.warning(f"Erro ao remover foto #{resposta.id}: {e}")

        logger.info(f"[LimparFotos] {removidas}/{total} fotos antigas removidas.")
    except Exception as e:
        logger.error(f"[LimparFotos] Erro no job de limpeza: {e}")
