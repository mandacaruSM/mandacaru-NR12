from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import IsAuthenticated
from core.permissions import filter_by_role

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
    permission_classes = [IsAuthenticated]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'cliente', 'empreendimento', 'tecnico_responsavel']
    search_fields = ['numero', 'descricao', 'cliente__nome_razao', 'orcamento__numero']
    ordering_fields = ['data_abertura', 'data_prevista', 'data_conclusao', 'valor_final', 'created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        return filter_by_role(super().get_queryset(), self.request.user)

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
        """
        Concluir OS e criar Manutenção automaticamente.

        Fluxo:
        1. Valida se OS pode ser concluída
        2. Atualiza horímetro/KM do equipamento (se informado)
        3. Cria registro de manutenção vinculado à OS
        4. Marca OS como concluída

        Parâmetros esperados:
        - horimetro_final: valor do horímetro/KM ao finalizar
        - observacoes_manutencao: observações sobre a manutenção realizada
        """
        import logging
        logger = logging.getLogger(__name__)

        from django.utils import timezone
        from django.db import transaction
        from manutencao.models import Manutencao

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

        # Obter dados do request
        horimetro_final = request.data.get('horimetro_final')
        observacoes_manutencao = request.data.get('observacoes_manutencao', '')

        try:
            with transaction.atomic():
                # Atualizar OS
                os.status = 'CONCLUIDA'
                os.concluido_por = request.user

                if not os.data_conclusao:
                    os.data_conclusao = timezone.now().date()

                # Atualizar horímetro final se informado
                if horimetro_final:
                    os.horimetro_final = horimetro_final

                os.save()

                # Atualizar horímetro do equipamento (se houver equipamento e horímetro final)
                if os.equipamento and os.horimetro_final:
                    os.equipamento.leitura_atual = os.horimetro_final
                    os.equipamento.save()

                # Criar manutenção automaticamente (se houver equipamento)
                manutencao = None
                if os.equipamento:
                    # Determinar tipo de manutenção baseado no orçamento
                    tipo_manutencao = 'corretiva'
                    if os.orcamento and os.orcamento.tipo == 'MANUTENCAO_PREVENTIVA':
                        tipo_manutencao = 'preventiva'

                    # Usar horímetro final da OS, ou leitura atual do equipamento
                    horimetro = os.horimetro_final or os.equipamento.leitura_atual

                    manutencao = Manutencao.objects.create(
                        equipamento=os.equipamento,
                        ordem_servico=os,
                        tipo=tipo_manutencao,
                        data=os.data_conclusao,
                        horimetro=horimetro,
                        tecnico=os.tecnico_responsavel,
                        descricao=os.descricao or f"Manutenção realizada via {os.numero}",
                        observacoes=observacoes_manutencao or os.observacoes
                    )

            serializer = self.get_serializer(os)
            response_data = {
                **serializer.data,
                'manutencao_criada': manutencao is not None
            }

            if manutencao:
                response_data['manutencao_id'] = manutencao.id

            return Response(response_data)

        except Exception as e:
            logger.error(f"Erro ao concluir OS {pk}: {e}", exc_info=True)
            return Response(
                {'detail': f'Erro ao concluir OS: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

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
    queryset = ItemOrdemServico.objects.all().select_related(
        'ordem_servico', 'ordem_servico__cliente', 'produto'
    )
    serializer_class = ItemOrdemServicoSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['ordem_servico', 'tipo', 'executado']

    def get_queryset(self):
        return filter_by_role(super().get_queryset(), self.request.user)

    def get_object(self):
        """Override para logging e melhor tratamento de erros."""
        import logging
        logger = logging.getLogger(__name__)

        queryset = self.filter_queryset(self.get_queryset())
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        pk = self.kwargs.get(lookup_url_kwarg)

        logger.info(f"ItemOrdemServico get_object: pk={pk}, user={self.request.user}, queryset_count={queryset.count()}")

        # Verificar se o item existe no banco
        try:
            item_exists = ItemOrdemServico.objects.filter(pk=pk).exists()
            logger.info(f"Item {pk} existe no banco: {item_exists}")
        except Exception as e:
            logger.error(f"Erro ao verificar existência: {e}")

        return super().get_object()

    def update(self, request, *args, **kwargs):
        """Override update para capturar erros e retornar mensagens claras."""
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"ItemOrdemServico update: kwargs={kwargs}, data={request.data}")

        try:
            return super().update(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Erro ao atualizar ItemOrdemServico: {e}", exc_info=True)
            return Response(
                {'detail': f'Erro ao atualizar item: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def partial_update(self, request, *args, **kwargs):
        """Override partial_update para capturar erros e retornar mensagens claras."""
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"ItemOrdemServico partial_update: kwargs={kwargs}, data={request.data}")

        try:
            return super().partial_update(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Erro ao atualizar parcialmente ItemOrdemServico: {e}", exc_info=True)
            return Response(
                {'detail': f'Erro ao atualizar item: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
