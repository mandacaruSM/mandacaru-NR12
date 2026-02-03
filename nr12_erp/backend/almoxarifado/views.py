from rest_framework import viewsets, permissions, mixins, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import UnidadeMedida, CategoriaProduto, Produto, LocalEstoque, Estoque, MovimentoEstoque
from .serializers import (UnidadeSerializer, CategoriaSerializer, ProdutoSerializer, ProdutoListSerializer,
                          LocalEstoqueSerializer, EstoqueSerializer, MovimentoSerializer)


class UnidadeViewSet(viewsets.ModelViewSet):
    queryset = UnidadeMedida.objects.all()
    serializer_class = UnidadeSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['sigla', 'descricao']
    ordering_fields = ['sigla']
    ordering = ['sigla']


class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = CategoriaProduto.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nome']
    ordering_fields = ['nome']
    ordering = ['nome']


class ProdutoViewSet(viewsets.ModelViewSet):
    queryset = Produto.objects.select_related('categoria', 'unidade').all()
    serializer_class = ProdutoSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['codigo', 'nome', 'categoria__nome']
    ordering_fields = ['codigo', 'nome', 'tipo']
    ordering = ['codigo']

    def get_serializer_class(self):
        if self.action == 'list':
            return ProdutoListSerializer
        return ProdutoSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filtro por tipo
        tipo = self.request.query_params.get('tipo', None)
        if tipo:
            queryset = queryset.filter(tipo=tipo)

        # Filtro por categoria
        categoria = self.request.query_params.get('categoria', None)
        if categoria:
            queryset = queryset.filter(categoria_id=categoria)

        # Filtro por ativo
        ativo = self.request.query_params.get('ativo', None)
        if ativo is not None:
            queryset = queryset.filter(ativo=ativo.lower() in ['true', '1', 'yes'])

        return queryset

    @action(detail=False, methods=['get'])
    def combustiveis(self, request):
        """Retorna apenas produtos do tipo combustível"""
        combustiveis = self.get_queryset().filter(tipo='COMBUSTIVEL')
        serializer = self.get_serializer(combustiveis, many=True)
        return Response(serializer.data)


class LocalEstoqueViewSet(viewsets.ModelViewSet):
    queryset = LocalEstoque.objects.all()
    serializer_class = LocalEstoqueSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nome', 'fornecedor_nome']
    ordering_fields = ['nome', 'tipo']
    ordering = ['nome']

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filtro por tipo
        tipo = self.request.query_params.get('tipo', None)
        if tipo:
            queryset = queryset.filter(tipo=tipo)

        return queryset


class EstoqueViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = Estoque.objects.select_related("produto", "local", "produto__unidade", "produto__categoria").all()
    serializer_class = EstoqueSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['produto__codigo', 'produto__nome', 'local__nome']
    ordering_fields = ['produto__codigo', 'saldo']
    ordering = ['produto__codigo']

    def get_queryset(self):
        queryset = super().get_queryset()
        from core.permissions import get_user_role_safe
        if get_user_role_safe(self.request.user) == 'CLIENTE':
            return queryset.none()

        # Filtro por local
        local = self.request.query_params.get('local', None)
        if local:
            queryset = queryset.filter(local_id=local)

        # Filtro por tipo de produto
        tipo_produto = self.request.query_params.get('tipo_produto', None)
        if tipo_produto:
            queryset = queryset.filter(produto__tipo=tipo_produto)

        # Filtro por saldo baixo (menor que um valor)
        saldo_baixo = self.request.query_params.get('saldo_baixo', None)
        if saldo_baixo:
            queryset = queryset.filter(saldo__lt=float(saldo_baixo))

        # Filtro apenas com saldo
        apenas_com_saldo = self.request.query_params.get('apenas_com_saldo', None)
        if apenas_com_saldo and apenas_com_saldo.lower() in ['true', '1', 'yes']:
            queryset = queryset.filter(saldo__gt=0)

        return queryset

    @action(detail=False, methods=['get'])
    def resumo(self, request):
        """Retorna um resumo do estoque"""
        queryset = self.get_queryset()
        total_itens = queryset.count()
        com_saldo = queryset.filter(saldo__gt=0).count()
        sem_saldo = queryset.filter(saldo=0).count()

        return Response({
            'total_itens': total_itens,
            'com_saldo': com_saldo,
            'sem_saldo': sem_saldo,
        })


class MovimentoViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = MovimentoEstoque.objects.select_related(
        "produto", "local", "criado_por", "produto__unidade"
    ).all().order_by("-data_hora")
    serializer_class = MovimentoSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['produto__codigo', 'produto__nome', 'documento', 'observacao']
    ordering_fields = ['data_hora', 'quantidade']
    ordering = ['-data_hora']

    def get_queryset(self):
        queryset = super().get_queryset()
        from core.permissions import get_user_role_safe
        if get_user_role_safe(self.request.user) == 'CLIENTE':
            return queryset.none()

        # Filtro por tipo de movimento
        tipo = self.request.query_params.get('tipo', None)
        if tipo:
            queryset = queryset.filter(tipo=tipo)

        # Filtro por local
        local = self.request.query_params.get('local', None)
        if local:
            queryset = queryset.filter(local_id=local)

        # Filtro por produto
        produto = self.request.query_params.get('produto', None)
        if produto:
            queryset = queryset.filter(produto_id=produto)

        # Filtro por data (após uma data)
        data_inicio = self.request.query_params.get('data_inicio', None)
        if data_inicio:
            queryset = queryset.filter(data_hora__gte=data_inicio)

        # Filtro por data (antes de uma data)
        data_fim = self.request.query_params.get('data_fim', None)
        if data_fim:
            queryset = queryset.filter(data_hora__lte=data_fim)

        return queryset

    @action(detail=False, methods=['get'])
    def ultimos(self, request):
        """Retorna os últimos movimentos (limite de 50)"""
        movimentos = self.get_queryset()[:50]
        serializer = self.get_serializer(movimentos, many=True)
        return Response(serializer.data)
