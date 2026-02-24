# backend/manutencao/management/commands/verificar_manutencoes.py
"""
Comando Django para verificar e criar alertas de manutenção automaticamente
Executar via: python manage.py verificar_manutencoes
Ou agendar via cron: */30 * * * * cd /path && python manage.py verificar_manutencoes
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from manutencao.models_alertas import GatilhoManutencao, ManutencaoAlerta
from equipamentos.models import Equipamento


class Command(BaseCommand):
    help = 'Verifica gatilhos de manutenção e cria alertas automáticos'

    def add_arguments(self, parser):
        parser.add_argument(
            '--equipamento',
            type=str,
            help='Código específico do equipamento (opcional)',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Força verificação mesmo se já foi executada recentemente',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('='*70))
        self.stdout.write(self.style.SUCCESS(f'Iniciando verificação de manutenções - {timezone.now()}'))
        self.stdout.write(self.style.SUCCESS('='*70))

        # Filtrar equipamentos
        if options['equipamento']:
            equipamentos = Equipamento.objects.filter(codigo=options['equipamento'], ativo=True)
            if not equipamentos.exists():
                self.stdout.write(self.style.ERROR(f"Equipamento '{options['equipamento']}' não encontrado"))
                return
        else:
            equipamentos = Equipamento.objects.filter(ativo=True)

        total_equipamentos = equipamentos.count()
        total_gatilhos = 0
        total_alertas_criados = 0
        total_alertas_atualizados = 0

        self.stdout.write(f"\n📋 Verificando {total_equipamentos} equipamento(s)...\n")

        for equipamento in equipamentos:
            self.stdout.write(f"\n🔧 {equipamento.codigo} - {equipamento.descricao}")
            self.stdout.write(f"   Leitura atual: {equipamento.leitura_atual} {equipamento.get_tipo_medicao_display()}")

            gatilhos = GatilhoManutencao.objects.filter(
                equipamento=equipamento,
                ativo=True
            )

            if not gatilhos.exists():
                self.stdout.write(self.style.WARNING(f"   ⚠️  Nenhum gatilho configurado"))
                continue

            for gatilho in gatilhos:
                total_gatilhos += 1

                # Calcula próxima execução se necessário
                if not gatilho.proxima_execucao_leitura and not gatilho.proxima_execucao_data:
                    gatilho.calcular_proxima_execucao()

                # Verifica e cria alerta
                alerta_criado = gatilho.verificar_e_criar_alerta()

                if alerta_criado:
                    if alerta_criado.criado_em >= timezone.now() - timezone.timedelta(minutes=5):
                        total_alertas_criados += 1
                        self.stdout.write(self.style.WARNING(
                            f"   🚨 NOVO ALERTA: {gatilho.nome} "
                            f"[{alerta_criado.get_prioridade_display()}]"
                        ))
                    else:
                        total_alertas_atualizados += 1
                        self.stdout.write(self.style.WARNING(
                            f"   🔄 ATUALIZADO: {gatilho.nome} "
                            f"[{alerta_criado.get_prioridade_display()}]"
                        ))

                    # Mostra detalhes do alerta
                    self.stdout.write(f"      {alerta_criado.mensagem}")

                    # Gera requisição de peças se aplicável
                    itens = gatilho.gerar_requisicao_pecas()
                    if itens:
                        self.stdout.write(f"      📦 Itens necessários:")
                        for item in itens:
                            self.stdout.write(f"         - {item.produto.nome}: {item.quantidade} {item.produto.unidade}")
                else:
                    self.stdout.write(self.style.SUCCESS(f"   ✅ {gatilho.nome} - OK"))

        # Resumo final
        self.stdout.write('\n' + '='*70)
        self.stdout.write(self.style.SUCCESS('RESUMO DA VERIFICAÇÃO'))
        self.stdout.write('='*70)
        self.stdout.write(f"Equipamentos verificados: {total_equipamentos}")
        self.stdout.write(f"Gatilhos processados: {total_gatilhos}")
        self.stdout.write(self.style.WARNING(f"Alertas NOVOS criados: {total_alertas_criados}"))
        self.stdout.write(self.style.WARNING(f"Alertas ATUALIZADOS: {total_alertas_atualizados}"))

        # Mostra alertas pendentes
        alertas_pendentes = ManutencaoAlerta.objects.filter(resolvido=False).count()
        alertas_criticos = ManutencaoAlerta.objects.filter(
            resolvido=False,
            prioridade__in=['ALTA', 'CRITICA']
        ).count()

        self.stdout.write(f"\n⚠️  Alertas pendentes no sistema: {alertas_pendentes}")
        if alertas_criticos > 0:
            self.stdout.write(self.style.ERROR(f"🚨 Alertas CRÍTICOS/ALTOS: {alertas_criticos}"))

        self.stdout.write('\n' + self.style.SUCCESS('✅ Verificação concluída!'))
