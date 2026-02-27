from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import IsAuthenticated

from .models import CategoriaServico, Servico
from .serializers import (
    CategoriaServicoSerializer,
    ServicoListSerializer,
    ServicoDetailSerializer,
)


class CategoriaServicoViewSet(viewsets.ModelViewSet):
    queryset = CategoriaServico.objects.all()
    serializer_class = CategoriaServicoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nome', 'descricao']
    ordering = ['nome']


class ServicoViewSet(viewsets.ModelViewSet):
    queryset = Servico.objects.select_related('categoria').all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['categoria', 'ativo', 'unidade']
    search_fields = ['codigo', 'nome', 'descricao_detalhada']
    ordering = ['nome']

    def get_serializer_class(self):
        if self.action == 'list':
            return ServicoListSerializer
        return ServicoDetailSerializer
