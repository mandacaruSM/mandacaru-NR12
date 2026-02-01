from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils.crypto import get_random_string
from .models import Tecnico
from .serializers import TecnicoSerializer
from django_filters.rest_framework import DjangoFilterBackend
from core.permissions import IsAdminUser

class TecnicoViewSet(viewsets.ModelViewSet):
    queryset = Tecnico.objects.prefetch_related('clientes', 'empreendimentos_vinculados').all()
    serializer_class = TecnicoSerializer
    http_method_names = ["get", "post", "put", "patch", "delete"]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["ativo"]
    search_fields = ["nome", "nome_completo", "email", "telefone", "cpf"]
    ordering_fields = ["nome", "created_at"]
    ordering = ["nome"]

    @action(detail=True, methods=['post'])
    def gerar_codigo_telegram(self, request, pk=None):
        """Gera código de vinculação do Telegram para o técnico"""
        tecnico = self.get_object()
        codigo = tecnico.gerar_codigo_vinculacao()
        return Response({
            'codigo': codigo,
            'valido_ate': tecnico.codigo_valido_ate
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdminUser])
    def resetar_senha(self, request, pk=None):
        """
        Reseta a senha do técnico. Se não tem usuário vinculado, cria automaticamente.
        POST /api/v1/tecnicos/{id}/resetar_senha/
        Body (opcional): { "senha": "novasenha123" }
        """
        from django.contrib.auth import get_user_model
        from core.models import Profile
        User = get_user_model()

        tecnico = self.get_object()

        senha = request.data.get('senha')
        if not senha:
            senha = get_random_string(8)
            senha_gerada = True
        else:
            senha_gerada = False
            if len(senha) < 6:
                return Response(
                    {"detail": "A senha deve ter pelo menos 6 caracteres."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        usuario_criado = False
        if not tecnico.user:
            cpf_limpo = ''.join(c for c in (tecnico.cpf or '') if c.isdigit())
            if not cpf_limpo:
                return Response(
                    {"detail": "Técnico não possui CPF cadastrado para usar como login."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if User.objects.filter(username=cpf_limpo).exists():
                user = User.objects.get(username=cpf_limpo)
                tecnico.user = user
                tecnico.save()
            else:
                user = User.objects.create_user(
                    username=cpf_limpo,
                    password=senha,
                    email=tecnico.email or '',
                    first_name=(tecnico.nome_completo or tecnico.nome or '')[:30],
                )
                Profile.objects.create(
                    user=user,
                    role='TECNICO',
                    modules_enabled=['dashboard', 'equipamentos', 'nr12', 'manutencoes']
                )
                tecnico.user = user
                tecnico.save()
                usuario_criado = True

        tecnico.user.set_password(senha)
        tecnico.user.save()

        return Response({
            "detail": "Usuário criado e senha definida com sucesso." if usuario_criado else "Senha resetada com sucesso.",
            "username": tecnico.user.username,
            "nova_senha": senha if senha_gerada else None,
            "usuario_criado": usuario_criado,
            "senha_gerada_automaticamente": senha_gerada
        })
