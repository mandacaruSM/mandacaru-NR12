# backend/bot_telegram/handlers.py
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, ReplyKeyboardMarkup, KeyboardButton, ReplyKeyboardRemove
from telegram.ext import ContextTypes, ConversationHandler
from django.utils import timezone
from asgiref.sync import sync_to_async
from core.models import Operador, Supervisor
from tecnicos.models import Tecnico
from equipamentos.models import Equipamento, MedicaoEquipamento
from cadastro.models import Empreendimento
from nr12.models import ChecklistRealizado, RespostaItemChecklist, ModeloChecklist
from abastecimentos.models import Abastecimento
from manutencao.models import Manutencao
from decimal import Decimal, InvalidOperation
import logging

logger = logging.getLogger(__name__)

# Estados da conversa
AGUARDANDO_CODIGO, AGUARDANDO_CONFIRMACAO_CPF, AGUARDANDO_QR_CODE, AGUARDANDO_CHECKLIST = range(4)
AGUARDANDO_ABAST_LEITURA, AGUARDANDO_ABAST_LITROS, AGUARDANDO_ABAST_VALOR, AGUARDANDO_ABAST_TIPO = range(4, 8)
AGUARDANDO_MANUT_TIPO, AGUARDANDO_MANUT_HORIMETRO, AGUARDANDO_MANUT_DESCRICAO, AGUARDANDO_MANUT_OBSERVACOES, AGUARDANDO_MANUT_PROXIMA = range(8, 13)


# Funções auxiliares para acesso ao banco de dados de forma assíncrona
@sync_to_async
def get_usuario_by_chat_id(chat_id):
    """
    Busca usuário (Operador, Supervisor ou Técnico) pelo chat_id
    Retorna tupla (usuario, tipo) onde tipo = 'operador', 'supervisor' ou 'tecnico'
    """
    chat_id_str = str(chat_id)

    # Tentar como Operador
    try:
        operador = Operador.objects.get(telegram_chat_id=chat_id_str)
        return (operador, 'operador')
    except Operador.DoesNotExist:
        pass

    # Tentar como Supervisor
    try:
        supervisor = Supervisor.objects.get(telegram_chat_id=chat_id_str)
        return (supervisor, 'supervisor')
    except Supervisor.DoesNotExist:
        pass

    # Tentar como Técnico
    try:
        tecnico = Tecnico.objects.get(telegram_chat_id=chat_id_str)
        return (tecnico, 'tecnico')
    except Tecnico.DoesNotExist:
        pass

    raise Exception("Usuário não encontrado")


@sync_to_async
def get_operador_by_chat_id(chat_id):
    return Operador.objects.get(telegram_chat_id=str(chat_id))


@sync_to_async
def get_usuario_by_codigo(codigo):
    """
    Busca usuário (Operador, Supervisor ou Técnico) pelo código de vinculação
    Retorna tupla (usuario, tipo) onde tipo = 'operador', 'supervisor' ou 'tecnico'
    """
    # Tentar como Operador
    try:
        operador = Operador.objects.get(
            codigo_vinculacao=codigo,
            codigo_valido_ate__gte=timezone.now()
        )
        return (operador, 'operador')
    except Operador.DoesNotExist:
        pass

    # Tentar como Supervisor
    try:
        supervisor = Supervisor.objects.get(
            codigo_vinculacao=codigo,
            codigo_valido_ate__gte=timezone.now()
        )
        return (supervisor, 'supervisor')
    except Supervisor.DoesNotExist:
        pass

    # Tentar como Técnico
    try:
        tecnico = Tecnico.objects.get(
            codigo_vinculacao=codigo,
            codigo_valido_ate__gte=timezone.now()
        )
        return (tecnico, 'tecnico')
    except Tecnico.DoesNotExist:
        pass

    raise Exception("Código inválido ou expirado")


@sync_to_async
def get_operador_by_codigo(codigo):
    return Operador.objects.get(
        codigo_vinculacao=codigo,
        codigo_valido_ate__gte=timezone.now()
    )


@sync_to_async
def vincular_usuario_telegram(usuario, chat_id, username, tipo_usuario):
    """Vincula Telegram para qualquer tipo de usuário"""
    if tipo_usuario == 'operador':
        usuario.vincular_telegram(chat_id, username)
    elif tipo_usuario == 'supervisor':
        usuario.vincular_telegram(chat_id, username)
    elif tipo_usuario == 'tecnico':
        # Técnico não tem método vincular_telegram, fazer manualmente
        usuario.telegram_chat_id = str(chat_id)
        usuario.telegram_username = username or ''
        usuario.telegram_vinculado_em = timezone.now()
        usuario.codigo_vinculacao = None
        usuario.codigo_valido_ate = None
        usuario.save()
    return usuario


@sync_to_async
def desvincular_usuario_telegram(usuario, tipo_usuario):
    """Desvincula Telegram para qualquer tipo de usuário"""
    nome_completo = usuario.nome_completo if hasattr(usuario, 'nome_completo') else (usuario.nome if hasattr(usuario, 'nome') else str(usuario))

    if tipo_usuario in ['operador', 'supervisor']:
        usuario.desvincular_telegram()
    elif tipo_usuario == 'tecnico':
        usuario.telegram_chat_id = None
        usuario.telegram_username = ''
        usuario.telegram_vinculado_em = None
        usuario.save()

    return nome_completo


@sync_to_async
def vincular_operador_telegram(operador, chat_id, username):
    operador.vincular_telegram(chat_id, username)
    return operador


@sync_to_async
def desvincular_operador_telegram(operador):
    nome = operador.nome_completo
    operador.desvincular_telegram()
    return nome


@sync_to_async
def get_equipamentos_autorizados(usuario, tipo_usuario='operador'):
    """
    Retorna equipamentos baseado no tipo de usuário:
    - Operador: apenas equipamentos autorizados
    - Supervisor: TODOS equipamentos dos empreendimentos vinculados OU onde é supervisor
    - Técnico: equipamentos dos clientes vinculados OU empreendimentos vinculados
    """
    if tipo_usuario == 'supervisor':
        # Supervisor tem acesso via ManyToMany OU via ForeignKey
        from cadastro.models import Empreendimento
        from django.db.models import Q

        # Empreendimentos onde está vinculado no M2M
        empreendimentos_m2m = usuario.empreendimentos_vinculados.all()
        # Empreendimentos onde está como supervisor (ForeignKey)
        empreendimentos_fk = Empreendimento.objects.filter(supervisor=usuario, ativo=True)

        # Combinar ambos usando Q
        return list(
            Equipamento.objects.filter(
                Q(empreendimento__in=empreendimentos_m2m) | Q(empreendimento__in=empreendimentos_fk),
                ativo=True
            ).distinct().select_related('tipo', 'empreendimento', 'cliente')
        )
    elif tipo_usuario == 'tecnico':
        # Técnico tem acesso a equipamentos dos clientes vinculados E empreendimentos vinculados
        from django.db.models import Q

        clientes = usuario.clientes.all()
        empreendimentos = usuario.empreendimentos_vinculados.all()

        return list(
            Equipamento.objects.filter(
                Q(cliente__in=clientes) | Q(empreendimento__in=empreendimentos),
                ativo=True
            ).distinct().select_related('tipo', 'empreendimento', 'cliente')
        )
    else:  # operador
        return list(usuario.equipamentos_autorizados.filter(ativo=True).select_related('tipo', 'empreendimento', 'cliente'))


@sync_to_async
def get_equipamento_by_id(equipamento_id):
    return Equipamento.objects.select_related('tipo', 'empreendimento', 'cliente').get(id=equipamento_id, ativo=True)


@sync_to_async
def get_equipamento_by_codigo(codigo):
    return Equipamento.objects.select_related('tipo').get(codigo=codigo, ativo=True)


@sync_to_async
def get_equipamento_by_uuid(uuid):
    return Equipamento.objects.select_related('tipo').get(uuid=uuid, ativo=True)


@sync_to_async
def tem_acesso_equipamento(usuario, equipamento_id, tipo_usuario='operador'):
    """
    Verifica se usuário tem acesso ao equipamento baseado no tipo:
    - Operador: verifica se está autorizado
    - Supervisor: verifica se equipamento está em seus empreendimentos (M2M OU FK)
    - Técnico: verifica se equipamento é do cliente vinculado OU do empreendimento vinculado
    """
    try:
        equipamento = Equipamento.objects.get(id=equipamento_id, ativo=True)

        if tipo_usuario == 'supervisor':
            # Supervisor tem acesso via M2M OU se é o supervisor do empreendimento (FK)
            tem_acesso_m2m = usuario.empreendimentos_vinculados.filter(id=equipamento.empreendimento_id).exists()
            tem_acesso_fk = equipamento.empreendimento and equipamento.empreendimento.supervisor_id == usuario.id
            return tem_acesso_m2m or tem_acesso_fk
        elif tipo_usuario == 'tecnico':
            # Técnico tem acesso se equipamento é de cliente vinculado OU empreendimento vinculado
            tem_acesso_cliente = usuario.clientes.filter(id=equipamento.cliente_id).exists()
            tem_acesso_empreendimento = usuario.empreendimentos_vinculados.filter(id=equipamento.empreendimento_id).exists()
            return tem_acesso_cliente or tem_acesso_empreendimento
        else:  # operador
            return usuario.tem_acesso_equipamento(equipamento_id)
    except Equipamento.DoesNotExist:
        return False


@sync_to_async
def get_modelo_checklist(tipo_equipamento):
    return ModeloChecklist.objects.filter(tipo_equipamento=tipo_equipamento, ativo=True).prefetch_related('itens').first()


@sync_to_async
def criar_checklist_realizado(modelo, equipamento, usuario, tipo_usuario='operador'):
    """
    Cria um checklist realizado por qualquer tipo de usuário.
    Para supervisores e técnicos, o campo 'operador' pode ser None,
    mas o nome é sempre salvo em 'operador_nome'.
    """
    return ChecklistRealizado.objects.create(
        modelo=modelo,
        equipamento=equipamento,
        operador=usuario if tipo_usuario == 'operador' else None,
        operador_nome=usuario.nome_completo if hasattr(usuario, 'nome_completo') else usuario.nome,
        origem='BOT',
        status='EM_ANDAMENTO'
    )


@sync_to_async
def get_itens_modelo(modelo):
    return list(modelo.itens.all().order_by('ordem'))


@sync_to_async
def criar_resposta_item(checklist, item, resposta):
    return RespostaItemChecklist.objects.create(
        checklist=checklist,
        item=item,
        resposta=resposta
    )


@sync_to_async
def finalizar_checklist_db(checklist):
    checklist.finalizar()
    checklist.refresh_from_db()
    # Retornar dados necessários para evitar acesso síncrono depois
    return {
        'checklist': checklist,
        'equipamento_codigo': checklist.equipamento.codigo,
        'data_hora_fim': checklist.data_hora_fim,
        'resultado_geral': checklist.resultado_geral,
        'resultado_geral_display': checklist.get_resultado_geral_display()
    }


@sync_to_async
def get_respostas_checklist(checklist):
    respostas = checklist.respostas.all()
    return {
        'total': respostas.count(),
        'conformes': respostas.filter(resposta='CONFORME').count(),
        'nao_conformes': respostas.filter(resposta='NAO_CONFORME').count(),
        'nao_aplicaveis': respostas.filter(resposta='NA').count(),
    }


@sync_to_async
def cancelar_checklist_db(checklist):
    checklist.status = 'CANCELADO'
    checklist.save()


@sync_to_async
def get_historico_checklists(operador):
    return list(operador.checklists.filter(status='CONCLUIDO').select_related('equipamento').order_by('-data_hora_fim')[:10])


@sync_to_async
def get_historico_equipamento(equipamento_id):
    return list(ChecklistRealizado.objects.filter(
        equipamento_id=equipamento_id,
        status='CONCLUIDO'
    ).order_by('-data_hora_fim')[:10])


@sync_to_async
def get_empreendimento_by_uuid(uuid):
    return Empreendimento.objects.select_related('cliente').get(uuid=uuid, ativo=True)


@sync_to_async
def get_equipamentos_empreendimento(empreendimento_id, operador_id):
    """Busca equipamentos do empreendimento que o operador tem acesso"""
    operador = Operador.objects.get(id=operador_id)
    return list(
        operador.equipamentos_autorizados.filter(
            empreendimento_id=empreendimento_id,
            ativo=True
        ).select_related('tipo', 'empreendimento', 'cliente')
    )


@sync_to_async
def criar_abastecimento(equipamento_id, operador_id, leitura, litros, valor_total, tipo_combustivel):
    """Cria um registro de abastecimento"""
    equipamento = Equipamento.objects.get(id=equipamento_id)
    operador = Operador.objects.get(id=operador_id)

    # Criar abastecimento
    abastecimento = Abastecimento.objects.create(
        equipamento=equipamento,
        data=timezone.now().date(),
        horimetro_km=Decimal(str(leitura)),
        tipo_combustivel=tipo_combustivel,
        quantidade_litros=Decimal(str(litros)),
        valor_total=Decimal(str(valor_total)),
        operador=operador,
        observacoes=f"Registrado via Bot Telegram"
    )

    # Criar medição do equipamento
    MedicaoEquipamento.objects.create(
        equipamento=equipamento,
        origem='ABASTECIMENTO',
        leitura=Decimal(str(leitura)),
        observacao=f"Abastecimento: {litros}L {tipo_combustivel}"
    )

    # Atualizar leitura atual do equipamento
    equipamento.leitura_atual = Decimal(str(leitura))
    equipamento.save()

    return abastecimento


