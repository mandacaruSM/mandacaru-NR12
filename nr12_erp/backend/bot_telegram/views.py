# backend/bot_telegram/views.py
import json
import logging
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from telegram import Update
from .bot import criar_bot
import asyncio

logger = logging.getLogger(__name__)

# Instância global do bot
_bot_application = None


def get_bot_application():
    """Retorna a instância do bot, criando se necessário"""
    global _bot_application
    if _bot_application is None:
        _bot_application = criar_bot()
    return _bot_application


@csrf_exempt
@require_POST
async def webhook(request):
    """
    Endpoint para receber updates do Telegram via webhook
    """
    try:
        # Parse do JSON
        data = json.loads(request.body.decode('utf-8'))

        # Criar objeto Update
        update = Update.de_json(data, get_bot_application().bot)

        # Processar update
        await get_bot_application().process_update(update)

        return JsonResponse({'ok': True})

    except Exception as e:
        logger.error(f"Erro ao processar webhook: {e}", exc_info=True)
        return JsonResponse({'ok': False, 'error': str(e)}, status=500)


@csrf_exempt
def webhook_sync(request):
    """
    Wrapper síncrono para o webhook (compatibilidade Django)
    """
    if request.method != 'POST':
        return HttpResponse('Method not allowed', status=405)

    try:
        # Executar função assíncrona
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(webhook(request))
        loop.close()
        return result

    except Exception as e:
        logger.error(f"Erro no webhook sync: {e}", exc_info=True)
        return JsonResponse({'ok': False, 'error': str(e)}, status=500)


def health_check(request):
    """
    Endpoint de health check para verificar se o bot está funcionando
    """
    try:
        bot = get_bot_application()
        return JsonResponse({
            'ok': True,
            'bot_username': bot.bot.username if hasattr(bot, 'bot') else 'N/A',
            'status': 'running'
        })
    except Exception as e:
        logger.error(f"Erro no health check: {e}")
        return JsonResponse({
            'ok': False,
            'error': str(e)
        }, status=500)
