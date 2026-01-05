from django.db import transaction
from .models import Estoque, MovimentoEstoque

@transaction.atomic
def lancar_movimento(*, produto, local, tipo, quantidade, documento='', obs='', criado_por=None, abastecimento=None):
    mov = MovimentoEstoque.objects.create(
        produto=produto, local=local, tipo=tipo, quantidade=quantidade,
        documento=documento, observacao=obs, criado_por=criado_por, abastecimento=abastecimento
    )
    est, _ = Estoque.objects.select_for_update().get_or_create(produto=produto, local=local)
    if tipo == 'ENTRADA':
        est.saldo = (est.saldo or 0) + quantidade
    elif tipo == 'SAIDA':
        est.saldo = (est.saldo or 0) - quantidade
    est.save()
    return mov
