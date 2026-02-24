# Generated migration for enhanced equipment tracking
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('equipamentos', '0007_historicalequipamento_consumo_nominal_l_h_and_more'),
    ]

    operations = [
        # Adiciona data da última leitura
        migrations.AddField(
            model_name='equipamento',
            name='data_ultima_leitura',
            field=models.DateTimeField(
                null=True,
                blank=True,
                verbose_name='Data da Última Leitura',
                help_text='Data/hora da última atualização do horímetro/odômetro'
            ),
        ),

        # Adiciona status operacional
        migrations.AddField(
            model_name='equipamento',
            name='status_operacional',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('OPERACIONAL', 'Operacional'),
                    ('EM_MANUTENCAO', 'Em Manutenção'),
                    ('PARADO', 'Parado'),
                    ('DESATIVADO', 'Desativado'),
                ],
                default='OPERACIONAL',
                verbose_name='Status Operacional'
            ),
        ),

        # Adiciona data da última manutenção
        migrations.AddField(
            model_name='equipamento',
            name='data_ultima_manutencao',
            field=models.DateField(
                null=True,
                blank=True,
                verbose_name='Data da Última Manutenção',
                help_text='Data da última manutenção preventiva ou corretiva realizada'
            ),
        ),

        # Adiciona leitura da última manutenção
        migrations.AddField(
            model_name='equipamento',
            name='leitura_ultima_manutencao',
            field=models.DecimalField(
                max_digits=12,
                decimal_places=2,
                null=True,
                blank=True,
                verbose_name='Leitura na Última Manutenção',
                help_text='Horímetro/KM registrado na última manutenção'
            ),
        ),

        # Adiciona próxima manutenção prevista
        migrations.AddField(
            model_name='equipamento',
            name='proxima_manutencao_leitura',
            field=models.DecimalField(
                max_digits=12,
                decimal_places=2,
                null=True,
                blank=True,
                verbose_name='Próxima Manutenção (Leitura)',
                help_text='Leitura prevista para próxima manutenção preventiva'
            ),
        ),

        migrations.AddField(
            model_name='equipamento',
            name='proxima_manutencao_data',
            field=models.DateField(
                null=True,
                blank=True,
                verbose_name='Próxima Manutenção (Data)',
                help_text='Data prevista para próxima manutenção preventiva'
            ),
        ),
    ]
