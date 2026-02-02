"""
Management command para corrigir clientes que nao tem user vinculado.
Cria usuario e profile CLIENTE para cada cliente sem user.
Tambem corrige profiles com role errado.

Uso: python manage.py fix_clientes_sem_user
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils.crypto import get_random_string
from cadastro.models import Cliente
from core.models import Profile


class Command(BaseCommand):
    help = 'Corrige clientes sem user vinculado e profiles com role errado'

    def handle(self, *args, **options):
        self.stdout.write("\n=== CORRIGINDO CLIENTES ===\n")

        # 1. Clientes sem user vinculado
        clientes_sem_user = Cliente.objects.filter(user__isnull=True)
        self.stdout.write(f"Clientes sem user: {clientes_sem_user.count()}")

        for c in clientes_sem_user:
            documento = ''.join(filter(str.isdigit, c.documento or ''))
            if not documento:
                self.stdout.write(
                    self.style.WARNING(f"  Cliente #{c.id} '{c.nome_razao}' -> SEM DOCUMENTO, pulando")
                )
                continue

            # Verifica se ja existe user com esse username
            if User.objects.filter(username=documento).exists():
                user = User.objects.get(username=documento)
                c.user = user
                c.save(update_fields=['user'])
                self.stdout.write(f"  Cliente #{c.id} -> Vinculado ao user existente #{user.id} '{user.username}'")
            else:
                # Cria novo user
                senha = get_random_string(8)
                user = User.objects.create_user(
                    username=documento,
                    email=c.email_financeiro or f"{documento}@cliente.local",
                    password=senha,
                    first_name=(c.nome_razao or '').split()[0][:30] if c.nome_razao else '',
                )
                c.user = user
                c.save(update_fields=['user'])
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  Cliente #{c.id} '{c.nome_razao}' -> User criado: {documento} / {senha}"
                    )
                )

            # Garante que o profile tem role CLIENTE
            try:
                profile = user.profile
                if profile.role != 'CLIENTE':
                    old_role = profile.role
                    profile.role = 'CLIENTE'
                    # Define modulos padrao para cliente
                    from cadastro.planos import Plano
                    plano = Plano.objects.filter(tipo='ESSENCIAL').first()
                    if plano:
                        profile.modules_enabled = plano.modulos_habilitados
                    else:
                        profile.modules_enabled = ["dashboard", "empreendimentos", "equipamentos", "relatorios"]
                    profile.save()
                    self.stdout.write(
                        self.style.SUCCESS(f"    Profile corrigido: {old_role} -> CLIENTE")
                    )
            except Profile.DoesNotExist:
                Profile.objects.create(
                    user=user,
                    role='CLIENTE',
                    modules_enabled=["dashboard", "empreendimentos", "equipamentos", "relatorios"]
                )
                self.stdout.write(self.style.SUCCESS(f"    Profile CLIENTE criado"))

        # 2. Clientes COM user mas profile com role errado
        self.stdout.write("\n--- Verificando profiles de clientes com user ---")
        clientes_com_user = Cliente.objects.filter(user__isnull=False)
        for c in clientes_com_user:
            try:
                profile = c.user.profile
                if profile.role != 'CLIENTE':
                    old_role = profile.role
                    profile.role = 'CLIENTE'
                    profile.save()
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"  Cliente #{c.id} '{c.nome_razao}' -> User #{c.user.id} role corrigido: {old_role} -> CLIENTE"
                        )
                    )
            except Profile.DoesNotExist:
                pass

        self.stdout.write(self.style.SUCCESS("\n=== CORRECAO CONCLUIDA ===\n"))
