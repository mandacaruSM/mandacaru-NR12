from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from .models import ChecklistRealizado
from equipamentos.models import MedicaoEquipamento


@receiver(pre_save, sender=ChecklistRealizado)
def validar_leitura_checklist(sender, instance: ChecklistRealizado, **kwargs):
    """
    Valida se a leitura do horímetro/km é maior que a última leitura registrada.
    """
    # Só valida se houver leitura informada
    if not instance.leitura_equipamento:
        return

    # Busca a última medição do equipamento
    ultima_medicao = MedicaoEquipamento.objects.filter(
        equipamento=instance.equipamento
    ).order_by('-leitura').first()

    if ultima_medicao and instance.leitura_equipamento < ultima_medicao.leitura:
        raise ValidationError(
            f"A leitura informada ({instance.leitura_equipamento}) é menor que a última leitura "
            f"registrada ({ultima_medicao.leitura}) do equipamento {instance.equipamento.codigo}"
        )

    # Também verifica a leitura atual do equipamento
    if instance.leitura_equipamento < instance.equipamento.leitura_atual:
        raise ValidationError(
            f"A leitura informada ({instance.leitura_equipamento}) é menor que a leitura atual "
            f"do equipamento ({instance.equipamento.leitura_atual})"
        )


@receiver(post_save, sender=ChecklistRealizado)
def registrar_medicao_checklist(sender, instance: ChecklistRealizado, created, **kwargs):
    """
    Registra a medição do equipamento quando um checklist é finalizado.
    """
    # Só registra se houver leitura e o checklist estiver concluído
    if not instance.leitura_equipamento or instance.status != 'CONCLUIDO':
        return

    # Verifica se já existe uma medição para este checklist
    medicao_exists = MedicaoEquipamento.objects.filter(
        equipamento=instance.equipamento,
        origem='CHECKLIST',
        leitura=instance.leitura_equipamento,
        observacao__contains=f"Checklist #{instance.pk}"
    ).exists()

    if medicao_exists:
        return

    # Registra a medição
    MedicaoEquipamento.objects.create(
        equipamento=instance.equipamento,
        origem='CHECKLIST',
        leitura=instance.leitura_equipamento,
        observacao=f"Checklist #{instance.pk} - {instance.modelo.nome}"
    )

    # Atualiza leitura atual do equipamento se for maior
    if instance.leitura_equipamento > instance.equipamento.leitura_atual:
        instance.equipamento.leitura_atual = instance.leitura_equipamento
        instance.equipamento.save(update_fields=['leitura_atual'])
