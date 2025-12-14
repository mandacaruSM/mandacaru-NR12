from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from .models import Manutencao
from equipamentos.models import MedicaoEquipamento


@receiver(pre_save, sender=Manutencao)
def validar_leitura_manutencao(sender, instance: Manutencao, **kwargs):
    """
    Valida se a leitura do horímetro/km é maior que a última leitura registrada.
    """
    # Busca a última medição do equipamento
    ultima_medicao = MedicaoEquipamento.objects.filter(
        equipamento=instance.equipamento
    ).order_by('-leitura').first()

    if ultima_medicao and instance.horimetro < ultima_medicao.leitura:
        raise ValidationError(
            f"A leitura informada ({instance.horimetro}) é menor que a última leitura "
            f"registrada ({ultima_medicao.leitura}) do equipamento {instance.equipamento.codigo}"
        )

    # Também verifica a leitura atual do equipamento
    if instance.horimetro < instance.equipamento.leitura_atual:
        raise ValidationError(
            f"A leitura informada ({instance.horimetro}) é menor que a leitura atual "
            f"do equipamento ({instance.equipamento.leitura_atual})"
        )


@receiver(post_save, sender=Manutencao)
def registrar_medicao_manutencao(sender, instance: Manutencao, created, **kwargs):
    """
    Registra a medição do equipamento quando uma manutenção é criada.
    """
    if not created:
        return

    # Registra a medição
    MedicaoEquipamento.objects.create(
        equipamento=instance.equipamento,
        origem='MANUTENCAO',
        leitura=instance.horimetro,
        observacao=f"Manutenção {instance.get_tipo_display()}: {instance.descricao[:100]}"
    )

    # Atualiza leitura atual do equipamento se for maior
    if instance.horimetro > instance.equipamento.leitura_atual:
        instance.equipamento.leitura_atual = instance.horimetro
        instance.equipamento.save(update_fields=['leitura_atual'])
