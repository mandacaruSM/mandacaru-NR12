"""
Management command para diagnosticar problemas de isolamento de dados por cliente.
Uso: python manage.py diagnosticar_clientes
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from cadastro.models import Cliente
from core.models import Profile


class Command(BaseCommand):
    help = 'Diagnostica o estado dos clientes, users e profiles para verificar isolamento de dados'

    def handle(self, *args, **options):
        self.stdout.write("\n=== DIAGNOSTICO DE CLIENTES ===\n")

        # 1. Listar todos os clientes e seus users
        clientes = Cliente.objects.all()
        self.stdout.write(f"Total de clientes: {clientes.count()}")

        for c in clientes:
            user = c.user
            if user:
                try:
                    profile = user.profile
                    role = profile.role
                    modules = profile.modules_enabled
                except Profile.DoesNotExist:
                    role = "SEM PROFILE"
                    modules = []

                self.stdout.write(
                    f"  Cliente #{c.id} '{c.nome_razao}' -> "
                    f"User #{user.id} '{user.username}' | "
                    f"Role: {role} | "
                    f"Modules: {len(modules)}"
                )
                if role != 'CLIENTE':
                    self.stdout.write(
                        self.style.ERROR(f"    *** PROBLEMA: Role deveria ser CLIENTE, mas e {role} ***")
                    )
            else:
                self.stdout.write(
                    self.style.WARNING(f"  Cliente #{c.id} '{c.nome_razao}' -> SEM USER VINCULADO")
                )

        # 2. Verificar reverse relation
        self.stdout.write("\n=== USERS COM ROLE CLIENTE ===\n")
        cliente_profiles = Profile.objects.filter(role='CLIENTE')
        for p in cliente_profiles:
            user = p.user
            has_cliente = hasattr(user, 'cliente_profile')
            try:
                cliente = user.cliente_profile if has_cliente else None
            except Cliente.DoesNotExist:
                cliente = None

            if cliente:
                self.stdout.write(
                    f"  User #{user.id} '{user.username}' -> "
                    f"Cliente #{cliente.id} '{cliente.nome_razao}' [OK]"
                )
            else:
                self.stdout.write(
                    self.style.ERROR(
                        f"  User #{user.id} '{user.username}' -> SEM CLIENTE VINCULADO (cliente_profile nao existe)"
                    )
                )

        # 3. Users com profile ADMIN que nao sao superuser
        self.stdout.write("\n=== USERS ADMIN NAO-SUPERUSER ===\n")
        admin_profiles = Profile.objects.filter(role='ADMIN')
        for p in admin_profiles:
            user = p.user
            if not user.is_superuser:
                self.stdout.write(
                    self.style.WARNING(
                        f"  User #{user.id} '{user.username}' | Role: ADMIN | Superuser: {user.is_superuser}"
                    )
                )

        self.stdout.write("\n=== FIM DO DIAGNOSTICO ===\n")
