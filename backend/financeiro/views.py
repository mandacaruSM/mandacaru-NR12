from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Q
from datetime import date

from .models import ContaReceber, ContaPagar
from .serializers import (
    ContaReceberListSerializer,
    ContaReceberDetailSerializer,
    ContaReceberCreateUpdateSerializer,
    ContaPagarListSerializer,
    ContaPagarDetailSerializer,
    ContaPagarCreateUpdateSerializer,
)


class ContaReceberViewSet(viewsets.ModelViewSet):
    queryset = ContaReceber.objects.all().select_related(
        'cliente', 'orcamento', 'ordem_servico',
        'criado_por', 'recebido_por'
    )

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['tipo', 'status', 'cliente']
    search_fields = ['numero', 'descricao', 'cliente__nome_razao']
    ordering_fields = ['data_emissao', 'data_vencimento', 'data_pagamento', 'valor_final', 'created_at']
    ordering = ['-data_vencimento']

    def get_serializer_class(self):
        if self.action == 'list':
            return ContaReceberListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ContaReceberCreateUpdateSerializer
        return ContaReceberDetailSerializer

    @action(detail=True, methods=['post'])
    def receber(self, request, pk=None):
        """Registrar recebimento"""
        conta = self.get_object()

        if conta.status == 'PAGA':
            return Response(
                {'detail': 'Conta já está paga'},
                status=status.HTTP_400_BAD_REQUEST
            )

        valor_pago = request.data.get('valor_pago', conta.valor_final)
        forma_pagamento = request.data.get('forma_pagamento', '')
        comprovante = request.data.get('comprovante', '')

        conta.valor_pago = float(valor_pago)
        conta.forma_pagamento = forma_pagamento
        conta.comprovante = comprovante
        conta.recebido_por = request.user

        if conta.valor_pago >= conta.valor_final:
            conta.status = 'PAGA'
            from django.utils import timezone
            conta.data_pagamento = timezone.now().date()

        conta.save()

        serializer = self.get_serializer(conta)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def resumo(self, request):
        """Retorna resumo de contas a receber"""
        queryset = self.filter_queryset(self.get_queryset())

        total = queryset.count()
        abertas = queryset.filter(status='ABERTA').count()
        pagas = queryset.filter(status='PAGA').count()
        vencidas = queryset.filter(status='VENCIDA').count()

        valor_aberto = queryset.filter(status='ABERTA').aggregate(
            total=Sum('valor_final')
        )['total'] or 0

        valor_recebido = queryset.filter(status='PAGA').aggregate(
            total=Sum('valor_pago')
        )['total'] or 0

        # Atualizar status de vencidas
        hoje = date.today()
        queryset.filter(
            status='ABERTA',
            data_vencimento__lt=hoje
        ).update(status='VENCIDA')

        return Response({
            'total': total,
            'abertas': abertas,
            'pagas': pagas,
            'vencidas': vencidas,
            'valor_aberto': float(valor_aberto),
            'valor_recebido': float(valor_recebido),
        })


class ContaPagarViewSet(viewsets.ModelViewSet):
    queryset = ContaPagar.objects.all().select_related(
        'criado_por', 'pago_por'
    )

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['tipo', 'status', 'fornecedor']
    search_fields = ['numero', 'descricao', 'fornecedor', 'numero_documento']
    ordering_fields = ['data_emissao', 'data_vencimento', 'data_pagamento', 'valor_final', 'created_at']
    ordering = ['-data_vencimento']

    def get_serializer_class(self):
        if self.action == 'list':
            return ContaPagarListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ContaPagarCreateUpdateSerializer
        return ContaPagarDetailSerializer

    @action(detail=True, methods=['post'])
    def pagar(self, request, pk=None):
        """Registrar pagamento"""
        conta = self.get_object()

        if conta.status == 'PAGA':
            return Response(
                {'detail': 'Conta já está paga'},
                status=status.HTTP_400_BAD_REQUEST
            )

        valor_pago = request.data.get('valor_pago', conta.valor_final)
        forma_pagamento = request.data.get('forma_pagamento', '')
        comprovante = request.data.get('comprovante', '')

        conta.valor_pago = float(valor_pago)
        conta.forma_pagamento = forma_pagamento
        conta.comprovante = comprovante
        conta.pago_por = request.user

        if conta.valor_pago >= conta.valor_final:
            conta.status = 'PAGA'
            from django.utils import timezone
            conta.data_pagamento = timezone.now().date()

        conta.save()

        serializer = self.get_serializer(conta)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def resumo(self, request):
        """Retorna resumo de contas a pagar"""
        queryset = self.filter_queryset(self.get_queryset())

        total = queryset.count()
        abertas = queryset.filter(status='ABERTA').count()
        pagas = queryset.filter(status='PAGA').count()
        vencidas = queryset.filter(status='VENCIDA').count()

        valor_aberto = queryset.filter(status='ABERTA').aggregate(
            total=Sum('valor_final')
        )['total'] or 0

        valor_pago_total = queryset.filter(status='PAGA').aggregate(
            total=Sum('valor_pago')
        )['total'] or 0

        # Atualizar status de vencidas
        hoje = date.today()
        queryset.filter(
            status='ABERTA',
            data_vencimento__lt=hoje
        ).update(status='VENCIDA')

        return Response({
            'total': total,
            'abertas': abertas,
            'pagas': pagas,
            'vencidas': vencidas,
            'valor_aberto': float(valor_aberto),
            'valor_pago': float(valor_pago_total),
        })
