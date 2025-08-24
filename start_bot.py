import os, re, requests
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters, ConversationHandler, ContextTypes

BOT_TOKEN = os.getenv("BOT_TOKEN")
BASE = os.getenv("BACKEND_BASE_URL","http://localhost:8000/api/v1")
ASK_NAME, ASK_DOB = range(2)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Olá! Vamos confirmar seu cadastro.\nDigite seu NOME COMPLETO:")
    return ASK_NAME

async def ask_dob(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["nome"] = update.message.text.strip()
    await update.message.reply_text("Informe sua DATA DE NASCIMENTO (DD/MM/AAAA):")
    return ASK_DOB

async def finish(update: Update, context: ContextTypes.DEFAULT_TYPE):
    dob = update.message.text.strip()
    if not re.match(r"^\d{2}/\d{2}/\d{4}$", dob):
        await update.message.reply_text("Formato inválido. Use DD/MM/AAAA.")
        return ASK_DOB
    payload = {
        "nome_completo": context.user_data["nome"],
        "data_nascimento": dob,
        "chat_id": str(update.effective_chat.id),
    }
    r = requests.post(f"{BASE}/bot/onboarding/", json=payload, timeout=10)
    if r.ok:
        role = r.json().get("role","")
        await update.message.reply_text(f"Ok! Você foi vinculado como {role}.")
    else:
        await update.message.reply_text("Não localizei seu cadastro. Fale com o administrador.")
    return ConversationHandler.END

def main():
    app = ApplicationBuilder().token(BOT_TOKEN).build()
    conv = ConversationHandler(
        entry_points=[CommandHandler("start", start)],
        states={ ASK_NAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, ask_dob)],
                 ASK_DOB: [MessageHandler(filters.TEXT & ~filters.COMMAND, finish)] },
        fallbacks=[CommandHandler("start", start)],
    )
    app.add_handler(conv)
    app.run_polling()

if __name__ == "__main__":
    main()
