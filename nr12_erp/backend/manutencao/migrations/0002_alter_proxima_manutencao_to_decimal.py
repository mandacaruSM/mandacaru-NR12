# Generated manually to handle date to decimal conversion
# Cannot convert date to numeric directly, so we remove and recreate the field
import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('manutencao', '0001_initial'),
    ]

    operations = [
        # 1. Remove the old field (date type)
        migrations.RemoveField(
            model_name='manutencao',
            name='proxima_manutencao',
        ),

        # 2. Add it back as DecimalField
        migrations.AddField(
            model_name='manutencao',
            name='proxima_manutencao',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Horímetro/KM para a próxima manutenção preventiva',
                max_digits=12,
                null=True,
                validators=[django.core.validators.MinValueValidator(0)]
            ),
        ),
    ]
