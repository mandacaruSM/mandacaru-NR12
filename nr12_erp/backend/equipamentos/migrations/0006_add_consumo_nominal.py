# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('equipamentos', '0005_fix_medicao_origem_max_length'),
    ]

    operations = [
        migrations.AddField(
            model_name='equipamento',
            name='consumo_nominal_L_h',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Consumo de combustível em litros por hora (para equipamentos com horímetro)',
                max_digits=8,
                null=True,
                verbose_name='Consumo Nominal (L/h)'
            ),
        ),
        migrations.AddField(
            model_name='equipamento',
            name='consumo_nominal_km_L',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Consumo de combustível em quilômetros por litro (para veículos)',
                max_digits=8,
                null=True,
                verbose_name='Consumo Nominal (km/L)'
            ),
        ),
    ]
