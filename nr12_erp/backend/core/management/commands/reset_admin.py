from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from core.models import Profile

User = get_user_model()


class Command(BaseCommand):
    help = 'Reseta ou cria credenciais de administrador'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            default='admin',
            help='Username do administrador (padrão: admin)'
        )
        parser.add_argument(
            '--password',
            type=str,
            default='admin123',
            help='Nova senha do administrador (padrão: admin123)'
        )
        parser.add_argument(
            '--email',
            type=str,
            default='admin@mandacaru.com',
            help='Email do administrador (padrão: admin@mandacaru.com)'
        )

    def handle(self, *args, **options):
        username = options['username']
        password = options['password']
        email = options['email']

        # Verifica se o usuário já existe
        try:
            user = User.objects.get(username=username)
            self.stdout.write(
                self.style.WARNING(f'Usuário {username} já existe. Resetando senha...')
            )

            # Atualiza senha e email
            user.set_password(password)
            user.email = email
            user.is_staff = True
            user.is_superuser = True
            user.is_active = True
            user.save()

            # Atualiza ou cria perfil
            profile, created = Profile.objects.get_or_create(user=user)
            profile.role = 'ADMIN'
            profile.modules_enabled = [
                'dashboard',
                'clientes',
                'empreendimentos',
                'equipamentos',
                'tipos_equipamento',
                'operadores',
                'tecnicos',
                'supervisores',
                'manutencoes',
                'manutencao_preventiva',
                'nr12',
                'orcamentos',
                'ordens_servico',
                'almoxarifado',
                'abastecimentos',
                'financeiro',
                'relatorios',
            ]
            profile.save()

            self.stdout.write(
                self.style.SUCCESS(
                    f'\n[OK] Credenciais do administrador resetadas com sucesso!\n'
                    f'==========================================\n'
                    f'Username: {username}\n'
                    f'Password: {password}\n'
                    f'Email: {email}\n'
                    f'==========================================\n'
                )
            )

        except User.DoesNotExist:
            # Cria novo usuário administrador
            self.stdout.write(
                self.style.WARNING(f'Usuário {username} não existe. Criando...')
            )

            user = User.objects.create_superuser(
                username=username,
                email=email,
                password=password
            )

            # Atualiza ou cria perfil com todos os módulos habilitados
            # (o signal pode ter criado automaticamente)
            profile, created = Profile.objects.get_or_create(user=user)
            profile.role = 'ADMIN'
            profile.modules_enabled = [
                'dashboard',
                'clientes',
                'empreendimentos',
                'equipamentos',
                'tipos_equipamento',
                'operadores',
                'tecnicos',
                'supervisores',
                'manutencoes',
                'manutencao_preventiva',
                'nr12',
                'orcamentos',
                'ordens_servico',
                'almoxarifado',
                'abastecimentos',
                'financeiro',
                'relatorios',
            ]
            profile.save()

            self.stdout.write(
                self.style.SUCCESS(
                    f'\n[OK] Administrador criado com sucesso!\n'
                    f'==========================================\n'
                    f'Username: {username}\n'
                    f'Password: {password}\n'
                    f'Email: {email}\n'
                    f'==========================================\n'
                )
            )
