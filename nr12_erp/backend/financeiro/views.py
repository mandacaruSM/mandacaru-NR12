from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Q
from datetime import date
from rest_framework.permissions import IsAuthenticated
from core.permissions import filter_by_role

from .models import ContaReceber, ContaPagar, Pagamento
from .serializers import (
    ContaReceberListSerializer,
    ContaReceberDetailSerializer,
    ContaReceberCreateUpdateSerializer,
    ContaPagarListSerializer,
    ContaPagarDetailSerializer,
    ContaPagarCreateUpdateSerializer,
    PagamentoListSerializer,
    PagamentoDetailSerializer,
    PagamentoCreateUpdateSerializer,
    PagamentoParceladoSerializer,
)


class ContaReceberViewSet(viewsets.ModelViewSet):
    queryset = ContaReceber.objects.all().select_related(
        'cliente', 'orcamento', 'ordem_servico',
        'criado_por', 'recebido_por'
    )
    permission_classes = [IsAuthenticated]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['tipo', 'status', 'cliente']
    search_fields = ['numero', 'descricao', 'cliente__nome_razao']
    ordering_fields = ['data_emissao', 'data_vencimento', 'data_pagamento', 'valor_final', 'created_at']
    ordering = ['-data_vencimento']

    def get_queryset(self):
        return filter_by_role(super().get_queryset(), self.request.user)

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

        # Atualizar status de vencidas primeiro
        hoje = date.today()
        queryset.filter(
            status='ABERTA',
            data_vencimento__lt=hoje
        ).update(status='VENCIDA')

        total = queryset.count()
        abertas = queryset.filter(status='ABERTA').count()
        pagas = queryset.filter(status='PAGA').count()
        vencidas = queryset.filter(status='VENCIDA').count()

        valor_aberto = queryset.filter(status='ABERTA').aggregate(
            total=Sum('valor_final')
        )['total'] or 0

        valor_vencido = queryset.filter(status='VENCIDA').aggregate(
            total=Sum('valor_final')
        )['total'] or 0

        valor_recebido = queryset.filter(status='PAGA').aggregate(
            total=Sum('valor_pago')
        )['total'] or 0

        return Response({
            'total': total,
            'abertas': abertas,
            'pagas': pagas,
            'vencidas': vencidas,
            'total_aberto': float(valor_aberto),
            'total_vencido': float(valor_vencido),
            'total_recebido': float(valor_recebido),
        })


class ContaPagarViewSet(viewsets.ModelViewSet):
    queryset = ContaPagar.objects.all().select_related(
        'criado_por', 'pago_por'
    )
    permission_classes = [IsAuthenticated]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['tipo', 'status', 'fornecedor']
    search_fields = ['numero', 'descricao', 'fornecedor', 'numero_documento']
    ordering_fields = ['data_emissao', 'data_vencimento', 'data_pagamento', 'valor_final', 'created_at']
    ordering = ['-data_vencimento']

    def get_queryset(self):
        qs = super().get_queryset()
        from core.permissions import get_user_role_safe
        role = get_user_role_safe(self.request.user)
        # CLIENTE não deve ter acesso a contas a pagar (são despesas internas)
        if role == 'CLIENTE':
            return qs.none()
        return qs

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

        # Atualizar status de vencidas primeiro
        hoje = date.today()
        queryset.filter(
            status='ABERTA',
            data_vencimento__lt=hoje
        ).update(status='VENCIDA')

        total = queryset.count()
        abertas = queryset.filter(status='ABERTA').count()
        pagas = queryset.filter(status='PAGA').count()
        vencidas = queryset.filter(status='VENCIDA').count()

        valor_aberto = queryset.filter(status='ABERTA').aggregate(
            total=Sum('valor_final')
        )['total'] or 0

        valor_vencido = queryset.filter(status='VENCIDA').aggregate(
            total=Sum('valor_final')
        )['total'] or 0

        valor_pago_total = queryset.filter(status='PAGA').aggregate(
            total=Sum('valor_pago')
        )['total'] or 0

        return Response({
            'total': total,
            'abertas': abertas,
            'pagas': pagas,
            'vencidas': vencidas,
            'total_aberto': float(valor_aberto),
            'total_vencido': float(valor_vencido),
            'total_pago': float(valor_pago_total),
        })


class PagamentoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciamento de pagamentos.
    Permite registrar pagamentos parciais, adiantamentos e pagamentos totais.
    """
    queryset = Pagamento.objects.all().select_related(
        'conta_receber', 'conta_receber__cliente', 'registrado_por'
    )
    permission_classes = [IsAuthenticated]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['conta_receber', 'tipo_pagamento', 'forma_pagamento', 'status']
    search_fields = ['numero', 'conta_receber__numero', 'conta_receber__cliente__nome_razao', 'numero_cheque', 'numero_documento']
    ordering_fields = ['data_pagamento', 'valor', 'created_at']
    ordering = ['-data_pagamento', '-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        from core.permissions import get_user_role_safe
        role = get_user_role_safe(self.request.user)
        if role == 'CLIENTE':
            cliente = getattr(self.request.user, 'cliente_profile', None)
            if cliente:
                return qs.filter(conta_receber__cliente=cliente)
            return qs.none()
        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return PagamentoListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return PagamentoCreateUpdateSerializer
        elif self.action == 'parcelar':
            return PagamentoParceladoSerializer
        return PagamentoDetailSerializer

    @action(detail=True, methods=['post'])
    def confirmar(self, request, pk=None):
        """Confirmar um pagamento pendente"""
        pagamento = self.get_object()

        if pagamento.status != 'PENDENTE':
            return Response(
                {'detail': 'Apenas pagamentos pendentes podem ser confirmados'},
                status=status.HTTP_400_BAD_REQUEST
            )

        pagamento.status = 'CONFIRMADO'
        pagamento.save()

        serializer = self.get_serializer(pagamento)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        """Cancelar um pagamento"""
        pagamento = self.get_object()

        if pagamento.status == 'CANCELADO':
            return Response(
                {'detail': 'Pagamento já está cancelado'},
                status=status.HTTP_400_BAD_REQUEST
            )

        pagamento.status = 'CANCELADO'
        pagamento.save()

        serializer = self.get_serializer(pagamento)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def parcelar(self, request):
        """
        Criar pagamentos parcelados.

        Exemplo de payload:
        {
            "conta_receber": 1,
            "valor_total": 1000.00,
            "valor_desconto": 50.00,
            "forma_pagamento": "CHEQUE",
            "numero_parcelas": 3,
            "data_primeiro_pagamento": "2025-01-15",
            "dias_entre_parcelas": 30,
            "observacoes": "Parcelas acordadas com cliente"
        }
        """
        serializer = PagamentoParceladoSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        pagamentos = serializer.save()

        # Retornar os pagamentos criados
        output_serializer = PagamentoListSerializer(pagamentos, many=True)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def por_conta(self, request):
        """
        Listar todos os pagamentos de uma conta específica.
        Query param: conta_receber_id
        """
        conta_id = request.query_params.get('conta_receber_id')
        if not conta_id:
            return Response(
                {'detail': 'Parâmetro conta_receber_id é obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )

        pagamentos = self.queryset.filter(conta_receber_id=conta_id)
        serializer = PagamentoListSerializer(pagamentos, many=True)

        # Calcular totais
        total_pago = pagamentos.filter(status='CONFIRMADO').aggregate(
            total=Sum('valor_final')
        )['total'] or 0

        total_pendente = pagamentos.filter(status='PENDENTE').aggregate(
            total=Sum('valor_final')
        )['total'] or 0

        return Response({
            'pagamentos': serializer.data,
            'resumo': {
                'total_pagamentos': pagamentos.count(),
                'total_pago': float(total_pago),
                'total_pendente': float(total_pendente),
            }
        })