@sync_to_async
def get_ultimo_abastecimento(equipamento_id):
    """Busca o último abastecimento do equipamento"""
    return Abastecimento.objects.filter(equipamento_id=equipamento_id).order_by('-data', '-horimetro_km').first()


# Helpers para Ordens de Serviço
@sync_to_async
def get_ordens_servico_tecnico(tecnico_id, status=None):
    """Busca ordens de serviço do técnico"""
    from ordens_servico.models import OrdemServico

    qs = OrdemServico.objects.filter(tecnico_responsavel_id=tecnico_id)
    if status:
        qs = qs.filter(status=status)

    return list(qs.select_related('cliente', 'empreendimento', 'equipamento').order_by('-created_at')[:10])


@sync_to_async
def get_ordem_servico_by_id(os_id):
    """Busca OS por ID"""
    from ordens_servico.models import OrdemServico
    return OrdemServico.objects.select_related('cliente', 'empreendimento', 'equipamento', 'tecnico_responsavel').get(id=os_id)


@sync_to_async
def finalizar_ordem_servico(os_id, tecnico_id):
    """Finaliza uma ordem de serviço e cria manutenção automaticamente"""
    from ordens_servico.models import OrdemServico
    from django.contrib.auth import get_user_model

    User = get_user_model()
    os = OrdemServico.objects.select_related('equipamento', 'tecnico_responsavel').get(id=os_id)
    tecnico = Tecnico.objects.get(id=tecnico_id)

    # Atualizar status da OS
    os.status = 'CONCLUIDA'
    os.data_conclusao = timezone.now().date()

    # Tentar encontrar o usuário vinculado ao técnico (se houver)
    try:
        user = User.objects.filter(email=tecnico.email).first()
        if user:
            os.concluido_por = user
    except:
        pass

    os.save()

    # Criar manutenção automaticamente se houver equipamento
    manutencao = None
    if os.equipamento:
        # Usar horímetro atual do equipamento ou leitura atual
        horimetro = os.equipamento.leitura_atual or Decimal('0.00')

        manutencao = Manutencao.objects.create(
            equipamento=os.equipamento,
            tipo='CORRETIVA',  # OS geralmente resulta em manutenção corretiva
            data=timezone.now().date(),
            horimetro=horimetro,
            tecnico=tecnico,
            descricao=f"Manutenção gerada automaticamente da OS {os.numero}\n\n{os.descricao}",
            observacoes=os.observacoes or ''
        )

    return {
        'os': os,
        'manutencao': manutencao,
        'numero_os': os.numero,
        'equipamento_codigo': os.equipamento.codigo if os.equipamento else None
    }


# Helpers para Manutenção
@sync_to_async
def criar_manutencao(equipamento_id, tecnico_id, tipo, horimetro, descricao, observacoes=''):
    """Cria um registro de manutenção"""
    equipamento = Equipamento.objects.get(id=equipamento_id)
    tecnico = Tecnico.objects.get(id=tecnico_id)

    manutencao = Manutencao.objects.create(
        equipamento=equipamento,
        tipo=tipo,
        data=timezone.now().date(),
        horimetro=Decimal(str(horimetro)),
        tecnico=tecnico,
        descricao=descricao,
        observacoes=observacoes
    )

    # Atualizar leitura do equipamento se o horímetro for maior
    if equipamento.leitura_atual is None or Decimal(str(horimetro)) > equipamento.leitura_atual:
        equipamento.leitura_atual = Decimal(str(horimetro))
        equipamento.save()

    return manutencao


@sync_to_async
def get_manutencoes_tecnico(tecnico_id):
    """Busca manutenções do técnico"""
    return list(
        Manutencao.objects.filter(tecnico_id=tecnico_id)
        .select_related('equipamento', 'tecnico')
        .order_by('-data', '-id')[:10]
    )


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handler para o comando /start"""
    user = update.effective_user
    chat_id = update.effective_chat.id

    logger.info(f"[START] Comando /start recebido de {user.username or user.first_name} (chat_id: {chat_id})")

    # Verificar se o usuário já está vinculado (qualquer tipo)
    try:
        usuario, tipo_usuario = await get_usuario_by_chat_id(chat_id)
        logger.info(f"[START] Usuário encontrado: {usuario.nome_completo if hasattr(usuario, 'nome_completo') else usuario.nome} (tipo: {tipo_usuario})")

        # Emoji baseado no tipo
        emoji_tipo = {
            'operador': '👷',
            'supervisor': '👔',
            'tecnico': '🔧'
        }.get(tipo_usuario, '👤')

        tipo_texto = {
            'operador': 'Operador',
            'supervisor': 'Supervisor',
            'tecnico': 'Técnico'
        }.get(tipo_usuario, 'Usuário')

        # Menu diferente para técnicos
        if tipo_usuario == 'tecnico':
            keyboard = [
                [
                    InlineKeyboardButton("🔧 Meus Equipamentos", callback_data='menu_equipamentos'),
                    InlineKeyboardButton("🛠️ Manutenções", callback_data='menu_manutencoes')
                ],
                [
                    InlineKeyboardButton("📋 Ordens de Serviço", callback_data='menu_ordens_servico'),
                    InlineKeyboardButton("📊 Histórico", callback_data='menu_historico')
                ],
                [
                    InlineKeyboardButton("❓ Ajuda", callback_data='menu_ajuda'),
                    InlineKeyboardButton("🔗 Desvincular Conta", callback_data='menu_desvincular')
                ]
            ]
        else:
            # Menu para operadores e supervisores
            keyboard = [
                [
                    InlineKeyboardButton("📋 Realizar Checklist", callback_data='menu_checklist'),
                    InlineKeyboardButton("🔧 Meus Equipamentos", callback_data='menu_equipamentos')
                ],
                [
                    InlineKeyboardButton("📊 Histórico", callback_data='menu_historico'),
                    InlineKeyboardButton("❓ Ajuda", callback_data='menu_ajuda')
                ],
                [
                    InlineKeyboardButton("🔗 Desvincular Conta", callback_data='menu_desvincular')
                ]
            ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        nome = usuario.nome_completo if hasattr(usuario, 'nome_completo') else usuario.nome

        texto = (
            f"🎯 *Bem-vindo ao Sistema NR12!*\n\n"
            f"Olá, *{nome}*! {emoji_tipo}\n\n"
            f"✅ Conta vinculada como *{tipo_texto}*\n"
            f"🆔 Chat ID: `{chat_id}`\n\n"
            f"Escolha uma opção abaixo:"
        )
        await update.message.reply_text(texto, reply_markup=reply_markup, parse_mode='Markdown')
        logger.info(f"[START] Menu principal enviado para {tipo_usuario} vinculado")

    except Exception:
        logger.info(f"[START] Usuário não encontrado, enviando menu de vinculação")
        # Menu para não vinculados
        keyboard = [
            [InlineKeyboardButton("🔗 Vincular Conta", callback_data='menu_vincular')],
            [InlineKeyboardButton("❓ Como Funciona?", callback_data='menu_ajuda')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        texto = (
            f"👋 *Olá, {user.first_name}!*\n\n"
            f"🤖 Bem-vindo ao *Bot NR12*\n"
            f"Sistema de Gestão de Equipamentos e Segurança do Trabalho\n\n"
            f"⚠️ Você ainda não está vinculado ao sistema.\n\n"
            f"Para começar, você precisa:\n"
            f"1️⃣ Solicitar um código de vinculação ao supervisor\n"
            f"2️⃣ Clicar no botão abaixo e inserir o código\n\n"
            f"👇 Escolha uma opção:"
        )
        await update.message.reply_text(texto, reply_markup=reply_markup, parse_mode='Markdown')


async def vincular_inicio(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Inicia o processo de vinculação"""
    chat_id = update.effective_chat.id

    logger.info(f"[VINCULAR] Comando /vincular recebido (chat_id: {chat_id})")

    # Verificar se já está vinculado (qualquer tipo)
    try:
        usuario, tipo_usuario = await get_usuario_by_chat_id(chat_id)
        nome = usuario.nome_completo if hasattr(usuario, 'nome_completo') else usuario.nome
        logger.info(f"[VINCULAR] Usuário já vinculado: {nome} (tipo: {tipo_usuario})")
        await update.message.reply_text(
            f"Você já está vinculado como {nome}.\n"
            "Use /desvincular para desvincular esta conta."
        )
        return ConversationHandler.END
    except Exception:
        logger.info(f"[VINCULAR] Usuário não vinculado, solicitando código")
        pass

    await update.message.reply_text(
        "Por favor, digite o código de vinculação de 8 dígitos que você recebeu.\n\n"
        "Ou envie /cancelar para cancelar."
    )
    return AGUARDANDO_CODIGO


async def vincular_codigo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Processa o código de vinculação"""
    codigo = update.message.text.strip()
    chat_id = update.effective_chat.id
    username = update.effective_user.username

    logger.info(f"[VINCULAR] Código recebido: {codigo} (chat_id: {chat_id})")

    # Validar formato do código
    if not codigo.isdigit() or len(codigo) != 8:
        logger.warning(f"[VINCULAR] Código inválido (formato): {codigo}")
        await update.message.reply_text(
            "Código inválido! O código deve ter exatamente 8 dígitos.\n"
            "Tente novamente ou envie /cancelar."
        )
        return AGUARDANDO_CODIGO

    # Buscar usuário pelo código (qualquer tipo)
    try:
        usuario, tipo_usuario = await get_usuario_by_codigo(codigo)
        nome = usuario.nome_completo if hasattr(usuario, 'nome_completo') else usuario.nome
        cpf = usuario.cpf
        logger.info(f"[VINCULAR] Usuário encontrado: {nome} (tipo: {tipo_usuario})")

        # Emoji baseado no tipo
        emoji_tipo = {
            'operador': '👷',
            'supervisor': '👔',
            'tecnico': '🔧'
        }.get(tipo_usuario, '👤')

        tipo_texto = {
            'operador': 'Operador',
            'supervisor': 'Supervisor',
            'tecnico': 'Técnico'
        }.get(tipo_usuario, 'Usuário')

        # Salvar dados temporários no contexto para usar na confirmação
        context.user_data['vincular_usuario_id'] = usuario.id
        context.user_data['vincular_tipo'] = tipo_usuario
        context.user_data['vincular_nome'] = nome
        context.user_data['vincular_emoji'] = emoji_tipo
        context.user_data['vincular_tipo_texto'] = tipo_texto
        context.user_data['vincular_cpf'] = cpf
        context.user_data['vincular_chat_id'] = chat_id
        context.user_data['vincular_username'] = username

        # Mascarar CPF para mostrar (XXX.XXX.XXX-45)
        cpf_limpo = ''.join(filter(str.isdigit, cpf)) if cpf else ''
        if len(cpf_limpo) == 11:
            cpf_mascarado = f"XXX.XXX.XXX-{cpf_limpo[-2:]}"
        else:
            cpf_mascarado = "***"

        # Pedir confirmação do CPF
        await update.message.reply_text(
            f"🔐 *Confirmação de Segurança*\n\n"
            f"Para vincular a conta de *{nome}* {emoji_tipo}\n"
            f"Tipo: *{tipo_texto}*\n\n"
            f"Por favor, digite os *2 últimos dígitos do CPF*:\n"
            f"CPF: {cpf_mascarado}\n\n"
            f"Ou envie /cancelar para cancelar.",
            parse_mode='Markdown'
        )

        return AGUARDANDO_CONFIRMACAO_CPF

    except Exception as e:
        logger.warning(f"[VINCULAR] Código não encontrado ou expirado: {codigo} - Erro: {e}")
        await update.message.reply_text(
            "❌ Código inválido ou expirado!\n\n"
            "Verifique o código e tente novamente, ou solicite um novo código ao administrador.\n\n"
            "Envie /cancelar para cancelar."
        )
        return AGUARDANDO_CODIGO


async def confirmar_cpf(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Valida CPF digitado e finaliza vinculação"""
    cpf_digitado = update.message.text.strip()

    logger.info(f"[VINCULAR] Confirmação de CPF recebida")

    # Validar que digitou apenas números
    if not cpf_digitado.isdigit():
        await update.message.reply_text(
            "❌ Digite apenas os *2 últimos dígitos do CPF* (números).\n\n"
            "Exemplo: se o CPF termina em -45, digite: 45\n\n"
            "Ou envie /cancelar para cancelar.",
            parse_mode='Markdown'
        )
        return AGUARDANDO_CONFIRMACAO_CPF

    # Validar que digitou exatamente 2 dígitos
    if len(cpf_digitado) != 2:
        await update.message.reply_text(
            "❌ Digite exatamente *2 dígitos*.\n\n"
            "Exemplo: se o CPF termina em -45, digite: 45\n\n"
            "Ou envie /cancelar para cancelar.",
            parse_mode='Markdown'
        )
        return AGUARDANDO_CONFIRMACAO_CPF

    # Recuperar dados salvos no contexto
    cpf_cadastrado = context.user_data.get('vincular_cpf', '')
    cpf_limpo = ''.join(filter(str.isdigit, cpf_cadastrado))

    # Verificar se os 2 últimos dígitos conferem
    if len(cpf_limpo) != 11 or cpf_limpo[-2:] != cpf_digitado:
        logger.warning(f"[VINCULAR] CPF não confere. Esperado: {cpf_limpo[-2:] if len(cpf_limpo) == 11 else 'N/A'}, Digitado: {cpf_digitado}")
        await update.message.reply_text(
            "❌ *CPF incorreto!*\n\n"
            "Os dígitos não conferem com o cadastro.\n\n"
            "Tente novamente ou envie /cancelar.",
            parse_mode='Markdown'
        )
        return AGUARDANDO_CONFIRMACAO_CPF

    # CPF confirmado! Agora vincular
    usuario_id = context.user_data.get('vincular_usuario_id')
    tipo_usuario = context.user_data.get('vincular_tipo')
    nome = context.user_data.get('vincular_nome')
    emoji_tipo = context.user_data.get('vincular_emoji')
    tipo_texto = context.user_data.get('vincular_tipo_texto')
    chat_id = context.user_data.get('vincular_chat_id')
    username = context.user_data.get('vincular_username')

    try:
        # Buscar usuário novamente pelo ID e tipo
        usuario = None
        if tipo_usuario == 'operador':
            usuario = await sync_to_async(Operador.objects.get)(id=usuario_id)
        elif tipo_usuario == 'supervisor':
            usuario = await sync_to_async(Supervisor.objects.get)(id=usuario_id)
        elif tipo_usuario == 'tecnico':
            usuario = await sync_to_async(Tecnico.objects.get)(id=usuario_id)

        if not usuario:
            raise Exception("Usuário não encontrado")

        # Vincular o Telegram
        await vincular_usuario_telegram(usuario, chat_id, username, tipo_usuario)
        logger.info(f"[VINCULAR] Vinculação realizada com sucesso após confirmação de CPF!")

        await update.message.reply_text(
            f"✅ *Vinculação realizada com sucesso!*\n\n"
            f"Bem-vindo, *{nome}*! {emoji_tipo}\n\n"
            f"Tipo de conta: *{tipo_texto}*\n\n"
            "Use os comandos abaixo:\n"
            "/equipamentos - Ver equipamentos\n"
            "/checklist - Realizar checklist\n"
            "/historico - Ver histórico\n"
            "/ajuda - Ver todos os comandos",
            parse_mode='Markdown'
        )

        # Limpar dados temporários
        context.user_data.clear()

        return ConversationHandler.END

    except Exception as e:
        logger.error(f"[VINCULAR] Erro ao finalizar vinculação: {e}")
        await update.message.reply_text(
            "❌ Erro ao finalizar vinculação.\n\n"
            "Por favor, tente novamente mais tarde ou contate o administrador.",
            parse_mode='Markdown'
        )
        context.user_data.clear()
        return ConversationHandler.END


