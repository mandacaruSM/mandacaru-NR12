from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Tecnico
from .serializers import TecnicoSerializer
from django_filters.rest_framework import DjangoFilterBackend

class TecnicoViewSet(viewsets.ModelViewSet):
    queryset = Tecnico.objects.all()
    serializer_class = TecnicoSerializer
    http_method_names = ["get", "post", "put", "patch", "delete"]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["ativo"]
    search_fields = ["nome", "email", "telefone"]
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
