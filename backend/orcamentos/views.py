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
        """
        Aprovar orçamento e criar Ordem de Serviço automaticamente.

        Fluxo:
        1. Aprova o orçamento
        2. Cria uma OS com os mesmos dados
        3. Copia todos os itens do orçamento para a OS
        """
        from django.utils import timezone
        from django.db import transaction
        from ordens_servico.models import OrdemServico, ItemOrdemServico

        orcamento = self.get_object()

        if orcamento.status == 'APROVADO':
            return Response(
                {'detail': 'Orçamento já está aprovado'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            # Aprovar orçamento
            orcamento.status = 'APROVADO'
            orcamento.aprovado_por = request.user
            orcamento.data_aprovacao = timezone.now().date()
            orcamento.save()

            # Criar Ordem de Serviço
            data_prevista = request.data.get('data_prevista')
            if not data_prevista:
                # Se não informado, usar data_validade do orçamento
                data_prevista = orcamento.data_validade

            os = OrdemServico.objects.create(
                orcamento=orcamento,
                cliente=orcamento.cliente,
                empreendimento=orcamento.empreendimento,
                equipamento=orcamento.equipamento,
                data_prevista=data_prevista,
                valor_servicos=orcamento.valor_servicos,
                valor_produtos=orcamento.valor_produtos,
                valor_deslocamento=orcamento.valor_deslocamento,
                valor_desconto=orcamento.valor_desconto,
                valor_total=orcamento.valor_total,
                descricao=orcamento.descricao,
                observacoes=orcamento.observacoes,
                aberto_por=request.user
            )

            # Copiar itens do orçamento para a OS
            for item_orc in orcamento.itens.all():
                ItemOrdemServico.objects.create(
                    ordem_servico=os,
                    tipo=item_orc.tipo,
                    produto=item_orc.produto,
                    descricao=item_orc.descricao,
                    quantidade=item_orc.quantidade,
                    valor_unitario=item_orc.valor_unitario,
                    observacao=item_orc.observacao,
                    executado=False
                )

        serializer = self.get_serializer(orcamento)
        return Response({
            **serializer.data,
            'ordem_servico_numero': os.numero,
            'ordem_servico_id': os.id
        })

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
