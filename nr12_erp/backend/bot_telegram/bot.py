# backend/bot_telegram/bot.py - compatível com python-telegram-bot>=22.0 (Python 3.13+)
import logging
from django.conf import settings
from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    ConversationHandler,
    CallbackQueryHandler,
    filters,
    ContextTypes,
)

from . import handlers

logger = logging.getLogger(__name__)

# Estados da conversa
AGUARDANDO_CODIGO, AGUARDANDO_CONFIRMACAO_CPF, AGUARDANDO_QR_CODE, AGUARDANDO_CHECKLIST = range(4)
AGUARDANDO_ABAST_LEITURA, AGUARDANDO_ABAST_LITROS, AGUARDANDO_ABAST_VALOR, AGUARDANDO_ABAST_TIPO = range(4, 8)
AGUARDANDO_MANUT_TIPO, AGUARDANDO_MANUT_HORIMETRO, AGUARDANDO_MANUT_DESCRICAO, AGUARDANDO_MANUT_OBSERVACOES, AGUARDANDO_MANUT_PROXIMA = range(8, 13)


def criar_bot():
    """Cria e configura Application para PTB 22.x"""
    print("[DEBUG] Iniciando criar_bot()")
    token = getattr(settings, "TELEGRAM_BOT_TOKEN", None)
    if not token:
        raise ValueError(
            "TELEGRAM_BOT_TOKEN não configurado. "
            "Adicione TELEGRAM_BOT_TOKEN no settings.py ou .env"
        )

    print("[DEBUG] Token obtido, criando Application...")
    # Application (API 20.x)
    application = Application.builder().token(token).build()
    print("[DEBUG] Application criado com sucesso")

    # --- Handlers de comandos simples ---
    application.add_handler(CommandHandler("start", handlers.start))
    application.add_handler(CommandHandler("desvincular", handlers.desvincular))
    application.add_handler(CommandHandler("equipamentos", handlers.equipamentos))
    application.add_handler(CommandHandler("historico", handlers.historico))
    application.add_handler(CommandHandler("ajuda", handlers.ajuda))

    # --- ConversationHandler: vinculação ---
    conv_vincular = ConversationHandler(
        entry_points=[CommandHandler("vincular", handlers.vincular_inicio)],
        states={
            AGUARDANDO_CODIGO: [
                MessageHandler(
                    filters.TEXT & ~filters.COMMAND,
                    handlers.vincular_codigo
                )
            ],
            AGUARDANDO_CONFIRMACAO_CPF: [
                MessageHandler(
                    filters.TEXT & ~filters.COMMAND,
                    handlers.confirmar_cpf
                )
            ],
        },
        fallbacks=[CommandHandler("cancelar", handlers.cancelar)],
    )
    application.add_handler(conv_vincular)

    # --- ConversationHandler: checklist ---
    conv_checklist = ConversationHandler(
        entry_points=[
            CommandHandler("checklist", handlers.checklist_inicio),
            CallbackQueryHandler(handlers.callback_checklist_equipamento, pattern=r'^checklist_equipamento_\d+$')
        ],
        states={
            AGUARDANDO_QR_CODE: [
                MessageHandler(
                    filters.TEXT & ~filters.COMMAND,
                    handlers.checklist_equipamento
                )
            ],
            AGUARDANDO_CHECKLIST: [
                MessageHandler(
                    filters.TEXT & ~filters.COMMAND,
                    handlers.processar_resposta_checklist
                )
            ],
        },
        fallbacks=[CommandHandler("cancelar", handlers.cancelar)],
        allow_reentry=True,
        per_chat=True,
        per_user=True,  # Track per user to maintain context across messages
        per_message=False,
    )
    application.add_handler(conv_checklist)

    # --- ConversationHandler: abastecimento ---
    conv_abastecimento = ConversationHandler(
        entry_points=[
            CommandHandler("abastecimento", handlers.abastecimento_inicio),
            CallbackQueryHandler(handlers.callback_abastecimento_equipamento, pattern=r'^abastecimento_equipamento_\d+$')
        ],
        states={
            AGUARDANDO_ABAST_LEITURA: [
                MessageHandler(
                    filters.TEXT & ~filters.COMMAND,
                    handlers.abastecimento_leitura
                )
            ],
            AGUARDANDO_ABAST_LITROS: [
                MessageHandler(
                    filters.TEXT & ~filters.COMMAND,
                    handlers.abastecimento_litros
                )
            ],
            AGUARDANDO_ABAST_VALOR: [
                MessageHandler(
                    filters.TEXT & ~filters.COMMAND,
                    handlers.abastecimento_valor
                )
            ],
            AGUARDANDO_ABAST_TIPO: [
                MessageHandler(
                    filters.TEXT & ~filters.COMMAND,
                    handlers.abastecimento_tipo
                )
            ],
        },
        fallbacks=[CommandHandler("cancelar", handlers.cancelar)],
        allow_reentry=True,
        per_chat=True,
        per_user=True,  # Track per user to maintain context across messages
        per_message=False,
    )
    application.add_handler(conv_abastecimento)

    # --- ConversationHandler: manutenção ---
    # Entry point é o callback handler para 'manut_tipo_' que é disparado via inline buttons
    conv_manutencao = ConversationHandler(
        entry_points=[
            CallbackQueryHandler(handlers.callback_query_handler, pattern=r'^manut_tipo_(preventiva|corretiva)$')
        ],
        states={
            AGUARDANDO_MANUT_HORIMETRO: [
                MessageHandler(
                    filters.TEXT & ~filters.COMMAND,
                    handlers.manutencao_horimetro
                )
            ],
            AGUARDANDO_MANUT_DESCRICAO: [
                MessageHandler(
                    filters.TEXT & ~filters.COMMAND,
                    handlers.manutencao_descricao
                )
            ],
            AGUARDANDO_MANUT_OBSERVACOES: [
                MessageHandler(
                    filters.TEXT & ~filters.COMMAND,
                    handlers.manutencao_observacoes
                )
            ],
        },
        fallbacks=[CommandHandler("cancelar", handlers.cancelar)],
        allow_reentry=True,
        per_chat=True,
        per_user=True,  # Track per user to maintain context across messages
        per_message=False,
    )
    application.add_handler(conv_manutencao)

    # --- Handler para processar QR codes (eq: ou emp:) ---
    application.add_handler(
        MessageHandler(
            filters.Regex(r'^(eq:|emp:)'),
            handlers.processar_qr_code
        )
    )

    # --- Handler de callback queries (botões inline) ---
    application.add_handler(CallbackQueryHandler(handlers.callback_query_handler))

    # --- Handler de erros ---
    application.add_error_handler(handlers.erro_handler)

    logger.info("Bot Telegram configurado com sucesso (PTB 22.x)!")
    return application


