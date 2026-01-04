from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import MedicaoEquipamento, PlanoManutencaoItem

@receiver(post_save, sender=MedicaoEquipamento)
def atualiza_leitura(sender, instance: MedicaoEquipamento, created, **kwargs):
    if not created:
        return
    eq = instance.equipamento
    # atualiza leitura_atual se a nova for maior
    if instance.leitura is not None and instance.leitura >= eq.leitura_atual:
        eq.leitura_atual = instance.leitura
        eq.save(update_fields=["leitura_atual", "atualizado_em"])
        # recalc dos planos do equipamento
        planos = PlanoManutencaoItem.objects.filter(equipamento=eq, ativo=True)
        for p in planos:
            p.recalc_proximos(leitura_atual=eq.leitura_atual)
            p.save(update_fields=["proxima_leitura", "proxima_data", "atualizado_em"])
