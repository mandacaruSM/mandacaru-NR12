from django.contrib import admin
from django.contrib.auth.models import User
from django.utils.html import format_html
from django.utils.crypto import get_random_string
from .models import Cliente, Empreendimento
from core.models import Profile


def corrigir_acessos_clientes(modeladmin, request, queryset):
    """
    Cria usuario e profile CLIENTE para clientes selecionados que estao sem user.
    Username = documento (CPF/CNPJ sem pontuacao).
    """
    criados = 0
    corrigidos = 0
    erros = []

    for cliente in queryset:
        documento = ''.join(filter(str.isdigit, cliente.documento or ''))
        if not documento:
            erros.append(f"Cliente #{cliente.id} '{cliente.nome_razao}': sem documento")
            continue

        if cliente.user_id:
            # Ja tem user, verificar se profile tem role correto
            try:
                profile = cliente.user.profile
                if profile.role != 'CLIENTE':
                    profile.role = 'CLIENTE'
                    profile.save()
                    corrigidos += 1
            except Profile.DoesNotExist:
                Profile.objects.create(
                    user=cliente.user,
                    role='CLIENTE',
                    modules_enabled=["dashboard", "empreendimentos", "equipamentos", "relatorios"]
                )
                corrigidos += 1
            continue

        # Criar user
        if User.objects.filter(username=documento).exists():
            user = User.objects.get(username=documento)
        else:
            senha = get_random_string(8)
            user = User.objects.create_user(
                username=documento,
                email=cliente.email_financeiro or f"{documento}@cliente.local",
                password=senha,
                first_name=(cliente.nome_razao or '').split()[0][:30] if cliente.nome_razao else '',
            )
            erros.append(f"Cliente '{cliente.nome_razao}': user criado ({documento} / {senha})")

        cliente.user = user
        cliente.save(update_fields=['user'])

        # Corrigir profile
        try:
            profile = user.profile
            if profile.role != 'CLIENTE':
                profile.role = 'CLIENTE'
                profile.save()
        except Profile.DoesNotExist:
            Profile.objects.create(
                user=user,
                role='CLIENTE',
                modules_enabled=["dashboard", "empreendimentos", "equipamentos", "relatorios"]
            )
        criados += 1

    msg = f"{criados} usuario(s) criado(s), {corrigidos} profile(s) corrigido(s)."
    if erros:
        msg += f" Detalhes: {'; '.join(erros)}"
    modeladmin.message_user(request, msg)


corrigir_acessos_clientes.short_description = "Corrigir acessos: criar usuario para clientes sem login"


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ("nome_razao", "tipo_pessoa", "documento", "cidade", "uf", "ativo", "tem_user", "uuid")
    search_fields = ("nome_razao", "documento", "cidade", "email_financeiro")
    list_filter = ("ativo", "uf", "tipo_pessoa")
    readonly_fields = ("qr_preview",)
    actions = [corrigir_acessos_clientes]

    def tem_user(self, obj):
        if obj.user_id:
            return format_html('<span style="color: green;">Sim</span>')
        return format_html('<span style="color: red;">Nao</span>')
    tem_user.short_description = "Login"
    tem_user.admin_order_field = "user"

    def qr_preview(self, obj):
        if getattr(obj, "uuid", None):
            return format_html('<img src="/api/v1/cadastro/qr/{}.png" width="200" height="200" />', obj.uuid)
        return "-"
    qr_preview.short_description = "QR Code"


@admin.register(Empreendimento)
class EmpreendimentoAdmin(admin.ModelAdmin):
    list_display = ("nome", "cliente", "tipo", "distancia_km", "ativo")
    search_fields = ("nome", "cliente__nome_razao")
    list_filter = ("ativo", "tipo")
