# backend/bot_telegram/management/commands/runbot.py
from django.core.management.base import BaseCommand
from bot_telegram.bot import iniciar_bot
import traceback


class Command(BaseCommand):
    help = 'Inicia o bot do Telegram em modo polling'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Iniciando bot do Telegram...'))
        try:
            iniciar_bot()
        except KeyboardInterrupt:
            self.stdout.write(self.style.SUCCESS('\nBot encerrado.'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Erro ao iniciar bot: {e}'))
            self.stdout.write(self.style.ERROR('\nTraceback completo:'))
            traceback.print_exc()
