from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import RegistroAbastecimento
from almoxarifado.models import Produto, LocalEstoque
from almoxarifado.services import lancar_movimento

@receiver(post_save, sender=RegistroAbastecimento)
def sincronizar_estoque_abastecimento(sender, instance: RegistroAbastecimento, created, **kwargs):
    # Evitar duplicar movimentos em updates
    if not created:
        return

    produto = Produto.objects.get(id=instance.tipo_combustivel.produto_id)  # relacione TipoCombustivel -> Produto
    documento = f"ABAST-{instance.pk}"

    if instance.origem == 'ALMOX':
        # Saída do Tanque interno
        local_tanque = LocalEstoque.objects.get(tipo='TANQUE')  # refine por pk/campo se houver mais de um
        lancar_movimento(
            produto=produto,
            local=local_tanque,
            tipo='SAIDA',
            quantidade=instance.quantidade_litros,
            documento=documento,
            abastecimento=instance
        )

    elif instance.origem == 'POSTO':
        # 1) Entrada automática no "Posto" (recebimento) -> representa compra/entrada no sistema
        local_posto = LocalEstoque.objects.get(tipo='POSTO')  # refine por pk/campo
        lancar_movimento(
            produto=produto,
            local=local_posto,
            tipo='ENTRADA',
            quantidade=instance.quantidade_litros,
            documento=documento,
            abastecimento=instance
        )
        # 2) Saída automática do "Posto" para o equipamento (consumo)
        lancar_movimento(
            produto=produto,
            local=local_posto,
            tipo='SAIDA',
            quantidade=instance.quantidade_litros,
            documento=documento,
            abastecimento=instance
        )
