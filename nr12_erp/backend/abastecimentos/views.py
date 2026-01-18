from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from .models import Abastecimento
from .serializers import AbastecimentoSerializer
from django_filters.rest_framework import DjangoFilterBackend
from core.permissions import ClienteFilterMixin, HasModuleAccess

class AbastecimentoViewSet(ClienteFilterMixin, viewsets.ModelViewSet):
    """
    ViewSet para Abastecimentos com filtro automático:
    - ADMIN: Vê todos os abastecimentos
    - SUPERVISOR: Vê abastecimentos dos empreendimentos que supervisiona
    - CLIENTE: Vê apenas abastecimentos dos seus equipamentos
    """
    queryset = Abastecimento.objects.select_related('equipamento__cliente', 'equipamento__empreendimento', 'operador').all()
    serializer_class = AbastecimentoSerializer
    permission_classes = [IsAuthenticated, HasModuleAccess]
    required_module = 'abastecimentos'
    http_method_names = ["get", "post", "put", "patch", "delete"]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["equipamento", "tipo_combustivel", "data"]
    search_fields = ["equipamento__codigo", "equipamento__descricao", "local", "numero_nota"]
    ordering_fields = ["data", "horimetro_km", "valor_total"]
    ordering = ["-data", "-horimetro_km"]
