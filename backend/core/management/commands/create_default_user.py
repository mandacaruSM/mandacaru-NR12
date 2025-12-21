from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from core.models import UserProfile

User = get_user_model()


class Command(BaseCommand):
    help = 'Cria usuário admin padrão se não existir'

    def handle(self, *args, **options):
        username = 'admin'
        email = 'admin@nr12.com'
        password = 'admin123'

        if User.objects.filter(username=username).exists():
            self.stdout.write(
                self.style.WARNING(f'Usuário {username} já existe!')
            )
            return

        # Criar usuário
        user = User.objects.create_superuser(
            username=username,
            email=email,
            password=password
        )

        # Criar perfil com todos os módulos habilitados
        UserProfile.objects.create(
            user=user,
            role='admin',
            modules_enabled=[
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
        )

        self.stdout.write(
            self.style.SUCCESS(
                f'✅ Usuário criado com sucesso!\n'
                f'Username: {username}\n'
                f'Password: {password}\n'
                f'Email: {email}'
            )
        )
