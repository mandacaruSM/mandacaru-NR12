from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import Fornecedor, PedidoCompra, ItemPedidoCompra, StatusPedido, LocalEntrega
from .serializers import FornecedorSerializer, PedidoCompraSerializer, ItemPedidoCompraSerializer, LocalEntregaSerializer
from core.permissions import HasModuleAccess, filter_by_role


class LocalEntregaViewSet(viewsets.ModelViewSet):
    queryset = LocalEntrega.objects.all()
    serializer_class = LocalEntregaSerializer
    permission_classes = [IsAuthenticated, HasModuleAccess]
    required_module = 'compras'
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['ativo']
    search_fields = ['nome', 'responsavel', 'cidade', 'bairro']
    ordering_fields = ['nome', 'created_at']
    ordering = ['nome']

    def get_queryset(self):
        from core.permissions import get_user_role_safe
        qs = super().get_queryset()
        role = get_user_role_safe(self.request.user)
        # CLIENTE e OPERADOR nao devem ver locais de entrega (dados internos)
        if role in ('CLIENTE', 'OPERADOR'):
            return qs.none()
        return qs


class FornecedorViewSet(viewsets.ModelViewSet):
    queryset = Fornecedor.objects.all()
    serializer_class = FornecedorSerializer
    permission_classes = [IsAuthenticated, HasModuleAccess]
    required_module = 'compras'
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['ativo']
    search_fields = ['nome', 'cnpj_cpf', 'especialidade', 'cidade']
    ordering_fields = ['nome', 'created_at']
    ordering = ['nome']

    def get_queryset(self):
        from core.permissions import get_user_role_safe
        qs = super().get_queryset()
        role = get_user_role_safe(self.request.user)
        # CLIENTE e OPERADOR nao devem ver fornecedores (dados internos)
        if role in ('CLIENTE', 'OPERADOR'):
            return qs.none()
        return qs


class PedidoCompraViewSet(viewsets.ModelViewSet):
    queryset = PedidoCompra.objects.select_related(
        'fornecedor', 'cliente', 'equipamento', 'orcamento', 'local_estoque', 'local_entrega', 'criado_por'
    ).prefetch_related('itens', 'itens__produto').all()
    serializer_class = PedidoCompraSerializer
    permission_classes = [IsAuthenticated, HasModuleAccess]
    required_module = 'compras'
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'destino', 'fornecedor', 'cliente', 'equipamento']
    search_fields = ['numero', 'fornecedor__nome', 'observacoes', 'numero_nf']
    ordering_fields = ['created_at', 'data_pedido', 'valor_total', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        return filter_by_role(super().get_queryset(), self.request.user)

    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user)

    @action(detail=True, methods=['post'])
    def enviar(self, request, pk=None):
        """Marca o pedido como enviado ao fornecedor"""
        pedido = self.get_object()
        if pedido.status != StatusPedido.RASCUNHO:
            return Response({'detail': 'Apenas pedidos em rascunho podem ser enviados.'}, status=status.HTTP_400_BAD_REQUEST)
        if pedido.itens.count() == 0:
            return Response({'detail': 'Adicione itens ao pedido antes de enviar.'}, status=status.HTTP_400_BAD_REQUEST)
        pedido.status = StatusPedido.ENVIADO
        pedido.save()
        return Response(PedidoCompraSerializer(pedido).data)

    @action(detail=True, methods=['post'])
    def aprovar(self, request, pk=None):
        """Aprova o pedido"""
        pedido = self.get_object()
        if pedido.status != StatusPedido.ENVIADO:
            return Response({'detail': 'Apenas pedidos enviados podem ser aprovados.'}, status=status.HTTP_400_BAD_REQUEST)
        pedido.status = StatusPedido.APROVADO
        pedido.save()
        return Response(PedidoCompraSerializer(pedido).data)

    @action(detail=True, methods=['post'])
    def receber(self, request, pk=None):
        """
        Registra recebimento do pedido e dá entrada no estoque.
        Body opcional: { "numero_nf": "123456", "local_estoque": 1 }
        """
        pedido = self.get_object()
        if pedido.status not in [StatusPedido.APROVADO, StatusPedido.ENVIADO, StatusPedido.PARCIAL]:
            return Response(
                {'detail': 'Apenas pedidos aprovados/enviados podem ser recebidos.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Atualizar NF se fornecida
        numero_nf = request.data.get('numero_nf')
        if numero_nf:
            pedido.numero_nf = numero_nf

        local_estoque_id = request.data.get('local_estoque')
        if local_estoque_id:
            pedido.local_estoque_id = local_estoque_id

        from django.utils import timezone
        pedido.data_entrega = timezone.now().date()
        pedido.status = StatusPedido.ENTREGUE
        pedido.save()

        # A entrada no estoque é feita pelo signal (signals.py)
        return Response(PedidoCompraSerializer(pedido).data)

    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        """Cancela o pedido"""
        pedido = self.get_object()
        if pedido.status == StatusPedido.ENTREGUE:
            return Response({'detail': 'Pedidos entregues não podem ser cancelados.'}, status=status.HTTP_400_BAD_REQUEST)
        pedido.status = StatusPedido.CANCELADO
        pedido.save()
        return Response(PedidoCompraSerializer(pedido).data)

    @action(detail=False, methods=['get'])
    def resumo(self, request):
        """Retorna resumo dos pedidos de compra"""
        qs = self.get_queryset()
        from django.db.models import Sum, Count
        resumo = {
            'total': qs.count(),
            'rascunhos': qs.filter(status=StatusPedido.RASCUNHO).count(),
            'enviados': qs.filter(status=StatusPedido.ENVIADO).count(),
            'aprovados': qs.filter(status=StatusPedido.APROVADO).count(),
            'entregues': qs.filter(status=StatusPedido.ENTREGUE).count(),
            'cancelados': qs.filter(status=StatusPedido.CANCELADO).count(),
            'valor_total_pendente': float(
                qs.exclude(status__in=[StatusPedido.ENTREGUE, StatusPedido.CANCELADO])
                .aggregate(total=Sum('valor_total'))['total'] or 0
            ),
        }
        return Response(resumo)


class ItemPedidoCompraViewSet(viewsets.ModelViewSet):
    queryset = ItemPedidoCompra.objects.select_related('pedido', 'produto').all()
    serializer_class = ItemPedidoCompraSerializer
    permission_classes = [IsAuthenticated, HasModuleAccess]
    required_module = 'compras'
    filterset_fields = ['pedido', 'entregue']

    def get_queryset(self):
        return filter_by_role(super().get_queryset(), self.request.user)
