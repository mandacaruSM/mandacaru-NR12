"""
Management command para limpar fotos de checklists com mais de 15 dias.

Uso:
    python manage.py limpar_fotos_antigas
    python manage.py limpar_fotos_antigas --dias 30
    python manage.py limpar_fotos_antigas --dry-run
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Remove fotos de respostas de checklist com mais de N dias (padrão: 15)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dias',
            type=int,
            default=15,
            help='Número de dias para manter as fotos (padrão: 15)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Apenas lista o que seria removido, sem apagar nada',
        )

    def handle(self, *args, **options):
        from nr12.models import RespostaItemChecklist

        dias = options['dias']
        dry_run = options['dry_run']
        data_limite = timezone.now() - timedelta(days=dias)

        respostas_com_foto = RespostaItemChecklist.objects.filter(
            foto__isnull=False,
            data_hora_resposta__lt=data_limite,
        ).exclude(foto='')

        total = respostas_com_foto.count()

        if total == 0:
            self.stdout.write(self.style.SUCCESS('Nenhuma foto antiga encontrada.'))
            return

        self.stdout.write(f'Encontradas {total} fotos com mais de {dias} dias.')

        if dry_run:
            self.stdout.write(self.style.WARNING('Modo dry-run: nenhuma foto será apagada.'))
            for r in respostas_com_foto[:20]:
                self.stdout.write(f'  - Resposta #{r.id} | Checklist #{r.checklist_id} | {r.data_hora_resposta:%d/%m/%Y} | {r.foto.name}')
            if total > 20:
                self.stdout.write(f'  ... e mais {total - 20} fotos.')
            return

        removidas = 0
        erros = 0
        for resposta in respostas_com_foto:
            try:
                resposta.foto.delete(save=False)
                resposta.foto = None
                resposta.save(update_fields=['foto'])
                removidas += 1
            except Exception as e:
                erros += 1
                logger.warning(f'Erro ao remover foto da resposta #{resposta.id}: {e}')

        self.stdout.write(
            self.style.SUCCESS(f'Concluído: {removidas} fotos removidas, {erros} erros.')
        )
