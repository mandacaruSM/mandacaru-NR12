from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import PedidoCompra, StatusPedido


@receiver(post_save, sender=PedidoCompra)
def processar_entrega_pedido(sender, instance, **kwargs):
    """
    Quando o status muda para ENTREGUE:
    - Dá entrada no almoxarifado para cada item
    - Cria Produto no almoxarifado se não existir
    - Registra MovimentoEstoque de ENTRADA
    """
    if instance.status != StatusPedido.ENTREGUE:
        return

    # Evitar processamento duplo
    if not instance.data_entrega:
        return

    from almoxarifado.models import Produto, Estoque, MovimentoEstoque, LocalEstoque, CategoriaProduto, UnidadeMedida

    local = instance.local_estoque
    if not local:
        # Se não tem local definido, tenta pegar o primeiro almoxarifado
        local = LocalEstoque.objects.filter(tipo='ALMOX').first()
        if not local:
            return

    for item in instance.itens.all():
        # Só processar itens ainda não marcados como entregues
        if item.entregue:
            continue

        produto = item.produto
        if not produto:
            # Criar produto no almoxarifado se não existe
            categoria = CategoriaProduto.objects.first()
            unidade = UnidadeMedida.objects.filter(sigla='UN').first() or UnidadeMedida.objects.first()
            if not categoria or not unidade:
                continue  # Sem categoria/unidade, não cria

            produto = Produto.objects.create(
                nome=item.descricao[:120],
                codigo=f"PC-{instance.numero}-{item.id}",
                tipo='PECA',
                categoria=categoria,
                unidade=unidade,
            )
            item.produto = produto

        # Dar entrada no estoque
        estoque, _ = Estoque.objects.get_or_create(
            produto=produto,
            local=local,
            defaults={'saldo': 0}
        )
        estoque.saldo += item.quantidade
        estoque.save()

        # Registrar movimento
        MovimentoEstoque.objects.create(
            produto=produto,
            local=local,
            tipo='ENTRADA',
            quantidade=item.quantidade,
            documento=f"PC-{instance.numero} NF:{instance.numero_nf or 'S/N'}",
            observacao=f"Recebimento pedido de compra PC-{instance.numero}",
            criado_por=instance.criado_por,
        )

        # Marcar item como entregue
        item.quantidade_recebida = item.quantidade
        item.entregue = True
        item.save()
