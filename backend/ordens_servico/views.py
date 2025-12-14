from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import OrdemServico, ItemOrdemServico
from .serializers import (
    OrdemServicoListSerializer,
    OrdemServicoDetailSerializer,
    OrdemServicoUpdateSerializer,
    ItemOrdemServicoSerializer,
)


class OrdemServicoViewSet(viewsets.ModelViewSet):
    queryset = OrdemServico.objects.all().select_related(
        'orcamento', 'cliente', 'empreendimento', 'equipamento',
        'tecnico_responsavel', 'aberto_por', 'concluido_por'
    ).prefetch_related('itens')

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'cliente', 'empreendimento', 'tecnico_responsavel']
    search_fields = ['numero', 'descricao', 'cliente__nome_razao', 'orcamento__numero']
    ordering_fields = ['data_abertura', 'data_prevista', 'data_conclusao', 'valor_final', 'created_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return OrdemServicoListSerializer
        elif self.action in ['update', 'partial_update']:
            return OrdemServicoUpdateSerializer
        return OrdemServicoDetailSerializer

    @action(detail=True, methods=['post'])
    def iniciar(self, request, pk=None):
        """Iniciar execução da OS"""
        os = self.get_object()

        if os.status != 'ABERTA':
            return Response(
                {'detail': 'Apenas OS abertas podem ser iniciadas'},
                status=status.HTTP_400_BAD_REQUEST
            )

        os.status = 'EM_EXECUCAO'
        if not os.data_inicio:
            from django.utils import timezone
            os.data_inicio = timezone.now().date()
        os.save()

        serializer = self.get_serializer(os)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def concluir(self, request, pk=None):
        """Concluir OS"""
        os = self.get_object()

        if os.status == 'CONCLUIDA':
            return Response(
                {'detail': 'OS já está concluída'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if os.status == 'CANCELADA':
            return Response(
                {'detail': 'OS cancelada não pode ser concluída'},
                status=status.HTTP_400_BAD_REQUEST
            )

        os.status = 'CONCLUIDA'
        os.concluido_por = request.user
        if not os.data_conclusao:
            from django.utils import timezone
            os.data_conclusao = timezone.now().date()
        os.save()

        serializer = self.get_serializer(os)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        """Cancelar OS"""
        os = self.get_object()

        if os.status == 'CONCLUIDA':
            return Response(
                {'detail': 'OS concluída não pode ser cancelada'},
                status=status.HTTP_400_BAD_REQUEST
            )

        os.status = 'CANCELADA'
        os.save()

        serializer = self.get_serializer(os)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def resumo(self, request):
        """Retorna resumo de ordens de serviço"""
        queryset = self.filter_queryset(self.get_queryset())

        total = queryset.count()
        abertas = queryset.filter(status='ABERTA').count()
        em_execucao = queryset.filter(status='EM_EXECUCAO').count()
        concluidas = queryset.filter(status='CONCLUIDA').count()
        canceladas = queryset.filter(status='CANCELADA').count()

        return Response({
            'total': total,
            'abertas': abertas,
            'em_execucao': em_execucao,
            'concluidas': concluidas,
            'canceladas': canceladas,
        })


class ItemOrdemServicoViewSet(viewsets.ModelViewSet):
    queryset = ItemOrdemServico.objects.all().select_related('ordem_servico', 'produto')
    serializer_class = ItemOrdemServicoSerializer
    filterset_fields = ['ordem_servico', 'tipo', 'executado']
