from rest_framework import viewsets, filters
from .models import Abastecimento
from .serializers import AbastecimentoSerializer
from django_filters.rest_framework import DjangoFilterBackend

class AbastecimentoViewSet(viewsets.ModelViewSet):
    queryset = Abastecimento.objects.select_related('equipamento', 'operador').all()
    serializer_class = AbastecimentoSerializer
    http_method_names = ["get", "post", "put", "patch", "delete"]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["equipamento", "tipo_combustivel", "data"]
    search_fields = ["equipamento__codigo", "equipamento__descricao", "local", "numero_nota"]
    ordering_fields = ["data", "horimetro_km", "valor_total"]
    ordering = ["-data", "-horimetro_km"]
