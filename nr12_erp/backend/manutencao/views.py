from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from .models import Manutencao, AnexoManutencao
from .serializers import ManutencaoSerializer, AnexoManutencaoSerializer

class ManutencaoViewSet(viewsets.ModelViewSet):
    queryset = Manutencao.objects.select_related('equipamento', 'tecnico').all()
    serializer_class = ManutencaoSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ['equipamento', 'tipo', 'tecnico', 'data']
    search_fields = ['descricao', 'observacoes', 'equipamento__nome']  # ajuste para campo real do Equipamento
    ordering_fields = ['data', 'horimetro', 'created_at']
    ordering = ['-data', '-id']

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
    queryset = AnexoManutencao.objects.select_related('manutencao').all()
    serializer_class = AnexoManutencaoSerializer
    http_method_names = ['get', 'delete']  # leitura e remoção