async def cancelar(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Cancela a operação atual"""
    await update.message.reply_text(
        "Operação cancelada.\n\n"
        "Use /start para ver os comandos disponíveis."
    )
    return ConversationHandler.END


async def desvincular(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Desvincula o Telegram do usuário (Operador, Supervisor ou Técnico)"""
    chat_id = update.effective_chat.id

    try:
        usuario, tipo_usuario = await get_usuario_by_chat_id(chat_id)
        nome = await desvincular_usuario_telegram(usuario, tipo_usuario)

        await update.message.reply_text(
            f"✅ Conta desvinculada com sucesso, {nome}!\n\n"
            "Use /vincular para vincular novamente."
        )
    except Exception:
        await update.message.reply_text(
            "Você não está vinculado.\n\n"
            "Use /vincular para vincular sua conta."
        )


async def equipamentos(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Lista os equipamentos autorizados (operador, supervisor ou técnico)"""
    chat_id = update.effective_chat.id

    try:
        usuario, tipo_usuario = await get_usuario_by_chat_id(chat_id)
        equipamentos_list = await get_equipamentos_autorizados(usuario, tipo_usuario)

        if not equipamentos_list:
            await update.message.reply_text(
                "Você ainda não tem equipamentos autorizados.\n\n"
                "Entre em contato com o administrador."
            )
            return

        texto = f"📋 Equipamentos Autorizados ({len(equipamentos_list)}):\n\n"

        for eq in equipamentos_list:
            texto += (
                f"🔧 {eq.codigo} - {eq.descricao or eq.modelo}\n"
                f"   Tipo: {eq.tipo.nome}\n"
                f"   Local: {eq.empreendimento.nome}\n"
                f"   Cliente: {eq.cliente.nome_razao}\n\n"
            )

        texto += "Use /checklist para realizar um checklist."

        await update.message.reply_text(texto)

    except Exception:
        await update.message.reply_text(
            "Você não está vinculado.\n\n"
            "Use /vincular para vincular sua conta."
        )


async def checklist_inicio(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Inicia o processo de checklist"""
    chat_id = update.effective_chat.id

    try:
        usuario, tipo_usuario = await get_usuario_by_chat_id(chat_id)

        # Armazenar usuário e tipo no contexto
        context.user_data['usuario'] = usuario
        context.user_data['tipo_usuario'] = tipo_usuario
        # Manter compatibilidade com código antigo que usa 'operador'
        context.user_data['operador'] = usuario

        await update.message.reply_text(
            "📋 *Realizar Checklist NR12*\n\n"
            "Para iniciar, escaneie o QR Code do equipamento ou digite o código do equipamento.\n\n"
            "Envie /cancelar para cancelar.",
            parse_mode='Markdown'
        )

        return AGUARDANDO_QR_CODE

    except Exception:
        await update.message.reply_text(
            "Você não está vinculado.\n\n"
            "Use /vincular para vincular sua conta."
        )
        return ConversationHandler.END


async def checklist_equipamento(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Processa o código do equipamento"""
    codigo = update.message.text.strip()
    usuario = context.user_data.get('usuario') or context.user_data.get('operador')
    tipo_usuario = context.user_data.get('tipo_usuario', 'operador')

    if not usuario:
        await update.message.reply_text("Erro: sessão expirada. Use /checklist para começar novamente.")
        return ConversationHandler.END

    # Buscar equipamento pelo código ou QR payload
    try:
        # Tentar por código direto
        equipamento = await get_equipamento_by_codigo(codigo)
    except Equipamento.DoesNotExist:
        # Tentar por QR payload (formato: eq:uuid)
        if codigo.startswith('eq:'):
            try:
                uuid = codigo.split(':', 1)[1]
                equipamento = await get_equipamento_by_uuid(uuid)
            except (Equipamento.DoesNotExist, IndexError):
                await update.message.reply_text(
                    "❌ Equipamento não encontrado!\n\n"
                    "Verifique o código e tente novamente, ou envie /cancelar."
                )
                return AGUARDANDO_QR_CODE
        else:
            await update.message.reply_text(
                "❌ Equipamento não encontrado!\n\n"
                "Verifique o código e tente novamente, ou envie /cancelar."
            )
            return AGUARDANDO_QR_CODE

    # Verificar se o usuário tem acesso ao equipamento
    if not await tem_acesso_equipamento(usuario, equipamento.id, tipo_usuario):
        await update.message.reply_text(
            f"❌ Você não tem autorização para operar o equipamento {equipamento.codigo}!\n\n"
            "Entre em contato com o administrador."
        )
        return ConversationHandler.END

    # Armazenar equipamento no contexto
    context.user_data['equipamento'] = equipamento

    # Buscar template de checklist do equipamento
    try:
        modelo = await get_modelo_checklist(equipamento.tipo)

        if not modelo:
            await update.message.reply_text(
                f"❌ Não há checklist configurado para o tipo de equipamento {equipamento.tipo.nome}!\n\n"
                "Entre em contato com o administrador."
            )
            return ConversationHandler.END

        context.user_data['modelo'] = modelo

        # Criar o checklist realizado
        checklist = await criar_checklist_realizado(modelo, equipamento, usuario, tipo_usuario)

        context.user_data['checklist'] = checklist
        context.user_data['itens'] = await get_itens_modelo(modelo)
        context.user_data['item_index'] = 0

        # Enviar primeira pergunta
        return await enviar_proxima_pergunta(update, context)

    except Exception as e:
        logger.error(f"Erro ao iniciar checklist: {e}")
        await update.message.reply_text(
            "❌ Erro ao iniciar checklist. Tente novamente mais tarde."
        )
        return ConversationHandler.END


async def enviar_proxima_pergunta(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Envia a próxima pergunta do checklist"""
    itens = context.user_data.get('itens', [])
    item_index = context.user_data.get('item_index', 0)
    equipamento = context.user_data.get('equipamento')

    if item_index >= len(itens):
        # Checklist concluído
        return await finalizar_checklist(update, context)

    item = itens[item_index]

    # Criar teclado de resposta
    keyboard = [
        [KeyboardButton("✅ Conforme"), KeyboardButton("❌ Não Conforme")],
        [KeyboardButton("⚠️ Não Aplicável"), KeyboardButton("🚫 Cancelar")]
    ]
    reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True, resize_keyboard=True)

    texto = (
        f"📋 Checklist: {equipamento.codigo}\n\n"
        f"Item {item_index + 1}/{len(itens)}:\n\n"
        f"*{item.pergunta}*\n\n"
        f"Categoria: {item.get_categoria_display()}"
    )

    if item.descricao_ajuda:
        texto += f"\n\n💡 {item.descricao_ajuda}"

    await update.message.reply_text(texto, reply_markup=reply_markup, parse_mode='Markdown')

    return AGUARDANDO_CHECKLIST


async def enviar_proxima_pergunta_callback(chat_id: int, context: ContextTypes.DEFAULT_TYPE):
    """Envia a próxima pergunta do checklist (versão para callback query)"""
    itens = context.user_data.get('itens', [])
    item_index = context.user_data.get('item_index', 0)
    equipamento = context.user_data.get('equipamento')

    if item_index >= len(itens):
        # Checklist concluído
        await finalizar_checklist_callback(chat_id, context)
        return

    item = itens[item_index]

    # Criar teclado de resposta
    keyboard = [
        [KeyboardButton("✅ Conforme"), KeyboardButton("❌ Não Conforme")],
        [KeyboardButton("⚠️ Não Aplicável"), KeyboardButton("🚫 Cancelar")]
    ]
    reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True, resize_keyboard=True)

    texto = (
        f"📋 Checklist: {equipamento.codigo}\n\n"
        f"Item {item_index + 1}/{len(itens)}:\n\n"
        f"*{item.pergunta}*\n\n"
        f"Categoria: {item.get_categoria_display()}"
    )

    if item.descricao_ajuda:
        texto += f"\n\n💡 {item.descricao_ajuda}"

    await context.bot.send_message(
        chat_id=chat_id,
        text=texto,
        reply_markup=reply_markup,
        parse_mode='Markdown'
    )


async def processar_resposta_checklist(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Processa a resposta de um item do checklist"""
    resposta = update.message.text.strip()

    logger.info(f"[PROCESSAR_CHECKLIST] Resposta recebida: '{resposta}'")
    logger.info(f"[PROCESSAR_CHECKLIST] user_data keys: {list(context.user_data.keys())}")

    if resposta == "🚫 Cancelar":
        checklist = context.user_data.get('checklist')
        if checklist:
            await cancelar_checklist_db(checklist)

        await update.message.reply_text(
            "Checklist cancelado.",
            reply_markup=ReplyKeyboardRemove()
        )
        return ConversationHandler.END

    # Mapear resposta
    mapa_resposta = {
        "✅ Conforme": "CONFORME",
        "❌ Não Conforme": "NAO_CONFORME",
        "⚠️ Não Aplicável": "NAO_APLICAVEL"
    }

    conformidade = mapa_resposta.get(resposta)

    if not conformidade:
        await update.message.reply_text("Resposta inválida. Use os botões fornecidos.")
        return AGUARDANDO_CHECKLIST

    # Salvar resposta
    itens = context.user_data.get('itens', [])
    item_index = context.user_data.get('item_index', 0)
    checklist = context.user_data.get('checklist')

    logger.info(f"[PROCESSAR_CHECKLIST] Itens: {len(itens)}, Index: {item_index}, Checklist: {checklist}")

    if not itens:
        logger.error(f"[PROCESSAR_CHECKLIST] ERRO: Lista de itens vazia!")
        await update.message.reply_text(
            "❌ Erro: Sessão expirada. Use /checklist para começar novamente.",
            reply_markup=ReplyKeyboardRemove()
        )
        return ConversationHandler.END

    if item_index >= len(itens):
        logger.error(f"[PROCESSAR_CHECKLIST] ERRO: Index {item_index} >= {len(itens)}")
        await update.message.reply_text(
            "❌ Erro: Índice inválido. Use /checklist para começar novamente.",
            reply_markup=ReplyKeyboardRemove()
        )
        return ConversationHandler.END

    item = itens[item_index]
    # Não acessar atributos do item aqui - pode causar query síncrona
    logger.info(f"[PROCESSAR_CHECKLIST] Processando item index {item_index}")

    await criar_resposta_item(checklist, item, conformidade)

    # Avançar para próximo item
    context.user_data['item_index'] = item_index + 1

    return await enviar_proxima_pergunta(update, context)


async def finalizar_checklist(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Finaliza o checklist e calcula o resultado"""
    checklist = context.user_data.get('checklist')

    if not checklist:
        await update.message.reply_text("Erro ao finalizar checklist.")
        return ConversationHandler.END

    # Finalizar checklist (usa o método do modelo que calcula tudo)
    dados = await finalizar_checklist_db(checklist)

    # Calcular estatísticas
    stats = await get_respostas_checklist(dados['checklist'])

    # Enviar resultado
    emoji_resultado = {
        'APROVADO': '✅',
        'APROVADO_RESTRICAO': '⚠️',
        'REPROVADO': '❌'
    }

    texto = (
        f"📋 *Checklist Concluído!*\n\n"
        f"Equipamento: {dados['equipamento_codigo']}\n"
        f"Data: {dados['data_hora_fim'].strftime('%d/%m/%Y %H:%M')}\n\n"
        f"*Resultado: {emoji_resultado.get(dados['resultado_geral'], '?')} {dados['resultado_geral_display']}*\n\n"
        f"Total de itens: {stats['total']}\n"
        f"✅ Conformes: {stats['conformes']}\n"
        f"❌ Não conformes: {stats['nao_conformes']}\n"
        f"⚠️ Não aplicáveis: {stats['nao_aplicaveis']}\n\n"
        "Obrigado por utilizar o sistema NR12! 🎯"
    )

    await update.message.reply_text(
        texto,
        parse_mode='Markdown',
        reply_markup=ReplyKeyboardRemove()
    )

    # Limpar contexto
    context.user_data.clear()

    return ConversationHandler.END


async def finalizar_checklist_callback(chat_id: int, context: ContextTypes.DEFAULT_TYPE):
    """Finaliza o checklist e calcula o resultado (versão para callback)"""
    checklist = context.user_data.get('checklist')

    if not checklist:
        await context.bot.send_message(chat_id, "Erro ao finalizar checklist.")
        return

    # Finalizar checklist
    checklist = await finalizar_checklist_db(checklist)

    # Calcular estatísticas
    stats = await get_respostas_checklist(checklist)

    # Enviar resultado
    emoji_resultado = {
        'APROVADO': '✅',
        'APROVADO_RESTRICAO': '⚠️',
        'REPROVADO': '❌'
    }

    texto = (
        f"📋 *Checklist Concluído!*\n\n"
        f"Equipamento: {checklist.equipamento.codigo}\n"
        f"Data: {checklist.data_hora_fim.strftime('%d/%m/%Y %H:%M')}\n\n"
        f"*Resultado: {emoji_resultado.get(checklist.resultado_geral, '?')} {checklist.get_resultado_geral_display()}*\n\n"
        f"Total de itens: {stats['total']}\n"
        f"✅ Conformes: {stats['conformes']}\n"
        f"❌ Não conformes: {stats['nao_conformes']}\n"
        f"⚠️ Não aplicáveis: {stats['nao_aplicaveis']}\n\n"
        "Obrigado por utilizar o sistema NR12! 🎯"
    )

    await context.bot.send_message(
        chat_id=chat_id,
        text=texto,
        parse_mode='Markdown',
        reply_markup=ReplyKeyboardRemove()
    )

    # Limpar contexto
    context.user_data.clear()


async def historico(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Mostra o histórico de checklists do operador"""
    chat_id = update.effective_chat.id

    try:
        operador = await get_operador_by_chat_id(chat_id)
        checklists = await get_historico_checklists(operador)

        if not checklists:
            await update.message.reply_text(
                "Você ainda não realizou nenhum checklist."
            )
            return

        texto = f"📋 Últimos {len(checklists)} Checklists:\n\n"

        emoji_resultado = {
            'APROVADO': '✅',
            'APROVADO_RESTRICAO': '⚠️',
            'REPROVADO': '❌'
        }

        for ck in checklists:
            texto += (
                f"{emoji_resultado.get(ck.resultado_geral, '?')} "
                f"{ck.equipamento.codigo} - "
                f"{ck.data_hora_fim.strftime('%d/%m/%Y')}\n"
                f"   {ck.get_resultado_geral_display()}\n\n"
            )

        await update.message.reply_text(texto)

    except Operador.DoesNotExist:
        await update.message.reply_text(
            "Você não está vinculado.\n\n"
            "Use /vincular para vincular sua conta."
        )


async def ajuda(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Mostra a lista de comandos disponíveis"""
    keyboard = [
        [InlineKeyboardButton("🏠 Menu Principal", callback_data='menu_start')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    texto = (
        "🤖 *Bot NR12 - Guia Completo*\n\n"
        "📱 *Comandos Disponíveis:*\n"
        "/start - Menu principal\n"
        "/vincular - Vincular sua conta\n"
        "/desvincular - Desvincular conta\n"
        "/equipamentos - Equipamentos autorizados\n"
        "/checklist - Realizar checklist NR12\n"
        "/abastecimento - Registrar abastecimento\n"
        "/historico - Histórico de inspeções\n"
        "/ajuda - Esta mensagem\n\n"
        "📋 *Como Usar o Sistema:*\n\n"
        "1️⃣ *Vinculação*\n"
        "   • Solicite código ao supervisor\n"
        "   • Use /vincular e digite o código\n"
        "   • Código válido por 24h\n\n"
        "2️⃣ *Realizar Checklist*\n"
        "   • Use /checklist\n"
        "   • Escaneie QR Code do equipamento\n"
        "   • Responda cada item do checklist\n"
        "   • Receba resultado imediato\n\n"
        "3️⃣ *Consultar Equipamentos*\n"
        "   • Use /equipamentos\n"
        "   • Veja todos os seus autorizados\n\n"
        "4️⃣ *Ver Histórico*\n"
        "   • Use /historico\n"
        "   • Últimos 10 checklists\n\n"
        "💡 *Dicas:*\n"
        "• Use os botões para navegação rápida\n"
        "• QR Codes facilitam a identificação\n"
        "• Sempre finalize os checklists\n\n"
        "❓ *Dúvidas?*\n"
        "Entre em contato com seu supervisor"
    )

    await update.message.reply_text(texto, reply_markup=reply_markup, parse_mode='Markdown')


# ============== HANDLERS DE ABASTECIMENTO ==============

async def abastecimento_inicio(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Inicia o processo de abastecimento via comando"""
    chat_id = update.effective_chat.id

    try:
        operador = await get_operador_by_chat_id(chat_id)
        context.user_data['operador'] = operador

        await update.message.reply_text(
            "⛽ *Registrar Abastecimento*\n\n"
            "Para registrar um abastecimento, escaneie o QR Code do equipamento ou digite o código.\n\n"
            "Envie /cancelar para cancelar.",
            parse_mode='Markdown'
        )

        return AGUARDANDO_QR_CODE

    except Operador.DoesNotExist:
        await update.message.reply_text(
            "Você não está vinculado.\n\n"
            "Use /vincular para vincular sua conta."
        )
        return ConversationHandler.END


async def abastecimento_via_callback(equipamento_id: int, chat_id: int, context: ContextTypes.DEFAULT_TYPE):
    """Inicia abastecimento diretamente de um equipamento via callback"""
    try:
        operador = await get_operador_by_chat_id(chat_id)
        equipamento = await get_equipamento_by_id(equipamento_id)

        # Verificar acesso
        tem_acesso = await tem_acesso_equipamento(operador, equipamento_id)
        if not tem_acesso:
            await context.bot.send_message(
                chat_id=chat_id,
                text="⚠️ Você não tem autorização para este equipamento."
            )
            return

        # Armazenar no contexto
        context.user_data['operador'] = operador
        context.user_data['equipamento_abast'] = equipamento

        # Buscar último abastecimento para sugestão
        ultimo = await get_ultimo_abastecimento(equipamento_id)

        texto_sugestao = ""
        if ultimo:
            texto_sugestao = f"\n💡 Última leitura: {ultimo.horimetro_km} ({ultimo.data.strftime('%d/%m/%Y')})"

        await context.bot.send_message(
            chat_id=chat_id,
            text=(
                f"⛽ *Registrar Abastecimento*\n\n"
                f"🚗 Equipamento: *{equipamento.codigo}*\n"
                f"📝 {equipamento.descricao or equipamento.modelo}\n\n"
                f"📊 Leitura atual no sistema: *{equipamento.leitura_atual}* {equipamento.get_tipo_medicao_display()}"
                f"{texto_sugestao}\n\n"
                f"Digite a leitura atual do {equipamento.get_tipo_medicao_display().lower()} no momento do abastecimento:\n\n"
                f"Envie /cancelar para cancelar."
            ),
            parse_mode='Markdown'
        )

        return AGUARDANDO_ABAST_LEITURA

    except Exception as e:
        logger.error(f"[ERRO] Ao iniciar abastecimento via callback: {e}")
        await context.bot.send_message(
            chat_id=chat_id,
            text="❌ Erro ao iniciar abastecimento. Tente novamente."
        )
        return ConversationHandler.END


async def abastecimento_leitura(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Processa a leitura do hodômetro/horímetro"""
    logger.info(f"[ABAST_LEITURA] Mensagem recebida: '{update.message.text}'")
    logger.info(f"[ABAST_LEITURA] user_data keys: {list(context.user_data.keys())}")

    try:
        leitura = Decimal(update.message.text.strip().replace(',', '.'))

        if leitura < 0:
            await update.message.reply_text(
                "❌ A leitura deve ser um número positivo!\n\n"
                "Digite novamente ou envie /cancelar."
            )
            return AGUARDANDO_ABAST_LEITURA

        equipamento = context.user_data.get('equipamento_abast')

        # Validar se leitura não é menor que a última
        if leitura < equipamento.leitura_atual:
            await update.message.reply_text(
                f"⚠️ *Atenção!*\n\n"
                f"A leitura informada ({leitura}) é MENOR que a última registrada ({equipamento.leitura_atual}).\n\n"
                f"Tem certeza? Digite a leitura novamente para confirmar, ou envie /cancelar.",
                parse_mode='Markdown'
            )

        context.user_data['abast_leitura'] = leitura

        await update.message.reply_text(
            f"✅ Leitura: *{leitura}* {equipamento.get_tipo_medicao_display()}\n\n"
            f"Agora, digite a quantidade de litros abastecidos:",
            parse_mode='Markdown'
        )

        return AGUARDANDO_ABAST_LITROS

    except (ValueError, InvalidOperation):
        await update.message.reply_text(
            "❌ Leitura inválida! Digite apenas números.\n\n"
            "Exemplo: 12500 ou 1250.5\n\n"
            "Digite novamente ou envie /cancelar."
        )
        return AGUARDANDO_ABAST_LEITURA


async def abastecimento_litros(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Processa a quantidade de litros"""
    try:
        litros = Decimal(update.message.text.strip().replace(',', '.'))

        if litros <= 0:
            await update.message.reply_text(
                "❌ A quantidade deve ser maior que zero!\n\n"
                "Digite novamente ou envie /cancelar."
            )
            return AGUARDANDO_ABAST_LITROS

        if litros > 1000:
            await update.message.reply_text(
                "⚠️ *Atenção!*\n\n"
                f"Quantidade muito alta: {litros}L\n\n"
                "Verifique se digitou corretamente. Digite novamente ou envie /cancelar.",
                parse_mode='Markdown'
            )
            return AGUARDANDO_ABAST_LITROS

        context.user_data['abast_litros'] = litros

        await update.message.reply_text(
            f"✅ Quantidade: *{litros}L*\n\n"
            f"Agora, digite o valor total pago (R$):",
            parse_mode='Markdown'
        )

        return AGUARDANDO_ABAST_VALOR

    except (ValueError, InvalidOperation):
        await update.message.reply_text(
            "❌ Quantidade inválida! Digite apenas números.\n\n"
            "Exemplo: 50 ou 50.5\n\n"
            "Digite novamente ou envie /cancelar."
        )
        return AGUARDANDO_ABAST_LITROS


async def abastecimento_valor(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Processa o valor total"""
    try:
        valor = Decimal(update.message.text.strip().replace(',', '.').replace('R$', '').strip())

        if valor <= 0:
            await update.message.reply_text(
                "❌ O valor deve ser maior que zero!\n\n"
                "Digite novamente ou envie /cancelar."
            )
            return AGUARDANDO_ABAST_VALOR

        context.user_data['abast_valor'] = valor

        # Calcular valor por litro
        litros = context.user_data['abast_litros']
        valor_litro = valor / litros

        # Teclado para escolher tipo de combustível
        keyboard = [
            [KeyboardButton("⚫ Diesel"), KeyboardButton("🟢 Gasolina")],
            [KeyboardButton("🔵 Etanol"), KeyboardButton("🟡 GNV")],
            [KeyboardButton("⚪ Outro"), KeyboardButton("🚫 Cancelar")]
        ]
        reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True, resize_keyboard=True)

        await update.message.reply_text(
            f"✅ Valor total: *R$ {valor:.2f}*\n"
            f"💰 Valor por litro: *R$ {valor_litro:.3f}*\n\n"
            f"Selecione o tipo de combustível:",
            parse_mode='Markdown',
            reply_markup=reply_markup
        )

        return AGUARDANDO_ABAST_TIPO

    except (ValueError, InvalidOperation):
        await update.message.reply_text(
            "❌ Valor inválido! Digite apenas números.\n\n"
            "Exemplo: 250 ou 250.50\n\n"
            "Digite novamente ou envie /cancelar."
        )
        return AGUARDANDO_ABAST_VALOR


async def abastecimento_tipo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Processa o tipo de combustível e finaliza"""
    resposta = update.message.text.strip()

    if resposta == "🚫 Cancelar":
        await update.message.reply_text(
            "Abastecimento cancelado.",
            reply_markup=ReplyKeyboardRemove()
        )
        return ConversationHandler.END

    # Mapear resposta
    mapa_tipo = {
        "⚫ Diesel": "DIESEL",
        "🟢 Gasolina": "GASOLINA",
        "🔵 Etanol": "ETANOL",
        "🟡 GNV": "GNV",
        "⚪ Outro": "OUTRO"
    }

    tipo = mapa_tipo.get(resposta)

    if not tipo:
        await update.message.reply_text(
            "❌ Tipo inválido! Use os botões fornecidos.",
            reply_markup=ReplyKeyboardRemove()
        )
        return AGUARDANDO_ABAST_TIPO

    # Registrar abastecimento
    try:
        equipamento = context.user_data['equipamento_abast']
        operador = context.user_data['operador']
        leitura = context.user_data['abast_leitura']
        litros = context.user_data['abast_litros']
        valor = context.user_data['abast_valor']

        abastecimento = await criar_abastecimento(
            equipamento.id,
            operador.id,
            leitura,
            litros,
            valor,
            tipo
        )

        valor_litro = valor / litros

        await update.message.reply_text(
            f"✅ *Abastecimento Registrado!*\n\n"
            f"🚗 Equipamento: {equipamento.codigo}\n"
            f"📊 Leitura: {leitura} {equipamento.get_tipo_medicao_display()}\n"
            f"⛽ Combustível: {abastecimento.get_tipo_combustivel_display()}\n"
            f"📦 Quantidade: {litros}L\n"
            f"💰 Valor total: R$ {valor:.2f}\n"
            f"💵 Valor/litro: R$ {valor_litro:.3f}\n"
            f"📅 Data: {abastecimento.data.strftime('%d/%m/%Y')}\n\n"
            f"Obrigado por registrar! 🎯",
            parse_mode='Markdown',
            reply_markup=ReplyKeyboardRemove()
        )

        # Limpar contexto
        context.user_data.clear()

        return ConversationHandler.END

    except Exception as e:
        logger.error(f"[ERRO] Ao criar abastecimento: {e}")
        await update.message.reply_text(
            "❌ Erro ao registrar abastecimento. Tente novamente mais tarde.",
            reply_markup=ReplyKeyboardRemove()
        )
        return ConversationHandler.END


# ========================================
# Handlers de Manutenção
# ========================================

async def manutencao_horimetro(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Processa o horímetro da manutenção"""
    try:
        horimetro = Decimal(update.message.text.strip().replace(',', '.'))

        if horimetro < 0:
            await update.message.reply_text(
                "❌ O horímetro deve ser um número positivo!\n\n"
                "Digite novamente ou envie /cancelar."
            )
            return AGUARDANDO_MANUT_HORIMETRO

        context.user_data['manut_horimetro'] = horimetro

        await update.message.reply_text(
            f"✅ Horímetro: *{horimetro}*\n\n"
            f"📝 Agora, descreva a manutenção realizada:",
            parse_mode='Markdown'
        )

        return AGUARDANDO_MANUT_DESCRICAO

    except (ValueError, InvalidOperation):
        await update.message.reply_text(
            "❌ Horímetro inválido! Digite apenas números.\n\n"
            "Exemplo: 12500 ou 1250.5\n\n"
            "Digite novamente ou envie /cancelar."
        )
        return AGUARDANDO_MANUT_HORIMETRO


async def manutencao_descricao(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Processa a descrição da manutenção"""
    descricao = update.message.text.strip()

    if len(descricao) < 10:
        await update.message.reply_text(
            "⚠️ A descrição deve ter pelo menos 10 caracteres.\n\n"
            "Digite novamente ou envie /cancelar."
        )
        return AGUARDANDO_MANUT_DESCRICAO

    context.user_data['manut_descricao'] = descricao

    keyboard = [
        [KeyboardButton("➡️ Pular (sem observações)")],
        [KeyboardButton("🚫 Cancelar")]
    ]
    reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True, resize_keyboard=True)

    await update.message.reply_text(
        f"✅ Descrição registrada!\n\n"
        f"📌 Deseja adicionar observações adicionais?\n\n"
        f"Digite as observações ou clique em 'Pular':",
        reply_markup=reply_markup
    )

    return AGUARDANDO_MANUT_OBSERVACOES


async def manutencao_observacoes(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Processa as observações e finaliza a manutenção"""
    resposta = update.message.text.strip()

    if resposta == "🚫 Cancelar":
        await update.message.reply_text(
            "Manutenção cancelada.",
            reply_markup=ReplyKeyboardRemove()
        )
        context.user_data.clear()
        return ConversationHandler.END

    observacoes = '' if resposta == "➡️ Pular (sem observações)" else resposta
    context.user_data['manut_observacoes'] = observacoes

    # Finalizar manutenção direto (tanto preventiva quanto corretiva)
    return await finalizar_manutencao(update, context)


async def finalizar_manutencao(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Finaliza e salva a manutenção"""
    try:
        chat_id = update.effective_chat.id
        usuario, tipo_usuario = await get_usuario_by_chat_id(chat_id)

        equipamento_id = context.user_data['manut_equipamento_id']
        tipo = context.user_data['manut_tipo']
        horimetro = context.user_data['manut_horimetro']
        descricao = context.user_data['manut_descricao']
        observacoes = context.user_data.get('manut_observacoes', '')

        equipamento = await get_equipamento_by_id(equipamento_id)

        manutencao = await criar_manutencao(
            equipamento_id,
            usuario.id,
            tipo,
            horimetro,
            descricao,
            observacoes
        )

        tipo_emoji = '🔧' if tipo == 'PREVENTIVA' else '⚠️'
        tipo_texto = 'Preventiva' if tipo == 'PREVENTIVA' else 'Corretiva'

        texto = (
            f"✅ *Manutenção Registrada com Sucesso!*\n\n"
            f"{tipo_emoji} *Tipo:* {tipo_texto}\n"
            f"🚗 *Equipamento:* {equipamento.codigo}\n"
            f"⏱️ *Horímetro:* {horimetro}\n"
            f"📅 *Data:* {manutencao.data.strftime('%d/%m/%Y')}\n\n"
            f"📝 *Descrição:*\n{descricao}\n"
        )

        if observacoes:
            texto += f"\n📌 *Observações:*\n{observacoes}\n"

        texto += "\n✅ Manutenção registrada no sistema!"

        await update.message.reply_text(
            texto,
            parse_mode='Markdown',
            reply_markup=ReplyKeyboardRemove()
        )

        # Limpar contexto
        context.user_data.clear()

        return ConversationHandler.END

    except Exception as e:
        logger.error(f"[ERRO] Ao criar manutenção: {e}")
        await update.message.reply_text(
            "❌ Erro ao registrar manutenção. Tente novamente mais tarde.",
            reply_markup=ReplyKeyboardRemove()
        )
        context.user_data.clear()
        return ConversationHandler.END


async def processar_qr_code(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Detecta e processa QR codes escaneados (equipamento ou empreendimento)"""
    chat_id = update.effective_chat.id
    texto = update.message.text.strip()

    logger.info(f"[QR_CODE] Mensagem recebida: {texto}")

    try:
        # Detectar tipo de usuário (operador, supervisor ou técnico)
        usuario, tipo_usuario = await get_usuario_by_chat_id(chat_id)

        # Detectar tipo de QR code
        if texto.startswith('eq:'):
            # QR Code de equipamento
            uuid = texto.split(':', 1)[1]
            try:
                equipamento = await get_equipamento_by_uuid(uuid)

                # Verificar acesso
                tem_acesso = await tem_acesso_equipamento(usuario, equipamento.id, tipo_usuario)

                if not tem_acesso:
                    await update.message.reply_text(
                        f"⚠️ Você não tem autorização para o equipamento *{equipamento.codigo}*\n\n"
                        "Entre em contato com o supervisor.",
                        parse_mode='Markdown'
                    )
                    return

                # Mostrar menu do equipamento (diferente para técnico)
                if tipo_usuario == 'tecnico':
                    # Técnico: Checklist + Manutenção
                    keyboard = [
                        [InlineKeyboardButton("📋 Fazer Checklist", callback_data=f'checklist_equipamento_{equipamento.id}')],
                        [InlineKeyboardButton("🔧 Registrar Manutenção", callback_data=f'manutencao_equipamento_{equipamento.id}')],
                        [
                            InlineKeyboardButton("📊 Ver Histórico", callback_data=f'historico_equipamento_{equipamento.id}'),
                            InlineKeyboardButton("📍 Ver QR Code", callback_data=f'qrcode_equipamento_{equipamento.id}')
                        ],
                        [InlineKeyboardButton("🏠 Menu Principal", callback_data='menu_start')]
                    ]
                else:
                    # Operador/Supervisor: Apenas Checklist
                    keyboard = [
                        [InlineKeyboardButton("📋 Fazer Checklist", callback_data=f'checklist_equipamento_{equipamento.id}')],
                        [
                            InlineKeyboardButton("📊 Ver Histórico", callback_data=f'historico_equipamento_{equipamento.id}'),
                            InlineKeyboardButton("📍 Ver QR Code", callback_data=f'qrcode_equipamento_{equipamento.id}')
                        ],
                        [InlineKeyboardButton("🏠 Menu Principal", callback_data='menu_start')]
                    ]
                reply_markup = InlineKeyboardMarkup(keyboard)

                texto_resposta = (
                    f"🚗 *Equipamento Detectado!*\n\n"
                    f"🏭 *Código:* `{equipamento.codigo}`\n"
                    f"📝 *Descrição:* {equipamento.descricao or 'N/A'}\n"
                    f"⚙️ *Tipo:* {equipamento.tipo.nome}\n"
                    f"🏭 *Fabricante:* {equipamento.fabricante or 'N/A'}\n"
                    f"🔧 *Modelo:* {equipamento.modelo or 'N/A'}\n\n"
                    f"📍 *Localização:*\n"
                    f"   Empreendimento: {equipamento.empreendimento.nome}\n"
                    f"   Cliente: {equipamento.cliente.nome_razao}\n\n"
                    f"Escolha uma ação:"
                )

                await update.message.reply_text(texto_resposta, reply_markup=reply_markup, parse_mode='Markdown')

            except Equipamento.DoesNotExist:
                await update.message.reply_text(
                    "❌ Equipamento não encontrado!\n\n"
                    "Verifique se o QR Code está correto."
                )

        elif texto.startswith('emp:'):
            # QR Code de empreendimento
            uuid = texto.split(':', 1)[1]
            try:
                empreendimento = await get_empreendimento_by_uuid(uuid)

                # Buscar equipamentos do empreendimento que o usuário tem acesso
                equipamentos_emp = await get_equipamentos_autorizados(usuario, tipo_usuario)

                if not equipamentos_emp:
                    await update.message.reply_text(
                        f"📍 *Empreendimento: {empreendimento.nome}*\n\n"
                        f"❌ Você não tem equipamentos autorizados neste empreendimento.\n\n"
                        f"Entre em contato com o supervisor.",
                        parse_mode='Markdown'
                    )
                    return

                # Criar botões para cada equipamento
                keyboard = []
                for eq in equipamentos_emp:
                    button_text = f"🚗 {eq.codigo}"
                    if eq.descricao:
                        button_text += f" - {eq.descricao[:20]}"
                    elif eq.modelo:
                        button_text += f" - {eq.modelo[:20]}"

                    keyboard.append([
                        InlineKeyboardButton(button_text, callback_data=f'ver_equipamento_{eq.id}')
                    ])

                keyboard.append([InlineKeyboardButton("🏠 Menu Principal", callback_data='menu_start')])
                reply_markup = InlineKeyboardMarkup(keyboard)

                texto_resposta = (
                    f"📍 *Empreendimento Detectado!*\n\n"
                    f"🏢 *Nome:* {empreendimento.nome}\n"
                    f"🏭 *Cliente:* {empreendimento.cliente.nome_razao}\n"
                    f"📊 *Tipo:* {empreendimento.get_tipo_display()}\n\n"
                    f"📋 *Equipamentos Disponíveis:* {len(equipamentos_emp)}\n\n"
                    f"Selecione um equipamento:"
                )

                await update.message.reply_text(texto_resposta, reply_markup=reply_markup, parse_mode='Markdown')

            except Exception as e:
                logger.error(f"[ERRO] Ao buscar empreendimento: {e}")
                await update.message.reply_text(
                    "❌ Empreendimento não encontrado!\n\n"
                    "Verifique se o QR Code está correto."
                )

    except Operador.DoesNotExist:
        await update.message.reply_text(
            "⚠️ Você precisa vincular sua conta primeiro!\n\n"
            "Use /vincular para vincular sua conta."
        )


async def callback_checklist_equipamento(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Entry point para checklist via callback (botão)"""
    query = update.callback_query
    await query.answer()

    chat_id = query.message.chat_id
    equipamento_id = int(query.data.split('_')[2])

    logger.info(f"[CALLBACK_CHECKLIST] Iniciando - Chat: {chat_id}, Equipamento: {equipamento_id}")

    try:
        usuario, tipo_usuario = await get_usuario_by_chat_id(chat_id)
        equipamento = await get_equipamento_by_id(equipamento_id)

        # Verificar acesso
        tem_acesso = await tem_acesso_equipamento(usuario, equipamento_id, tipo_usuario)
        if not tem_acesso:
            logger.warning(f"[CALLBACK_CHECKLIST] Sem acesso - Chat: {chat_id}")
            await query.edit_message_text("⚠️ Você não tem autorização para este equipamento.")
            return ConversationHandler.END

        # Buscar modelo
        modelo = await get_modelo_checklist(equipamento.tipo)
        if not modelo:
            logger.warning(f"[CALLBACK_CHECKLIST] Sem modelo - Tipo: {equipamento.tipo.nome}")
            await query.edit_message_text(
                f"❌ Não há checklist configurado para {equipamento.tipo.nome}!",
                parse_mode='Markdown'
            )
            return ConversationHandler.END

        # Armazenar no contexto
        context.user_data['usuario'] = usuario
        context.user_data['tipo_usuario'] = tipo_usuario
        context.user_data['operador'] = usuario  # compatibilidade
        context.user_data['equipamento'] = equipamento
        context.user_data['modelo'] = modelo

        # Criar checklist
        checklist = await criar_checklist_realizado(modelo, equipamento, usuario, tipo_usuario)
        context.user_data['checklist'] = checklist
        context.user_data['itens'] = await get_itens_modelo(modelo)
        context.user_data['item_index'] = 0

        logger.info(f"[CALLBACK_CHECKLIST] Checklist criado - ID: {checklist.id}, Itens: {len(context.user_data['itens'])}")

        # Deletar mensagem com botões
        await query.message.delete()

        # Enviar mensagem de início
        itens = context.user_data['itens']
        await context.bot.send_message(
            chat_id=chat_id,
            text=(
                f"📋 *Checklist Iniciado!*\n\n"
                f"🚗 Equipamento: *{equipamento.codigo}*\n"
                f"📝 Descrição: {equipamento.descricao or equipamento.modelo}\n"
                f"⚙️ Tipo: {equipamento.tipo.nome}\n\n"
                f"Total de itens: {len(itens)}\n\n"
                f"Vamos começar! ⬇️"
            ),
            parse_mode='Markdown'
        )

        # Enviar primeira pergunta
        await enviar_proxima_pergunta_callback(chat_id, context)

        logger.info(f"[CALLBACK_CHECKLIST] Retornando estado AGUARDANDO_CHECKLIST")
        return AGUARDANDO_CHECKLIST

    except Exception as e:
        logger.error(f"[ERRO] Ao iniciar checklist via callback: {e}")
        import traceback
        traceback.print_exc()
        await context.bot.send_message(chat_id, "❌ Erro ao iniciar checklist.")
        return ConversationHandler.END


async def callback_abastecimento_equipamento(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Entry point para abastecimento via callback (botão)"""
    query = update.callback_query
    await query.answer()

    chat_id = query.message.chat_id
    equipamento_id = int(query.data.split('_')[2])

    # Deletar mensagem com botões
    await query.message.delete()

    # Chamar função de abastecimento
    return await abastecimento_via_callback(equipamento_id, chat_id, context)


async def callback_query_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handler para processar cliques nos botões inline"""
    query = update.callback_query
    await query.answer()  # Responder ao callback para remover o "loading"

    chat_id = query.message.chat_id
    action = query.data

    logger.info(f"[CALLBACK] Botão clicado: {action} (chat_id: {chat_id})")

    # Menu Start
    if action == 'menu_start':
        try:
            usuario, tipo_usuario = await get_usuario_by_chat_id(chat_id)

            # Emoji baseado no tipo
            emoji_tipo = {
                'operador': '👷',
                'supervisor': '👔',
                'tecnico': '🔧'
            }.get(tipo_usuario, '👤')

            tipo_texto = {
                'operador': 'Operador',
                'supervisor': 'Supervisor',
                'tecnico': 'Técnico'
            }.get(tipo_usuario, 'Usuário')

            # Menu diferente para técnicos
            if tipo_usuario == 'tecnico':
                keyboard = [
                    [
                        InlineKeyboardButton("🔧 Meus Equipamentos", callback_data='menu_equipamentos'),
                        InlineKeyboardButton("🛠️ Manutenções", callback_data='menu_manutencoes')
                    ],
                    [
                        InlineKeyboardButton("📋 Ordens de Serviço", callback_data='menu_ordens_servico'),
                        InlineKeyboardButton("📊 Histórico", callback_data='menu_historico')
                    ],
                    [
                        InlineKeyboardButton("❓ Ajuda", callback_data='menu_ajuda'),
                        InlineKeyboardButton("🔗 Desvincular Conta", callback_data='menu_desvincular')
                    ]
                ]
            else:
                keyboard = [
                    [
                        InlineKeyboardButton("📋 Realizar Checklist", callback_data='menu_checklist'),
                        InlineKeyboardButton("🔧 Meus Equipamentos", callback_data='menu_equipamentos')
                    ],
                    [
                        InlineKeyboardButton("📊 Histórico", callback_data='menu_historico'),
                        InlineKeyboardButton("❓ Ajuda", callback_data='menu_ajuda')
                    ],
                    [
                        InlineKeyboardButton("🔗 Desvincular Conta", callback_data='menu_desvincular')
                    ]
                ]
            reply_markup = InlineKeyboardMarkup(keyboard)

            nome = usuario.nome_completo if hasattr(usuario, 'nome_completo') else usuario.nome

            texto = (
                f"🎯 *Bem-vindo ao Sistema NR12!*\n\n"
                f"Olá, *{nome}*! {emoji_tipo}\n\n"
                f"✅ Conta vinculada como *{tipo_texto}*\n"
                f"🆔 Chat ID: `{chat_id}`\n\n"
                f"Escolha uma opção abaixo:"
            )
            await query.edit_message_text(texto, reply_markup=reply_markup, parse_mode='Markdown')

        except Exception:
            keyboard = [
                [InlineKeyboardButton("🔗 Vincular Conta", callback_data='menu_vincular')],
                [InlineKeyboardButton("❓ Como Funciona?", callback_data='menu_ajuda')]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)

            texto = (
                f"👋 *Olá!*\n\n"
                f"🤖 Bem-vindo ao *Bot NR12*\n"
                f"Sistema de Gestão de Equipamentos e Segurança do Trabalho\n\n"
                f"⚠️ Você ainda não está vinculado ao sistema.\n\n"
                f"Para começar, você precisa:\n"
                f"1️⃣ Solicitar um código de vinculação ao supervisor\n"
                f"2️⃣ Clicar no botão abaixo e inserir o código\n\n"
                f"👇 Escolha uma opção:"
            )
            await query.edit_message_text(texto, reply_markup=reply_markup, parse_mode='Markdown')

    # Menu Vincular
    elif action == 'menu_vincular':
        keyboard = [
            [InlineKeyboardButton("🏠 Voltar", callback_data='menu_start')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        texto = (
            "🔗 *Vincular Conta*\n\n"
            "Para vincular sua conta, você precisa de um código de 8 dígitos.\n\n"
            "📝 *Como obter o código:*\n"
            "1. Entre em contato com seu supervisor\n"
            "2. Solicite um código de vinculação\n"
            "3. O código é válido por 24 horas\n\n"
            "💡 *Como usar:*\n"
            "Digite o comando:\n"
            "`/vincular`\n\n"
            "Em seguida, digite o código de 8 dígitos quando solicitado."
        )
        await query.edit_message_text(texto, reply_markup=reply_markup, parse_mode='Markdown')

    # Menu Checklist
    elif action == 'menu_checklist':
        keyboard = [
            [InlineKeyboardButton("🏠 Menu Principal", callback_data='menu_start')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        texto = (
            "📋 *Realizar Checklist NR12*\n\n"
            "Para iniciar um checklist, você precisará:\n\n"
            "1️⃣ Estar próximo ao equipamento\n"
            "2️⃣ Ter o QR Code do equipamento\n"
            "3️⃣ Estar autorizado a operar o equipamento\n\n"
            "💡 *Como fazer:*\n"
            "Digite o comando:\n"
            "`/checklist`\n\n"
            "Em seguida:\n"
            "• Escaneie o QR Code, OU\n"
            "• Digite o código do equipamento\n\n"
            "⚠️ *Importante:*\n"
            "• Responda todas as perguntas\n"
            "• Seja honesto nas respostas\n"
            "• Não pule itens de segurança\n"
            "• O resultado é registrado no sistema"
        )
        await query.edit_message_text(texto, reply_markup=reply_markup, parse_mode='Markdown')

    # Menu Equipamentos
    elif action == 'menu_equipamentos':
        try:
            usuario, tipo_usuario = await get_usuario_by_chat_id(chat_id)
            equipamentos_list = await get_equipamentos_autorizados(usuario, tipo_usuario)

            if not equipamentos_list:
                keyboard = [
                    [InlineKeyboardButton("🏠 Menu Principal", callback_data='menu_start')]
                ]
                reply_markup = InlineKeyboardMarkup(keyboard)
                texto = (
                    "🔧 *Meus Equipamentos*\n\n"
                    "❌ Você ainda não tem equipamentos autorizados.\n\n"
                    "Entre em contato com o supervisor para solicitar autorização."
                )
            else:
                # Criar botões para cada equipamento
                keyboard = []

                for eq in equipamentos_list:
                    # Texto do botão: código + descrição (limitado a 30 caracteres)
                    button_text = f"🚗 {eq.codigo}"
                    if eq.descricao:
                        button_text += f" - {eq.descricao[:20]}"
                    elif eq.modelo:
                        button_text += f" - {eq.modelo[:20]}"

                    # Callback data com ID do equipamento
                    keyboard.append([
                        InlineKeyboardButton(button_text, callback_data=f'ver_equipamento_{eq.id}')
                    ])

                # Botão voltar
                keyboard.append([
                    InlineKeyboardButton("🏠 Menu Principal", callback_data='menu_start')
                ])

                reply_markup = InlineKeyboardMarkup(keyboard)

                texto = (
                    f"🔧 *Meus Equipamentos Autorizados*\n\n"
                    f"📊 Total: {len(equipamentos_list)} equipamento(s)\n\n"
                    f"Selecione um equipamento para ver detalhes:"
                )

            await query.edit_message_text(texto, reply_markup=reply_markup, parse_mode='Markdown')

        except Operador.DoesNotExist:
            keyboard = [
                [InlineKeyboardButton("🔗 Vincular Conta", callback_data='menu_vincular')],
                [InlineKeyboardButton("🏠 Menu Principal", callback_data='menu_start')]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            texto = "⚠️ Você precisa vincular sua conta primeiro!"
            await query.edit_message_text(texto, reply_markup=reply_markup)

    # Menu Histórico
    elif action == 'menu_historico':
        try:
            usuario, tipo_usuario = await get_usuario_by_chat_id(chat_id)
            checklists = await get_historico_checklists(usuario)

            keyboard = [
                [InlineKeyboardButton("🏠 Menu Principal", callback_data='menu_start')]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)

            if not checklists:
                texto = (
                    "📊 *Histórico de Checklists*\n\n"
                    "📋 Você ainda não realizou nenhum checklist.\n\n"
                    "Use /checklist para fazer sua primeira inspeção!"
                )
            else:
                texto = f"📊 *Últimos {len(checklists)} Checklists*\n\n"

                emoji_resultado = {
                    'APROVADO': '✅',
                    'APROVADO_RESTRICAO': '⚠️',
                    'REPROVADO': '❌'
                }

                for ck in checklists:
                    texto += (
                        f"{emoji_resultado.get(ck.resultado_geral, '?')} "
                        f"*{ck.equipamento.codigo}*\n"
                        f"📅 {ck.data_hora_fim.strftime('%d/%m/%Y às %H:%M')}\n"
                        f"📊 {ck.get_resultado_geral_display()}\n"
                        f"{'─' * 30}\n\n"
                    )

            await query.edit_message_text(texto, reply_markup=reply_markup, parse_mode='Markdown')

        except Exception:
            keyboard = [
                [InlineKeyboardButton("🔗 Vincular Conta", callback_data='menu_vincular')],
                [InlineKeyboardButton("🏠 Menu Principal", callback_data='menu_start')]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            texto = "⚠️ Você precisa vincular sua conta primeiro!"
            await query.edit_message_text(texto, reply_markup=reply_markup)

    # Menu Ajuda
    elif action == 'menu_ajuda':
        keyboard = [
            [InlineKeyboardButton("🏠 Menu Principal", callback_data='menu_start')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        texto = (
            "🤖 *Bot NR12 - Guia Completo*\n\n"
            "📱 *Comandos Disponíveis:*\n"
            "/start - Menu principal\n"
            "/vincular - Vincular sua conta\n"
            "/desvincular - Desvincular conta\n"
            "/equipamentos - Equipamentos autorizados\n"
            "/checklist - Realizar checklist NR12\n"
            "/abastecimento - Registrar abastecimento\n"
            "/historico - Histórico de inspeções\n"
            "/ajuda - Esta mensagem\n\n"
            "📋 *Como Usar o Sistema:*\n\n"
            "1️⃣ *Vinculação*\n"
            "   • Solicite código ao supervisor\n"
            "   • Use /vincular e digite o código\n"
            "   • Código válido por 24h\n\n"
            "2️⃣ *Realizar Checklist*\n"
            "   • Use /checklist\n"
            "   • Escaneie QR Code do equipamento\n"
            "   • Responda cada item do checklist\n"
            "   • Receba resultado imediato\n\n"
            "3️⃣ *Registrar Abastecimento*\n"
            "   • Use /abastecimento OU\n"
            "   • Clique no botão do equipamento\n"
            "   • Informe leitura, litros e valor\n"
            "   • Registro automático no sistema\n\n"
            "4️⃣ *Consultar Equipamentos*\n"
            "   • Use /equipamentos\n"
            "   • Veja todos os seus autorizados\n\n"
            "5️⃣ *Ver Histórico*\n"
            "   • Use /historico\n"
            "   • Últimos 10 checklists\n\n"
            "💡 *Dicas:*\n"
            "• Use os botões para navegação rápida\n"
            "• QR Codes facilitam a identificação\n"
            "• Sempre finalize os checklists\n\n"
            "❓ *Dúvidas?*\n"
            "Entre em contato com seu supervisor"
        )
        await query.edit_message_text(texto, reply_markup=reply_markup, parse_mode='Markdown')

    # Menu Desvincular
    elif action == 'menu_desvincular':
        keyboard = [
            [
                InlineKeyboardButton("✅ Sim, Desvincular", callback_data='confirmar_desvincular'),
                InlineKeyboardButton("❌ Cancelar", callback_data='menu_start')
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        texto = (
            "🔗 *Desvincular Conta*\n\n"
            "⚠️ *Atenção!*\n\n"
            "Ao desvincular sua conta:\n"
            "• Você perderá acesso ao sistema\n"
            "• Precisará de um novo código para vincular novamente\n"
            "• Seu histórico será mantido\n\n"
            "Tem certeza que deseja continuar?"
        )
        await query.edit_message_text(texto, reply_markup=reply_markup, parse_mode='Markdown')

    # Confirmar Desvincular
    elif action == 'confirmar_desvincular':
        try:
            usuario, tipo_usuario = await get_usuario_by_chat_id(chat_id)
            nome = await desvincular_usuario_telegram(usuario, tipo_usuario)

            keyboard = [
                [InlineKeyboardButton("🔗 Vincular Novamente", callback_data='menu_vincular')]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)

            texto = (
                f"✅ *Conta Desvinculada!*\n\n"
                f"Até logo, {nome}! 👋\n\n"
                f"Você foi desvinculado do sistema com sucesso.\n\n"
                f"Para voltar a usar o bot, você precisará vincular novamente com um novo código."
            )
            await query.edit_message_text(texto, reply_markup=reply_markup, parse_mode='Markdown')

        except Exception:
            keyboard = [
                [InlineKeyboardButton("🏠 Menu Principal", callback_data='menu_start')]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            texto = "⚠️ Você não está vinculado."
            await query.edit_message_text(texto, reply_markup=reply_markup)

    # Menu Manutenções
    elif action == 'menu_manutencoes':
        try:
            usuario, tipo_usuario = await get_usuario_by_chat_id(chat_id)

            if tipo_usuario != 'tecnico':
                await query.edit_message_text("⚠️ Esta funcionalidade é apenas para técnicos.")
                return

            keyboard = [
                [InlineKeyboardButton("➕ Registrar Manutenção", callback_data='nova_manutencao')],
                [InlineKeyboardButton("📋 Minhas Manutenções", callback_data='listar_manutencoes')],
                [InlineKeyboardButton("🏠 Menu Principal", callback_data='menu_start')]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)

            texto = (
                "🛠️ *Manutenções*\n\n"
                "Gerencie as manutenções dos equipamentos:\n\n"
                "➕ *Registrar Manutenção*\n"
                "   Cadastre uma nova manutenção realizada\n\n"
                "📋 *Minhas Manutenções*\n"
                "   Visualize suas últimas manutenções\n\n"
                "Escolha uma opção:"
            )
            await query.edit_message_text(texto, reply_markup=reply_markup, parse_mode='Markdown')

        except Exception as e:
            logger.error(f"Erro menu_manutencoes: {e}")
            await query.edit_message_text("⚠️ Erro ao carregar menu de manutenções.")

    # Menu Ordens de Serviço
    elif action == 'menu_ordens_servico':
        try:
            usuario, tipo_usuario = await get_usuario_by_chat_id(chat_id)

            if tipo_usuario != 'tecnico':
                await query.edit_message_text("⚠️ Esta funcionalidade é apenas para técnicos.")
                return

            keyboard = [
                [InlineKeyboardButton("📋 Minhas OS Abertas", callback_data='listar_os_abertas')],
                [InlineKeyboardButton("✅ Minhas OS Concluídas", callback_data='listar_os_concluidas')],
                [InlineKeyboardButton("🏠 Menu Principal", callback_data='menu_start')]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)

            texto = (
                "📋 *Ordens de Serviço*\n\n"
                "Gerencie suas ordens de serviço:\n\n"
                "📋 *OS Abertas*\n"
                "   Visualize e finalize OS em andamento\n\n"
                "✅ *OS Concluídas*\n"
                "   Histórico de OS finalizadas\n\n"
                "Escolha uma opção:"
            )
            await query.edit_message_text(texto, reply_markup=reply_markup, parse_mode='Markdown')

        except Exception as e:
            logger.error(f"Erro menu_ordens_servico: {e}")
            await query.edit_message_text("⚠️ Erro ao carregar menu de OS.")

    # Listar OS Abertas
    elif action == 'listar_os_abertas':
        try:
            usuario, tipo_usuario = await get_usuario_by_chat_id(chat_id)

            if tipo_usuario != 'tecnico':
                await query.edit_message_text("⚠️ Esta funcionalidade é apenas para técnicos.")
                return

            # Buscar OS abertas (ABERTA ou EM_EXECUCAO)
            ordens = await get_ordens_servico_tecnico(usuario.id)
            ordens_abertas = [os for os in ordens if os.status in ['ABERTA', 'EM_EXECUCAO']]

            if not ordens_abertas:
                keyboard = [
                    [InlineKeyboardButton("🔙 Voltar", callback_data='menu_ordens_servico')]
                ]
                reply_markup = InlineKeyboardMarkup(keyboard)
                texto = "📋 *Ordens de Serviço Abertas*\n\n✅ Você não possui OS abertas no momento."
                await query.edit_message_text(texto, reply_markup=reply_markup, parse_mode='Markdown')
                return

            # Criar botões para cada OS
            keyboard = []
            for os in ordens_abertas[:10]:  # Limite de 10 OS
                status_emoji = '🆕' if os.status == 'ABERTA' else '🔧'
                keyboard.append([
                    InlineKeyboardButton(
                        f"{status_emoji} {os.numero} - {os.cliente.nome_razao[:30]}",
                        callback_data=f'ver_os_{os.id}'
                    )
                ])

            keyboard.append([InlineKeyboardButton("🔙 Voltar", callback_data='menu_ordens_servico')])
            reply_markup = InlineKeyboardMarkup(keyboard)

            texto = (
                f"📋 *Ordens de Serviço Abertas*\n\n"
                f"Total: {len(ordens_abertas)} OS\n\n"
                f"Selecione uma OS para visualizar detalhes:"
            )
            await query.edit_message_text(texto, reply_markup=reply_markup, parse_mode='Markdown')

        except Exception as e:
            logger.error(f"Erro listar_os_abertas: {e}")
            await query.edit_message_text("⚠️ Erro ao carregar OS abertas.")

    # Listar OS Concluídas
    elif action == 'listar_os_concluidas':
        try:
            usuario, tipo_usuario = await get_usuario_by_chat_id(chat_id)

            if tipo_usuario != 'tecnico':
                await query.edit_message_text("⚠️ Esta funcionalidade é apenas para técnicos.")
                return

            ordens = await get_ordens_servico_tecnico(usuario.id, status='CONCLUIDA')

            if not ordens:
                keyboard = [
                    [InlineKeyboardButton("🔙 Voltar", callback_data='menu_ordens_servico')]
                ]
                reply_markup = InlineKeyboardMarkup(keyboard)
                texto = "✅ *Ordens de Serviço Concluídas*\n\nVocê ainda não possui OS concluídas."
                await query.edit_message_text(texto, reply_markup=reply_markup, parse_mode='Markdown')
                return

            keyboard = []
            for os in ordens[:10]:
                keyboard.append([
                    InlineKeyboardButton(
                        f"✅ {os.numero} - {os.cliente.nome_razao[:30]}",
                        callback_data=f'ver_os_{os.id}'
                    )
                ])

            keyboard.append([InlineKeyboardButton("🔙 Voltar", callback_data='menu_ordens_servico')])
            reply_markup = InlineKeyboardMarkup(keyboard)

            texto = (
                f"✅ *Ordens de Serviço Concluídas*\n\n"
                f"Total: {len(ordens)} OS\n\n"
                f"Últimas OS concluídas:"
            )
            await query.edit_message_text(texto, reply_markup=reply_markup, parse_mode='Markdown')

        except Exception as e:
            logger.error(f"Erro listar_os_concluidas: {e}")
            await query.edit_message_text("⚠️ Erro ao carregar OS concluídas.")

    # Ver detalhes de uma OS
    elif action.startswith('ver_os_'):
        try:
            os_id = int(action.split('_')[2])
            usuario, tipo_usuario = await get_usuario_by_chat_id(chat_id)

            os = await get_ordem_servico_by_id(os_id)

            # Criar botões de ação
            keyboard = []

            if os.status in ['ABERTA', 'EM_EXECUCAO']:
                keyboard.append([
                    InlineKeyboardButton("✅ Finalizar OS", callback_data=f'finalizar_os_{os.id}')
                ])

            keyboard.append([InlineKeyboardButton("🔙 Voltar", callback_data='listar_os_abertas')])
            keyboard.append([InlineKeyboardButton("🏠 Menu Principal", callback_data='menu_start')])
            reply_markup = InlineKeyboardMarkup(keyboard)

            # Montar texto com detalhes da OS
            status_emoji = {
                'ABERTA': '🆕',
                'EM_EXECUCAO': '🔧',
                'CONCLUIDA': '✅',
                'CANCELADA': '❌'
            }.get(os.status, '📋')

            texto = (
                f"{status_emoji} *Ordem de Serviço {os.numero}*\n\n"
                f"🏢 *Cliente:* {os.cliente.nome_razao}\n"
            )

            if os.empreendimento:
                texto += f"🏭 *Empreendimento:* {os.empreendimento.nome}\n"

            if os.equipamento:
                texto += f"🚗 *Equipamento:* {os.equipamento.codigo}\n"

            texto += (
                f"\n📝 *Descrição:*\n{os.descricao or 'Sem descrição'}\n\n"
                f"📅 *Data Abertura:* {os.data_abertura.strftime('%d/%m/%Y')}\n"
                f"📅 *Data Prevista:* {os.data_prevista.strftime('%d/%m/%Y')}\n"
            )

            if os.data_inicio:
                texto += f"📅 *Data Início:* {os.data_inicio.strftime('%d/%m/%Y')}\n"

            if os.data_conclusao:
                texto += f"📅 *Data Conclusão:* {os.data_conclusao.strftime('%d/%m/%Y')}\n"

            texto += f"\n💰 *Valor Total:* R$ {os.valor_final:.2f}\n"

            if os.observacoes:
                texto += f"\n📌 *Observações:*\n{os.observacoes}\n"

            await query.edit_message_text(texto, reply_markup=reply_markup, parse_mode='Markdown')

        except Exception as e:
            logger.error(f"Erro ver_os: {e}")
            await query.edit_message_text("⚠️ Erro ao carregar detalhes da OS.")

    # Finalizar OS
    elif action.startswith('finalizar_os_'):
        try:
            os_id = int(action.split('_')[2])
            usuario, tipo_usuario = await get_usuario_by_chat_id(chat_id)

            # Confirmar finalização
            keyboard = [
                [
                    InlineKeyboardButton("✅ Sim, Finalizar", callback_data=f'confirmar_finalizar_os_{os_id}'),
                    InlineKeyboardButton("❌ Cancelar", callback_data=f'ver_os_{os_id}')
                ]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)

            texto = (
                "⚠️ *Confirmar Finalização*\n\n"
                "Deseja realmente finalizar esta Ordem de Serviço?\n\n"
                "✅ A OS será marcada como CONCLUÍDA\n"
                "🛠️ Uma manutenção será criada automaticamente no equipamento"
            )
            await query.edit_message_text(texto, reply_markup=reply_markup, parse_mode='Markdown')

        except Exception as e:
            logger.error(f"Erro finalizar_os: {e}")
            await query.edit_message_text("⚠️ Erro ao processar finalização.")

    # Confirmar finalização de OS
    elif action.startswith('confirmar_finalizar_os_'):
        try:
            os_id = int(action.split('_')[3])
            usuario, tipo_usuario = await get_usuario_by_chat_id(chat_id)

            # Finalizar OS e criar manutenção
            resultado = await finalizar_ordem_servico(os_id, usuario.id)

            keyboard = [
                [InlineKeyboardButton("📋 Ver Manutenção", callback_data='listar_manutencoes')],
                [InlineKeyboardButton("🏠 Menu Principal", callback_data='menu_start')]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)

            texto = (
                f"✅ *OS Finalizada com Sucesso!*\n\n"
                f"📋 OS: {resultado['numero_os']}\n"
                f"✅ Status: CONCLUÍDA\n\n"
            )

            if resultado['manutencao']:
                texto += (
                    f"🛠️ *Manutenção Criada:*\n"
                    f"   Tipo: Corretiva\n"
                    f"   Equipamento: {resultado['equipamento_codigo']}\n\n"
                    f"A manutenção foi registrada automaticamente no sistema."
                )
            else:
                texto += "⚠️ OS finalizada, mas não foi possível criar manutenção (equipamento não vinculado)."

            await query.edit_message_text(texto, reply_markup=reply_markup, parse_mode='Markdown')

        except Exception as e:
            logger.error(f"Erro confirmar_finalizar_os: {e}")
            await query.edit_message_text("⚠️ Erro ao finalizar OS.")

    # Listar Manutenções
    elif action == 'listar_manutencoes':
        try:
            usuario, tipo_usuario = await get_usuario_by_chat_id(chat_id)

            if tipo_usuario != 'tecnico':
                await query.edit_message_text("⚠️ Esta funcionalidade é apenas para técnicos.")
                return

            manutencoes = await get_manutencoes_tecnico(usuario.id)

            if not manutencoes:
                keyboard = [
                    [InlineKeyboardButton("➕ Registrar Manutenção", callback_data='nova_manutencao')],
                    [InlineKeyboardButton("🔙 Voltar", callback_data='menu_manutencoes')]
                ]
                reply_markup = InlineKeyboardMarkup(keyboard)
                texto = "📋 *Minhas Manutenções*\n\nVocê ainda não possui manutenções registradas."
                await query.edit_message_text(texto, reply_markup=reply_markup, parse_mode='Markdown')
                return

            keyboard = []
            for manut in manutencoes[:10]:
                tipo_emoji = '🔧' if manut.tipo == 'PREVENTIVA' else '⚠️'
                keyboard.append([
                    InlineKeyboardButton(
                        f"{tipo_emoji} {manut.equipamento.codigo} - {manut.data.strftime('%d/%m/%Y')}",
                        callback_data=f'ver_manutencao_{manut.id}'
                    )
                ])

            keyboard.append([InlineKeyboardButton("➕ Nova Manutenção", callback_data='nova_manutencao')])
            keyboard.append([InlineKeyboardButton("🔙 Voltar", callback_data='menu_manutencoes')])
            reply_markup = InlineKeyboardMarkup(keyboard)

            texto = (
                f"📋 *Minhas Manutenções*\n\n"
                f"Total: {len(manutencoes)} manutenções\n\n"
                f"Últimas manutenções registradas:"
            )
            await query.edit_message_text(texto, reply_markup=reply_markup, parse_mode='Markdown')

        except Exception as e:
            logger.error(f"Erro listar_manutencoes: {e}")
            await query.edit_message_text("⚠️ Erro ao carregar manutenções.")

    # Ver detalhes de uma manutenção
    elif action.startswith('ver_manutencao_'):
        try:
            from manutencao.models import Manutencao

            manut_id = int(action.split('_')[2])
            manutencao = await sync_to_async(Manutencao.objects.select_related('equipamento', 'tecnico').get)(id=manut_id)

            keyboard = [
                [InlineKeyboardButton("🔙 Voltar", callback_data='listar_manutencoes')],
                [InlineKeyboardButton("🏠 Menu Principal", callback_data='menu_start')]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)

            tipo_emoji = '🔧' if manutencao.tipo == 'PREVENTIVA' else '⚠️'

            texto = (
                f"{tipo_emoji} *Manutenção - {manutencao.get_tipo_display()}*\n\n"
                f"🚗 *Equipamento:* {manutencao.equipamento.codigo}\n"
                f"📅 *Data:* {manutencao.data.strftime('%d/%m/%Y')}\n"
                f"⏱️ *Horímetro:* {manutencao.horimetro}\n\n"
                f"📝 *Descrição:*\n{manutencao.descricao}\n"
            )

            if manutencao.observacoes:
                texto += f"\n📌 *Observações:*\n{manutencao.observacoes}\n"

            if manutencao.proxima_manutencao:
                texto += f"\n📅 *Próxima Manutenção:* {manutencao.proxima_manutencao.strftime('%d/%m/%Y')}"

            await query.edit_message_text(texto, reply_markup=reply_markup, parse_mode='Markdown')

        except Exception as e:
            logger.error(f"Erro ver_manutencao: {e}")
            await query.edit_message_text("⚠️ Erro ao carregar manutenção.")

    # Nova Manutenção - Seleção de Equipamento
    elif action == 'nova_manutencao':
        try:
            usuario, tipo_usuario = await get_usuario_by_chat_id(chat_id)

            if tipo_usuario != 'tecnico':
                await query.edit_message_text("⚠️ Esta funcionalidade é apenas para técnicos.")
                return

            # Buscar equipamentos autorizados
            equipamentos = await get_equipamentos_autorizados(usuario, tipo_usuario)

            if not equipamentos:
                keyboard = [
                    [InlineKeyboardButton("🔙 Voltar", callback_data='menu_manutencoes')]
                ]
                reply_markup = InlineKeyboardMarkup(keyboard)
                texto = "⚠️ Você não possui equipamentos autorizados para registrar manutenção."
                await query.edit_message_text(texto, reply_markup=reply_markup)
                return

            # Criar botões para cada equipamento
            keyboard = []
            for equip in equipamentos[:20]:  # Limite de 20 equipamentos
                keyboard.append([
                    InlineKeyboardButton(
                        f"🚗 {equip.codigo} - {equip.tipo.nome}",
                        callback_data=f'manut_selecionar_equip_{equip.id}'
                    )
                ])

            keyboard.append([InlineKeyboardButton("🔙 Voltar", callback_data='menu_manutencoes')])
            reply_markup = InlineKeyboardMarkup(keyboard)

            texto = (
                "🛠️ *Registrar Nova Manutenção*\n\n"
                f"Selecione o equipamento ({len(equipamentos)} disponíveis):"
            )
            await query.edit_message_text(texto, reply_markup=reply_markup, parse_mode='Markdown')

        except Exception as e:
            logger.error(f"Erro nova_manutencao: {e}")
            await query.edit_message_text("⚠️ Erro ao carregar equipamentos.")

    # Manutenção - Seleção de Tipo
    elif action.startswith('manut_selecionar_equip_'):
        try:
            equipamento_id = int(action.split('_')[3])

            # Armazenar equipamento selecionado no contexto
            context.user_data['manut_equipamento_id'] = equipamento_id

            # Mostrar opções de tipo
            keyboard = [
                [InlineKeyboardButton("🔧 Preventiva", callback_data='manut_tipo_preventiva')],
                [InlineKeyboardButton("⚠️ Corretiva", callback_data='manut_tipo_corretiva')],
                [InlineKeyboardButton("🔙 Voltar", callback_data='nova_manutencao')]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)

            equipamento = await get_equipamento_by_id(equipamento_id)

            texto = (
                f"🚗 *Equipamento:* {equipamento.codigo}\n\n"
                f"Selecione o tipo de manutenção:"
            )
            await query.edit_message_text(texto, reply_markup=reply_markup, parse_mode='Markdown')

        except Exception as e:
            logger.error(f"Erro manut_selecionar_equip: {e}")
            await query.edit_message_text("⚠️ Erro ao processar seleção.")

    # Manutenção - Tipo selecionado, solicitar horímetro
    elif action.startswith('manut_tipo_'):
        try:
            tipo = 'PREVENTIVA' if action == 'manut_tipo_preventiva' else 'CORRETIVA'
            context.user_data['manut_tipo'] = tipo

            equipamento_id = context.user_data.get('manut_equipamento_id')
            equipamento = await get_equipamento_by_id(equipamento_id)

            tipo_emoji = '🔧' if tipo == 'PREVENTIVA' else '⚠️'
            tipo_texto = 'Preventiva' if tipo == 'PREVENTIVA' else 'Corretiva'

            await query.edit_message_text(
                f"{tipo_emoji} *Manutenção {tipo_texto}*\n\n"
                f"🚗 Equipamento: {equipamento.codigo}\n\n"
                f"⏱️ Informe o *horímetro* (ou KM) atual do equipamento:\n\n"
                f"💡 Leitura atual no sistema: {equipamento.leitura_atual or 'N/A'}",
                parse_mode='Markdown'
            )

            # Retornar estado de aguardar horímetro
            return AGUARDANDO_MANUT_HORIMETRO

        except Exception as e:
            logger.error(f"Erro manut_tipo: {e}")
            await query.edit_message_text("⚠️ Erro ao processar tipo de manutenção.")

    # Ver detalhes de equipamento específico
    elif action.startswith('ver_equipamento_'):
        try:
            # Extrair ID do equipamento
            equipamento_id = int(action.split('_')[2])

            usuario, tipo_usuario = await get_usuario_by_chat_id(chat_id)
            equipamento = await get_equipamento_by_id(equipamento_id)

            # Verificar se o usuário tem acesso
            tem_acesso = await tem_acesso_equipamento(usuario, equipamento_id, tipo_usuario)

            if not tem_acesso:
                keyboard = [
                    [InlineKeyboardButton("🔙 Voltar", callback_data='menu_equipamentos')]
                ]
                reply_markup = InlineKeyboardMarkup(keyboard)
                texto = "⚠️ Você não tem autorização para este equipamento."
                await query.edit_message_text(texto, reply_markup=reply_markup)
                return

            # Criar tela de detalhes com botões de ação
            keyboard = [
                [InlineKeyboardButton("📋 Fazer Checklist", callback_data=f'checklist_equipamento_{equipamento_id}')],
                [InlineKeyboardButton("⛽ Registrar Abastecimento", callback_data=f'abastecimento_equipamento_{equipamento_id}')],
                [
                    InlineKeyboardButton("📊 Ver Histórico", callback_data=f'historico_equipamento_{equipamento_id}'),
                    InlineKeyboardButton("📍 Ver QR Code", callback_data=f'qrcode_equipamento_{equipamento_id}')
                ],
                [InlineKeyboardButton("🔙 Voltar", callback_data='menu_equipamentos')],
                [InlineKeyboardButton("🏠 Menu Principal", callback_data='menu_start')]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)

            # Montar texto com detalhes
            texto = (
                f"🚗 *Detalhes do Equipamento*\n\n"
                f"🏭 *Código:* `{equipamento.codigo}`\n"
                f"📝 *Descrição:* {equipamento.descricao or 'N/A'}\n"
                f"⚙️ *Tipo:* {equipamento.tipo.nome}\n"
                f"🏭 *Fabricante:* {equipamento.fabricante or 'N/A'}\n"
                f"🔧 *Modelo:* {equipamento.modelo or 'N/A'}\n"
                f"📅 *Ano:* {equipamento.ano_fabricacao or 'N/A'}\n"
                f"🔢 *Nº Série:* {equipamento.numero_serie or 'N/A'}\n\n"
                f"📊 *Medição:*\n"
                f"   Tipo: {equipamento.get_tipo_medicao_display()}\n"
                f"   Leitura Atual: {equipamento.leitura_atual}\n\n"
                f"📍 *Localização:*\n"
                f"   Empreendimento: {equipamento.empreendimento.nome}\n"
                f"   Cliente: {equipamento.cliente.nome_razao}\n\n"
                f"Escolha uma ação:"
            )

            await query.edit_message_text(texto, reply_markup=reply_markup, parse_mode='Markdown')

        except Exception as e:
            logger.error(f"[ERRO] Ao buscar equipamento: {e}")
            keyboard = [
                [InlineKeyboardButton("🔙 Voltar", callback_data='menu_equipamentos')]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            texto = "❌ Erro ao carregar equipamento. Tente novamente."
            await query.edit_message_text(texto, reply_markup=reply_markup)

    # Ver histórico de um equipamento específico
    elif action.startswith('historico_equipamento_'):
        try:
            equipamento_id = int(action.split('_')[2])
            equipamento = await get_equipamento_by_id(equipamento_id)
            checklists = await get_historico_equipamento(equipamento_id)

            keyboard = [
                [InlineKeyboardButton("🔙 Voltar", callback_data=f'ver_equipamento_{equipamento_id}')]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)

            if not checklists:
                texto = (
                    f"📊 *Histórico - {equipamento.codigo}*\n\n"
                    f"📋 Nenhum checklist realizado para este equipamento."
                )
            else:
                texto = f"📊 *Histórico - {equipamento.codigo}*\n\n"
                texto += f"Últimos {len(checklists)} checklist(s):\n\n"

                emoji_resultado = {
                    'APROVADO': '✅',
                    'APROVADO_RESTRICAO': '⚠️',
                    'REPROVADO': '❌'
                }

                for ck in checklists:
                    texto += (
                        f"{emoji_resultado.get(ck.resultado_geral, '?')} "
                        f"*{ck.get_resultado_geral_display()}*\n"
                        f"📅 {ck.data_hora_fim.strftime('%d/%m/%Y às %H:%M')}\n"
                        f"👤 {ck.operador_nome}\n"
                        f"{'─' * 30}\n\n"
                    )

            await query.edit_message_text(texto, reply_markup=reply_markup, parse_mode='Markdown')

        except Exception as e:
            logger.error(f"[ERRO] Ao buscar histórico: {e}")
            keyboard = [
                [InlineKeyboardButton("🔙 Voltar", callback_data=f'ver_equipamento_{equipamento_id}')]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            texto = "❌ Erro ao carregar histórico. Tente novamente."
            await query.edit_message_text(texto, reply_markup=reply_markup)

    # Ver QR Code de um equipamento
    elif action.startswith('qrcode_equipamento_'):
        try:
            equipamento_id = int(action.split('_')[2])
            equipamento = await get_equipamento_by_id(equipamento_id)

            keyboard = [
                [InlineKeyboardButton("🔙 Voltar", callback_data=f'ver_equipamento_{equipamento_id}')]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)

            if equipamento.qr_code:
                # Enviar o QR code como imagem
                texto = f"📍 *QR Code - {equipamento.codigo}*\n\n{equipamento.descricao or equipamento.modelo}"

                # Deletar mensagem anterior
                await query.message.delete()

                # Enviar QR code como foto
                from django.conf import settings
                import os
                qr_path = os.path.join(settings.MEDIA_ROOT, equipamento.qr_code.name)

                with open(qr_path, 'rb') as photo:
                    await context.bot.send_photo(
                        chat_id=chat_id,
                        photo=photo,
                        caption=texto,
                        reply_markup=reply_markup,
                        parse_mode='Markdown'
                    )
            else:
                texto = (
                    f"📍 *QR Code - {equipamento.codigo}*\n\n"
                    f"❌ QR Code não disponível para este equipamento.\n\n"
                    f"Entre em contato com o supervisor."
                )
                await query.edit_message_text(texto, reply_markup=reply_markup, parse_mode='Markdown')

        except Exception as e:
            logger.error(f"[ERRO] Ao buscar QR code: {e}")
            keyboard = [
                [InlineKeyboardButton("🔙 Voltar", callback_data=f'ver_equipamento_{equipamento_id}')]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            texto = "❌ Erro ao carregar QR Code. Tente novamente."
            await query.edit_message_text(texto, reply_markup=reply_markup)


async def erro_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handler de erros"""
    logger.error(f"[ERRO] Tipo: {type(context.error).__name__}")
    logger.error(f"[ERRO] Mensagem: {context.error}")

    if update:
        logger.error(f"[ERRO] Update: {update}")

    if update and update.effective_message:
        await update.effective_message.reply_text(
            "Ocorreu um erro ao processar sua solicitação. Tente novamente."
        )