def iniciar_bot():
    """Inicia o bot em modo polling (PTB 22.x)"""
    print("[DEBUG] Chamando criar_bot()...")
    application = criar_bot()
    print("[DEBUG] Bot criado, iniciando polling...")
    logger.info("==================================================")
    logger.info("BOT TELEGRAM INICIANDO...")
    logger.info("==================================================")
    print("\n" + "="*60)
    print("[OK] BOT ATIVO E AGUARDANDO MENSAGENS!")
    print("="*60)
    print(f"Bot: @mandacarusmbot")
    print("\nComandos disponíveis:")
    print("  /start      - Iniciar conversa")
    print("  /vincular   - Vincular sua conta")
    print("  /equipamentos - Listar equipamentos")
    print("  /checklist  - Realizar checklist")
    print("  /historico  - Ver histórico")
    print("  /ajuda      - Ajuda")
    print("\n[DEBUG] MODO DEBUG ATIVADO - Logs detalhados no console")
    print("\nPressione Ctrl+C para parar o bot")
    print("="*60 + "\n")
    logger.info("Polling iniciado, aguardando mensagens...")
    application.run_polling(allowed_updates=Update.ALL_TYPES)
    print("\n[INFO] Bot encerrado pelo usuário")
    logger.info("Bot encerrado pelo usuário")


async def configurar_webhook(webhook_url: str):
    """
    Configura webhook no PTB 22.x (assíncrono).
    Retorna o application (caso precise usar depois).
    """
    application = criar_bot()
    await application.initialize()
    await application.bot.delete_webhook()
    await application.bot.set_webhook(url=webhook_url, allowed_updates=["message", "callback_query"])
    logger.info(f"Webhook configurado: {webhook_url}")
    return application


async def remover_webhook():
    """Remove webhook (PTB 22.x)."""
    application = criar_bot()
    await application.initialize()
    await application.bot.delete_webhook()
    logger.info("Webhook removido")
