"""
Management command para corrigir clientes que nao tem user vinculado.
Cria usuario e profile CLIENTE para cada cliente sem user.
Tambem corrige profiles com role errado e modules_enabled incompletos.

Uso: python manage.py fix_clientes_sem_user
     python manage.py fix_clientes_sem_user --senha-padrao minhasenha123
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils.crypto import get_random_string
from cadastro.models import Cliente
from core.models import Profile


# Modulos que todo CLIENTE deve ter acesso (visualizacao dos proprios dados)
# NOTA: 'os' e 'ordens_servico' sao ambos necessarios (frontend usa 'os', backend usa 'ordens_servico')
CLIENTE_MODULES = [
    "dashboard",
    "clientes",
    "empreendimentos",
    "equipamentos",
    "nr12",
    "manutencoes",
    "abastecimentos",
    "orcamentos",
    "os",
    "ordens_servico",
    "relatorios",
    "compras",
    "financeiro",
]


class Command(BaseCommand):
    help = 'Corrige clientes sem user vinculado e profiles com role/modules errado'

    def add_arguments(self, parser):
        parser.add_argument(
            '--senha-padrao',
            type=str,
            default='',
            help='Senha padrao para novos usuarios (se nao informado, gera aleatoria)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Apenas mostra o que seria feito, sem alterar nada'
        )

    def handle(self, *args, **options):
        senha_padrao = options['senha_padrao']
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING("\n*** DRY RUN - nenhuma alteracao sera feita ***\n"))

        self.stdout.write("\n=== CORRIGINDO CLIENTES ===\n")

        credenciais = []

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

            if dry_run:
                self.stdout.write(f"  [DRY] Cliente #{c.id} '{c.nome_razao}' -> Criaria user {documento}")
                continue

            senha = senha_padrao or get_random_string(8)

            # Verifica se ja existe user com esse username
            if User.objects.filter(username=documento).exists():
                user = User.objects.get(username=documento)
                c.user = user
                c.save(update_fields=['user'])
                self.stdout.write(f"  Cliente #{c.id} -> Vinculado ao user existente #{user.id} '{user.username}'")
            else:
                # Cria novo user
                user = User.objects.create_user(
                    username=documento,
                    email=c.email_financeiro or f"{documento}@cliente.local",
                    password=senha,
                    first_name=(c.nome_razao or '').split()[0][:30] if c.nome_razao else '',
                )
                c.user = user
                c.save(update_fields=['user'])
                credenciais.append({
                    'cliente': c.nome_razao,
                    'username': documento,
                    'senha': senha,
                })
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  Cliente #{c.id} '{c.nome_razao}' -> User criado: {documento} / {senha}"
                    )
                )

            # Garante que o profile tem role CLIENTE com modules corretos
            self._fix_profile(user, c)

        # 2. Clientes COM user mas profile com role errado ou modules incompletos
        self.stdout.write("\n--- Verificando profiles de todos os clientes ---")
        clientes_com_user = Cliente.objects.filter(user__isnull=False)
        for c in clientes_com_user:
            if dry_run:
                try:
                    profile = c.user.profile
                    if profile.role != 'CLIENTE' or not self._has_all_modules(profile):
                        self.stdout.write(
                            f"  [DRY] Cliente #{c.id} '{c.nome_razao}' -> "
                            f"Role: {profile.role}, Modules: {len(profile.modules_enabled)} -> Seria corrigido"
                        )
                except Profile.DoesNotExist:
                    self.stdout.write(
                        f"  [DRY] Cliente #{c.id} '{c.nome_razao}' -> SEM PROFILE, seria criado"
                    )
                continue

            self._fix_profile(c.user, c)

        # 3. Resumo de credenciais criadas
        if credenciais:
            self.stdout.write(self.style.SUCCESS("\n=== CREDENCIAIS CRIADAS ==="))
            self.stdout.write("-" * 60)
            for cred in credenciais:
                self.stdout.write(f"  {cred['cliente']}")
                self.stdout.write(f"    Login: {cred['username']}")
                self.stdout.write(f"    Senha: {cred['senha']}")
                self.stdout.write("")

        self.stdout.write(self.style.SUCCESS("\n=== CORRECAO CONCLUIDA ===\n"))

    def _has_all_modules(self, profile):
        """Verifica se o profile tem todos os modulos obrigatorios do CLIENTE."""
        current = set(profile.modules_enabled or [])
        required = set(CLIENTE_MODULES)
        return required.issubset(current)

    def _fix_profile(self, user, cliente):
        """Garante que o profile do user tem role CLIENTE e todos os modules necessarios."""
        try:
            profile = user.profile
        except Profile.DoesNotExist:
            profile = Profile.objects.create(
                user=user,
                role='CLIENTE',
                modules_enabled=CLIENTE_MODULES
            )
            self.stdout.write(
                self.style.SUCCESS(f"    Profile CLIENTE criado para '{cliente.nome_razao}'")
            )
            return

        changed = False

        if profile.role != 'CLIENTE':
            old_role = profile.role
            profile.role = 'CLIENTE'
            changed = True
            self.stdout.write(
                self.style.SUCCESS(f"    '{cliente.nome_razao}' Role: {old_role} -> CLIENTE")
            )

        # Garante que todos os modules obrigatorios estao presentes
        current_modules = set(profile.modules_enabled or [])
        required_modules = set(CLIENTE_MODULES)
        missing = required_modules - current_modules

        if missing:
            profile.modules_enabled = list(current_modules | required_modules)
            changed = True
            self.stdout.write(
                self.style.SUCCESS(
                    f"    '{cliente.nome_razao}' Modules adicionados: {', '.join(sorted(missing))}"
                )
            )

        if changed:
            profile.save()
