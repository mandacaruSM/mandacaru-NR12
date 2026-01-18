from django.core.management.base import BaseCommand
from cadastro.planos import Plano


class Command(BaseCommand):
    help = 'Popula o banco de dados com os planos de assinatura do sistema'

    def handle(self, *args, **options):
        self.stdout.write('Criando planos de assinatura...\n')

        planos_config = [
            {
                'nome': 'Plano Essencial',
                'tipo': 'ESSENCIAL',
                'descricao': 'Plano ideal para pequenas operações, oficinas e empresas com poucos ativos',
                'valor_mensal': 297.00,
                'limite_usuarios': 5,
                'limite_equipamentos': 0,  # ilimitado
                'limite_empreendimentos': 0,  # ilimitado
                'modulos_habilitados': [
                    'dashboard',
                    'clientes',
                    'empreendimentos',
                    'equipamentos',
                    'tipos_equipamento',
                    'manutencoes',
                    'relatorios',
                ],
                'bot_telegram': False,
                'qr_code_equipamento': False,
                'checklist_mobile': False,
                'backups_automaticos': False,
                'suporte_prioritario': False,
                'suporte_whatsapp': False,
                'multiempresa': False,
                'customizacoes': False,
                'hospedagem_dedicada': False,
                'ordem': 1,
            },
            {
                'nome': 'Plano Profissional',
                'tipo': 'PROFISSIONAL',
                'descricao': 'Plano principal para empresas médias, terceirizadas de manutenção e mineração regional',
                'valor_mensal': 597.00,
                'limite_usuarios': 15,
                'limite_equipamentos': 0,  # ilimitado
                'limite_empreendimentos': 0,  # ilimitado
                'modulos_habilitados': [
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
                    'financeiro',
                    'relatorios',
                ],
                'bot_telegram': False,
                'qr_code_equipamento': True,
                'checklist_mobile': False,
                'backups_automaticos': False,
                'suporte_prioritario': True,
                'suporte_whatsapp': False,
                'multiempresa': False,
                'customizacoes': False,
                'hospedagem_dedicada': False,
                'ordem': 2,
            },
            {
                'nome': 'Plano Avançado',
                'tipo': 'AVANCADO',
                'descricao': 'Plano diferenciado para operações intensivas, contratos de manutenção e grandes frotas',
                'valor_mensal': 997.00,
                'limite_usuarios': 0,  # ilimitado
                'limite_equipamentos': 0,  # ilimitado
                'limite_empreendimentos': 0,  # ilimitado
                'modulos_habilitados': [
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
                ],
                'bot_telegram': True,
                'qr_code_equipamento': True,
                'checklist_mobile': True,
                'backups_automaticos': True,
                'suporte_prioritario': True,
                'suporte_whatsapp': True,
                'multiempresa': False,
                'customizacoes': False,
                'hospedagem_dedicada': False,
                'ordem': 3,
            },
            {
                'nome': 'Plano Enterprise',
                'tipo': 'ENTERPRISE',
                'descricao': 'Plano sob contrato para grandes mineradoras, indústrias e contratos de longo prazo',
                'valor_mensal': 1500.00,
                'limite_usuarios': 0,  # ilimitado
                'limite_equipamentos': 0,  # ilimitado
                'limite_empreendimentos': 0,  # ilimitado
                'modulos_habilitados': [
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
                ],
                'bot_telegram': True,
                'qr_code_equipamento': True,
                'checklist_mobile': True,
                'backups_automaticos': True,
                'suporte_prioritario': True,
                'suporte_whatsapp': True,
                'multiempresa': True,
                'customizacoes': True,
                'hospedagem_dedicada': True,
                'ordem': 4,
            },
        ]

        for plano_data in planos_config:
            plano, created = Plano.objects.update_or_create(
                tipo=plano_data['tipo'],
                defaults=plano_data
            )

            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'[CRIADO] {plano.nome} - R$ {plano.valor_mensal}/mês')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'[ATUALIZADO] {plano.nome} - R$ {plano.valor_mensal}/mês')
                )

        self.stdout.write(
            self.style.SUCCESS(f'\n[OK] {len(planos_config)} planos configurados com sucesso!')
        )

        # Mostra resumo dos planos
        self.stdout.write('\n' + '='*60)
        self.stdout.write('RESUMO DOS PLANOS:')
        self.stdout.write('='*60)

        for plano in Plano.objects.all().order_by('ordem'):
            self.stdout.write(f'\n{plano.nome}')
            self.stdout.write(f'  Valor: R$ {plano.valor_mensal}/mês')
            self.stdout.write(f'  Usuários: {plano.limite_usuarios if plano.limite_usuarios > 0 else "Ilimitados"}')
            self.stdout.write(f'  Módulos: {len(plano.modulos_habilitados)}')
            self.stdout.write(f'  Features especiais:')
            if plano.bot_telegram:
                self.stdout.write('    - Bot Telegram')
            if plano.qr_code_equipamento:
                self.stdout.write('    - QR Code por equipamento')
            if plano.checklist_mobile:
                self.stdout.write('    - Checklist mobile')
            if plano.backups_automaticos:
                self.stdout.write('    - Backups automáticos')
            if plano.suporte_whatsapp:
                self.stdout.write('    - Suporte WhatsApp')
            elif plano.suporte_prioritario:
                self.stdout.write('    - Suporte prioritário')
            if plano.multiempresa:
                self.stdout.write('    - Multi-empresa')
            if plano.customizacoes:
                self.stdout.write('    - Customizações')
            if plano.hospedagem_dedicada:
                self.stdout.write('    - Hospedagem dedicada')

        self.stdout.write('\n' + '='*60 + '\n')
