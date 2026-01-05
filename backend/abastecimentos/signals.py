from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from .models import Abastecimento
from almoxarifado.models import MovimentoEstoque, Estoque
from equipamentos.models import MedicaoEquipamento


@receiver(pre_save, sender=Abastecimento)
def validar_leitura_abastecimento(sender, instance: Abastecimento, **kwargs):
    """
    Valida se a leitura do horímetro/km é maior que a última leitura registrada.
    """
    # Busca a última medição do equipamento
    ultima_medicao = MedicaoEquipamento.objects.filter(
        equipamento=instance.equipamento
    ).order_by('-leitura').first()

    if ultima_medicao and instance.horimetro_km < ultima_medicao.leitura:
        raise ValidationError(
            f"A leitura informada ({instance.horimetro_km}) é menor que a última leitura "
            f"registrada ({ultima_medicao.leitura}) do equipamento {instance.equipamento.codigo}"
        )

    # Também verifica a leitura atual do equipamento
    if instance.horimetro_km < instance.equipamento.leitura_atual:
        raise ValidationError(
            f"A leitura informada ({instance.horimetro_km}) é menor que a leitura atual "
            f"do equipamento ({instance.equipamento.leitura_atual})"
        )


@receiver(post_save, sender=Abastecimento)
def processar_abastecimento(sender, instance: Abastecimento, created, **kwargs):
    """
    Ao criar um abastecimento:
    1. Registra a medição do equipamento
    2. Cria movimento de saída no estoque (se produto e local estiverem definidos)
    3. Atualiza a leitura atual do equipamento
    """
    if not created:
        return

    # 1. Registra a medição
    MedicaoEquipamento.objects.create(
        equipamento=instance.equipamento,
        origem='ABASTECIMENTO',
        leitura=instance.horimetro_km,
        observacao=f"Abastecimento de {instance.quantidade_litros}L"
    )

    # 2. Cria movimento de estoque (se produto e local estiverem definidos)
    if instance.produto and instance.local_estoque:
        MovimentoEstoque.objects.create(
            produto=instance.produto,
            local=instance.local_estoque,
            tipo='SAIDA',
            quantidade=instance.quantidade_litros,
            documento=f"ABAST-{instance.pk}",
            observacao=f"Abastecimento do equipamento {instance.equipamento.codigo}",
            abastecimento=instance
        )

    # 3. Atualiza leitura atual do equipamento
    if instance.horimetro_km > instance.equipamento.leitura_atual:
        instance.equipamento.leitura_atual = instance.horimetro_km
        instance.equipamento.save(update_fields=['leitura_atual'])
