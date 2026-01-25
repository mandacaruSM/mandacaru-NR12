"""
Comando para criar assinaturas para clientes que não possuem
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from datetime import date, timedelta
from cadastro.models import Cliente
from cadastro.planos import Plano, AssinaturaCliente


class Command(BaseCommand):
    help = 'Cria assinaturas para clientes que não possuem'

    def handle(self, *args, **options):
        self.stdout.write('[INÍCIO] Verificando clientes sem assinatura...\n')

        # Busca o plano padrão (Essencial)
        try:
            plano_padrao = Plano.objects.filter(tipo='ESSENCIAL', ativo=True).first()
            if not plano_padrao:
                self.stdout.write(self.style.ERROR('[ERRO] Plano Essencial não encontrado. Execute: python manage.py seed_planos'))
                return
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'[ERRO] Erro ao buscar plano: {e}'))
            return

        self.stdout.write(f'[OK] Plano padrão: {plano_padrao.nome}\n')

        # Busca todos os clientes
        clientes = Cliente.objects.all()
        total = clientes.count()
        criados = 0
        ja_existentes = 0
        erros = 0

        self.stdout.write(f'[INFO] Total de clientes: {total}\n')

        for cliente in clientes:
            try:
                # Verifica se já tem assinatura
                if hasattr(cliente, 'assinatura') and cliente.assinatura:
                    ja_existentes += 1
                    self.stdout.write(f'  [OK] {cliente.nome_razao} - JÁ TEM ASSINATURA')
                    continue

                # Cria assinatura com trial de 30 dias
                AssinaturaCliente.objects.create(
                    cliente=cliente,
                    plano=plano_padrao,
                    status='TRIAL',
                    data_inicio=date.today(),
                    data_fim_trial=date.today() + timedelta(days=30),
                    data_proximo_pagamento=date.today() + timedelta(days=30)
                )

                # Atualiza módulos do usuário se existir
                if cliente.user and hasattr(cliente.user, 'profile'):
                    profile = cliente.user.profile
                    profile.modules_enabled = plano_padrao.modulos_habilitados
                    profile.save()
                    self.stdout.write(f'  [OK] {cliente.nome_razao} - ASSINATURA CRIADA (com usuário)')
                else:
                    self.stdout.write(f'  [OK] {cliente.nome_razao} - ASSINATURA CRIADA (sem usuário)')

                criados += 1

            except Exception as e:
                erros += 1
                self.stdout.write(self.style.ERROR(f'  [ERRO] {cliente.nome_razao} - ERRO: {e}'))

        # Resumo
        self.stdout.write('\n' + '='*60)
        self.stdout.write('[RESUMO]')
        self.stdout.write(f'  Total de clientes: {total}')
        self.stdout.write(self.style.SUCCESS(f'  Assinaturas criadas: {criados}'))
        self.stdout.write(f'  Já existentes: {ja_existentes}')
        if erros > 0:
            self.stdout.write(self.style.ERROR(f'  Erros: {erros}'))
        self.stdout.write('='*60)
        self.stdout.write(self.style.SUCCESS('\n[CONCLUÍDO]'))
