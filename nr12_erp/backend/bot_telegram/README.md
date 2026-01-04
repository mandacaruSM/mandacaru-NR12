# Bot do Telegram - NR12 ERP

Sistema de bot do Telegram para realizar checklists NR12 de forma rápida e prática através do aplicativo Telegram.

## 🎯 Funcionalidades

- ✅ **Interface Interativa** com botões e menus visuais
- ✅ **Mensagens de Boas-Vindas** personalizadas
- ✅ Vinculação de operadores via código de 8 dígitos
- ✅ Realização de checklists NR12 via Telegram
- ✅ Escaneamento de QR Codes de equipamentos
- ✅ Histórico de checklists realizados
- ✅ Listagem de equipamentos autorizados
- ✅ Desvinculação de conta
- ✅ **Navegação por botões** (não precisa digitar comandos)

## 📋 Comandos Disponíveis

| Comando | Descrição |
|---------|-----------|
| `/start` | Inicia o bot e mostra as opções |
| `/vincular` | Vincula sua conta com código de 8 dígitos |
| `/desvincular` | Desvincula sua conta do Telegram |
| `/equipamentos` | Lista equipamentos autorizados |
| `/checklist` | Inicia um novo checklist NR12 |
| `/historico` | Mostra últimos 10 checklists |
| `/ajuda` | Exibe todos os comandos |
| `/cancelar` | Cancela operação atual |

## 🚀 Configuração

### 1. Criar o Bot no Telegram

1. Abra o Telegram e busque por `@BotFather`
2. Envie `/newbot` e siga as instruções
3. Escolha um nome para o bot (ex: "Mandacaru NR12 Bot")
4. Escolha um username (ex: "mandacaru_nr12_bot")
5. Copie o TOKEN que o BotFather fornecer

### 2. Configurar Variáveis de Ambiente

Adicione as seguintes variáveis no arquivo `.env` ou nas configurações do servidor:

```bash
# Token do bot fornecido pelo BotFather
TELEGRAM_BOT_TOKEN=8096973656:AAFqVAp-VgZciZgV_mqqgMgDqQ7DCuQtEng

# Username do bot (sem @)
TELEGRAM_BOT_USERNAME=mandacarusmbot

# URL do webhook (opcional, apenas para produção)
TELEGRAM_WEBHOOK_URL=https://seudominio.com/bot/webhook/
```

### 3. Rodar o Bot

#### Modo Polling (Desenvolvimento)

```bash
cd backend
python manage.py runbot
```

O bot ficará rodando e recebendo mensagens em tempo real.

#### Modo Webhook (Produção)

1. Configure a URL do webhook no `.env`:
   ```bash
   TELEGRAM_WEBHOOK_URL=https://seudominio.com/bot/webhook/
   ```

2. Configure o webhook via Django shell ou endpoint:
   ```python
   from bot_telegram.bot import configurar_webhook
   import asyncio

   asyncio.run(configurar_webhook("https://seudominio.com/bot/webhook/"))
   ```

3. O Telegram enviará updates para `https://seudominio.com/bot/webhook/`

## 📱 Como Usar

### Para Operadores:

1. **Vincular Conta**
   - Solicite ao administrador um código de vinculação
   - Abra o bot no Telegram: `@mandacarusmbot`
   - Envie `/start` - Você verá uma mensagem de boas-vindas com botões
   - Clique no botão **"🔗 Vincular Conta"** OU envie `/vincular`
   - Digite o código de 8 dígitos
   - Pronto! Sua conta está vinculada

2. **Menu Principal Interativo**
   - Após vincular, envie `/start` para ver o menu principal
   - Você verá botões para:
     - 📋 **Realizar Checklist**
     - 🔧 **Meus Equipamentos**
     - 📊 **Histórico**
     - ❓ **Ajuda**
     - 🔗 **Desvincular Conta**

3. **Realizar Checklist** (2 formas)
   - **Via Botão**: Clique em "📋 Realizar Checklist" no menu
   - **Via Comando**: Envie `/checklist`
   - Escaneie o QR Code do equipamento ou digite o código
   - Responda cada item do checklist usando os botões
   - Ao final, você receberá o resultado (Aprovado/Reprovado)

4. **Ver Equipamentos** (2 formas)
   - **Via Botão**: Clique em "🔧 Meus Equipamentos"
   - **Via Comando**: Envie `/equipamentos`
   - Veja a lista completa com detalhes de cada equipamento

5. **Ver Histórico** (2 formas)
   - **Via Botão**: Clique em "📊 Histórico"
   - **Via Comando**: Envie `/historico`
   - Veja seus últimos 10 checklists com resultados

### Para Administradores:

1. **Gerar Código de Vinculação**
   - Acesse o painel web do operador
   - Clique em "Gerar Código Telegram"
   - Forneça o código de 8 dígitos ao operador
   - O código é válido por 24 horas

2. **Autorizar Equipamentos**
   - Acesse o cadastro do operador
   - Vincule os equipamentos autorizados
   - O operador poderá ver e fazer checklist apenas desses equipamentos

3. **Visualizar Checklists**
   - Os checklists realizados via bot aparecem no painel web
   - Você pode filtrar, exportar e gerar relatórios normalmente

## 🔧 Endpoints da API

### Health Check
```
GET /bot/health/
```
Verifica se o bot está funcionando corretamente.

### Webhook
```
POST /bot/webhook/
```
Recebe updates do Telegram (usado apenas em modo webhook).

## 🛠️ Estrutura do Código

```
backend/bot_telegram/
├── __init__.py
├── apps.py                     # Configuração do app Django
├── bot.py                      # Configuração principal do bot
├── handlers.py                 # Handlers de comandos e conversas
├── views.py                    # Views do Django (webhook e health)
├── urls.py                     # Rotas do Django
├── README.md                   # Este arquivo
└── management/
    └── commands/
        └── runbot.py          # Command para rodar em modo polling
```

## 🔒 Segurança

- ✅ Apenas operadores cadastrados podem vincular
- ✅ Código de vinculação expira em 24 horas
- ✅ Operador só acessa equipamentos autorizados
- ✅ Todas as ações são registradas no banco de dados
- ✅ Webhook com HTTPS obrigatório em produção

## 📊 Monitoramento

### Logs

O bot registra todas as ações importantes:
- Vinculações realizadas
- Checklists iniciados e concluídos
- Erros e exceções

### Health Check

Monitore a saúde do bot acessando:
```
GET /bot/health/
```

Resposta esperada:
```json
{
  "ok": true,
  "bot_username": "mandacaru_nr12_bot",
  "status": "running"
}
```

## 🐛 Troubleshooting

### Bot não responde

1. Verifique se o TOKEN está correto
2. Verifique se o bot está rodando (`python manage.py runbot`)
3. Verifique os logs do Django

### Código de vinculação inválido

1. Verifique se o código não expirou (válido por 24h)
2. Gere um novo código pelo painel web
3. Certifique-se de digitar os 8 dígitos corretamente

### QR Code não funciona

1. Certifique-se de que o QR Code foi gerado corretamente
2. Tente digitar o código do equipamento manualmente
3. Verifique se você tem autorização para o equipamento

## 📝 Notas

- O bot suporta múltiplos operadores simultâneos
- Cada operador só vê seus próprios equipamentos e histórico
- Os checklists são salvos em tempo real
- É possível continuar um checklist mesmo se fechar o Telegram

## 🤝 Suporte

Em caso de dúvidas ou problemas:
1. Consulte este README
2. Verifique os logs do bot
3. Entre em contato com o administrador do sistema
