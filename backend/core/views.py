# backend/core/views.py
from datetime import datetime
from django.apps import apps
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response


class HealthView(APIView):
    """Ping simples para ver se a API está no ar."""
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"status": "ok"})


class MeView(APIView):
    """Retorna dados do usuário autenticado (com fallback se não houver Profile)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        default_modules = [
            "clientes", "empreendimentos", "equipamentos", "nr12",
            "manutencoes", "abastecimentos", "almoxarifado",
            "os", "orcamentos", "compras"
        ]
        role = "ADMIN"
        modules_enabled = default_modules

        profile = getattr(user, "profile", None)
        if profile:
            role = getattr(profile, "role", role) or role
            modules_enabled = getattr(profile, "modules_enabled", modules_enabled) or modules_enabled

        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email or "",
            "profile": {"role": role, "modules_enabled": modules_enabled}
        })


class BotOnboardingView(APIView):
    """
    Primeiro acesso do Bot:
    recebe nome completo, data de nascimento (DD/MM/AAAA) e chat_id.
    Procura Operador ou Supervisor ativo, vincula o chat_id e retorna o role.
    """
    permission_classes = [AllowAny]  # em produção, proteger com segredo/assinatura no header

    def post(self, request):
        data = request.data or {}
        nome = str(data.get("nome_completo", "")).strip()
        dn_str = str(data.get("data_nascimento", "")).strip()
        chat_id = str(data.get("chat_id", "")).strip()

        if not nome or not dn_str or not chat_id:
            return Response(
                {"detail": "Campos obrigatórios: nome_completo, data_nascimento (DD/MM/AAAA), chat_id."},
                status=400
            )

        try:
            dn = datetime.strptime(dn_str, "%d/%m/%Y").date()
        except ValueError:
            return Response({"detail": "data_nascimento inválida (use DD/MM/AAAA)."}, status=400)

        # Carrega modelos dinamicamente; se ainda não existem, continua sem quebrar
        try:
            Operador = apps.get_model("core", "Operador")
        except LookupError:
            Operador = None
        try:
            Supervisor = apps.get_model("core", "Supervisor")
        except LookupError:
            Supervisor = None

        pessoa = None
        if Operador:
            pessoa = Operador.objects.filter(
                ativo=True, nome_completo__iexact=nome, data_nascimento=dn
            ).first()
        if not pessoa and Supervisor:
            pessoa = Supervisor.objects.filter(
                ativo=True, nome_completo__iexact=nome, data_nascimento=dn
            ).first()

        if not pessoa:
            # Endpoint existe, mas ainda não há cadastro compatível — esperado até criarmos os modelos e registros
            return Response({"detail": "Não encontrado ou inativo."}, status=404)

        pessoa.telegram_chat_id = chat_id
        try:
            pessoa.save(update_fields=["telegram_chat_id"])
        except Exception:
            pessoa.save()

        role = "OPERADOR"
        if Supervisor and isinstance(pessoa, Supervisor):
            role = "SUPERVISOR"

        return Response({"ok": True, "role": role})
