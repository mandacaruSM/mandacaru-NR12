from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import Manutencao, AnexoManutencao
from .serializers import ManutencaoSerializer, AnexoManutencaoSerializer
from core.permissions import HasModuleAccess, filter_by_role

class ManutencaoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para Manutenções com filtro seguro por role.
    """
    queryset = Manutencao.objects.select_related('equipamento__cliente', 'equipamento__empreendimento', 'tecnico').all()
    serializer_class = ManutencaoSerializer
    permission_classes = [IsAuthenticated, HasModuleAccess]
    required_module = 'manutencoes'
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ['equipamento', 'tipo', 'tecnico', 'data']
    search_fields = ['descricao', 'observacoes', 'equipamento__codigo']
    ordering_fields = ['data', 'horimetro', 'created_at']
    ordering = ['-data', '-id']

    def get_queryset(self):
        return filter_by_role(super().get_queryset(), self.request.user)

    @action(detail=True, methods=['post'])
    def anexos(self, request, pk=None):
        manutencao = self.get_object()
        files = request.FILES.getlist('arquivos')
        created = []
        for f in files:
            created.append(
                AnexoManutencaoSerializer(
                    AnexoManutencao.objects.create(
                        manutencao=manutencao, arquivo=f, nome_original=getattr(f, 'name', '')
                    )
                ).data
            )
        return Response(created, status=status.HTTP_201_CREATED)

class AnexoManutencaoViewSet(viewsets.ModelViewSet):
    queryset = AnexoManutencao.objects.select_related('manutencao', 'manutencao__equipamento').all()
    serializer_class = AnexoManutencaoSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'delete']  # leitura e remoção

    def get_queryset(self):
        qs = super().get_queryset()
        from core.permissions import get_user_role_safe
        role = get_user_role_safe(self.request.user)
        if role == 'CLIENTE':
            cliente = getattr(self.request.user, 'cliente_profile', None)
            if cliente:
                return qs.filter(manutencao__equipamento__cliente=cliente)
            return qs.none()
        return qs
