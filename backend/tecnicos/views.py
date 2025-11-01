from rest_framework import viewsets, filters
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
