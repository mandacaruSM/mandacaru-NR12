from django.db import transaction
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from .models import MovimentoEstoque, Estoque


@receiver(pre_save, sender=MovimentoEstoque)
def validar_saldo_antes_movimento(sender, instance: MovimentoEstoque, **kwargs):
    """
    Valida se há saldo suficiente antes de permitir uma saída.
    """
    if instance.tipo == 'SAIDA':
        try:
            estoque = Estoque.objects.get(produto=instance.produto, local=instance.local)
            if estoque.saldo < instance.quantidade:
                raise ValidationError(
                    f"Saldo insuficiente para {instance.produto.nome} no local {instance.local.nome}. "
                    f"Saldo atual: {estoque.saldo}, Quantidade solicitada: {instance.quantidade}"
                )
        except Estoque.DoesNotExist:
            raise ValidationError(
                f"Não existe estoque de {instance.produto.nome} no local {instance.local.nome}"
            )


@receiver(post_save, sender=MovimentoEstoque)
def atualizar_saldo_estoque(sender, instance: MovimentoEstoque, created, **kwargs):
    """
    Atualiza automaticamente o saldo do estoque quando um movimento é criado.
    """
    if not created:
        return

    with transaction.atomic():
        # Obtém ou cria o registro de estoque
        estoque, _ = Estoque.objects.select_for_update().get_or_create(
            produto=instance.produto,
            local=instance.local,
            defaults={'saldo': 0}
        )

        # Atualiza o saldo baseado no tipo de movimento
        if instance.tipo == 'ENTRADA':
            estoque.saldo += instance.quantidade
        elif instance.tipo == 'SAIDA':
            estoque.saldo -= instance.quantidade
        elif instance.tipo == 'AJUSTE':
            # No ajuste, a quantidade representa o novo saldo
            estoque.saldo = instance.quantidade

        estoque.save()


@receiver(post_delete, sender=MovimentoEstoque)
def reverter_saldo_ao_deletar(sender, instance: MovimentoEstoque, **kwargs):
    """
    Reverte o saldo quando um movimento é deletado.
    """
    try:
        with transaction.atomic():
            estoque = Estoque.objects.select_for_update().get(
                produto=instance.produto,
                local=instance.local
            )

            # Reverte o movimento
            if instance.tipo == 'ENTRADA':
                estoque.saldo -= instance.quantidade
            elif instance.tipo == 'SAIDA':
                estoque.saldo += instance.quantidade
            # AJUSTE não pode ser revertido automaticamente

            if estoque.saldo < 0:
                estoque.saldo = 0

            estoque.save()
    except Estoque.DoesNotExist:
        pass  # Se não existe estoque, não há nada a reverter
