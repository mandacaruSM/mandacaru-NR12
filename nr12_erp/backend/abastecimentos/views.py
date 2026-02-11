from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.core.exceptions import ValidationError
from .models import Abastecimento
from .serializers import AbastecimentoSerializer
from django_filters.rest_framework import DjangoFilterBackend
from core.permissions import HasModuleAccess, OperadorCanOnlyCreate, filter_by_role

class AbastecimentoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para Abastecimentos com filtro seguro por role.
    """
    queryset = Abastecimento.objects.select_related('equipamento__cliente', 'equipamento__empreendimento', 'operador').all()
    serializer_class = AbastecimentoSerializer
    permission_classes = [IsAuthenticated, HasModuleAccess, OperadorCanOnlyCreate]
    required_module = 'abastecimentos'

    def get_queryset(self):
        return filter_by_role(super().get_queryset(), self.request.user)
    http_method_names = ["get", "post", "put", "patch", "delete"]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["equipamento", "tipo_combustivel", "data"]
    search_fields = ["equipamento__codigo", "equipamento__descricao", "local", "numero_nota"]
    ordering_fields = ["data", "horimetro_km", "valor_total"]
    ordering = ["-data", "-horimetro_km"]

    def create(self, request, *args, **kwargs):
        """
        Override create para capturar ValidationError do signal pre_save
        e retornar uma resposta amigável em vez de erro 500.
        """
        try:
            return super().create(request, *args, **kwargs)
        except ValidationError as e:
            # Captura ValidationError do Django (levantado pelo signal)
            return Response(
                {'detail': str(e.message) if hasattr(e, 'message') else str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def update(self, request, *args, **kwargs):
        """
        Override update para capturar ValidationError do signal pre_save.
        """
        try:
            return super().update(request, *args, **kwargs)
        except ValidationError as e:
            return Response(
                {'detail': str(e.message) if hasattr(e, 'message') else str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
