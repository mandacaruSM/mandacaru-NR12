from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import RegistroAbastecimento
from almoxarifado.models import LocalEstoque
from almoxarifado.services import lancar_movimento

@receiver(post_save, sender=RegistroAbastecimento)
def sincronizar_estoque_abastecimento(sender, instance: RegistroAbastecimento, created, **kwargs):
    if not created:
        return
    # combustível vinculado a Produto:
    produto = getattr(getattr(instance, "tipo_combustivel", None), "produto", None)
    if not produto:
        return

    doc = f"ABAST-{instance.pk}"

    if instance.origem == 'ALMOX':
        local = LocalEstoque.objects.get(tipo='TANQUE')      # ajuste se houver vários tanques
        lancar_movimento(produto=produto, local=local, tipo='SAIDA',
                         quantidade=instance.quantidade_litros, documento=doc, abastecimento=instance)

    elif instance.origem == 'POSTO':
        local = LocalEstoque.objects.get(tipo='POSTO')       # ajuste para selecionar o posto correto
        lancar_movimento(produto=produto, local=local, tipo='ENTRADA',
                         quantidade=instance.quantidade_litros, documento=doc, abastecimento=instance)
        lancar_movimento(produto=produto, local=local, tipo='SAIDA',
                         quantidade=instance.quantidade_litros, documento=doc, abastecimento=instance)
