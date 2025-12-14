from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q

from .models import Orcamento, ItemOrcamento
from .serializers import (
    OrcamentoListSerializer,
    OrcamentoDetailSerializer,
    OrcamentoCreateUpdateSerializer,
    ItemOrcamentoSerializer,
)


class OrcamentoViewSet(viewsets.ModelViewSet):
    queryset = Orcamento.objects.all().select_related(
        'cliente', 'empreendimento', 'equipamento',
        'criado_por', 'aprovado_por'
    ).prefetch_related('itens')

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['tipo', 'status', 'cliente', 'empreendimento']
    search_fields = ['numero', 'descricao', 'cliente__nome_razao']
    ordering_fields = ['data_emissao', 'data_validade', 'valor_total', 'created_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return OrcamentoListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return OrcamentoCreateUpdateSerializer
        return OrcamentoDetailSerializer

    @action(detail=True, methods=['post'])
    def aprovar(self, request, pk=None):
        """Aprovar orçamento"""
        orcamento = self.get_object()

        if orcamento.status == 'APROVADO':
            return Response(
                {'detail': 'Orçamento já está aprovado'},
                status=status.HTTP_400_BAD_REQUEST
            )

        orcamento.status = 'APROVADO'
        orcamento.aprovado_por = request.user
        from django.utils import timezone
        orcamento.data_aprovacao = timezone.now().date()
        orcamento.save()

        serializer = self.get_serializer(orcamento)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def rejeitar(self, request, pk=None):
        """Rejeitar orçamento"""
        orcamento = self.get_object()

        if orcamento.status not in ['RASCUNHO', 'ENVIADO']:
            return Response(
                {'detail': 'Orçamento não pode ser rejeitado neste status'},
                status=status.HTTP_400_BAD_REQUEST
            )

        orcamento.status = 'REJEITADO'
        orcamento.save()

        serializer = self.get_serializer(orcamento)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def enviar(self, request, pk=None):
        """Enviar orçamento ao cliente"""
        orcamento = self.get_object()

        if orcamento.status != 'RASCUNHO':
            return Response(
                {'detail': 'Apenas orçamentos em rascunho podem ser enviados'},
                status=status.HTTP_400_BAD_REQUEST
            )

        orcamento.status = 'ENVIADO'
        orcamento.save()

        serializer = self.get_serializer(orcamento)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def resumo(self, request):
        """Retorna resumo de orçamentos"""
        queryset = self.filter_queryset(self.get_queryset())

        total = queryset.count()
        rascunhos = queryset.filter(status='RASCUNHO').count()
        enviados = queryset.filter(status='ENVIADO').count()
        aprovados = queryset.filter(status='APROVADO').count()
        rejeitados = queryset.filter(status='REJEITADO').count()

        return Response({
            'total': total,
            'rascunhos': rascunhos,
            'enviados': enviados,
            'aprovados': aprovados,
            'rejeitados': rejeitados,
        })


class ItemOrcamentoViewSet(viewsets.ModelViewSet):
    queryset = ItemOrcamento.objects.all().select_related('orcamento', 'produto')
    serializer_class = ItemOrcamentoSerializer
    filterset_fields = ['orcamento', 'tipo']
