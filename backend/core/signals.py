from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Profile

@receiver(post_save, sender=User)
def create_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance, role="ADMIN", modules_enabled=[
            "clientes","empreendimentos","equipamentos","nr12","manutencoes","abastecimentos","almoxarifado","os","orcamentos","compras"
        ])
