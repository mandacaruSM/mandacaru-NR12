# Generated manually

import uuid
from django.db import migrations, models


def generate_uuid_for_existing(apps, schema_editor):
    """Gera UUID para registros existentes"""
    Equipamento = apps.get_model('equipamentos', 'Equipamento')

    for equipamento in Equipamento.objects.all():
        equipamento.uuid = uuid.uuid4()
        equipamento.save(update_fields=['uuid'])


class Migration(migrations.Migration):

    dependencies = [
        ('equipamentos', '0001_initial'),
    ]

    operations = [
        # Passo 1: Adicionar campo uuid nullable
        migrations.AddField(
            model_name='equipamento',
            name='uuid',
            field=models.UUIDField(null=True, editable=False),
        ),

        # Passo 2: Popular com UUIDs
        migrations.RunPython(generate_uuid_for_existing, migrations.RunPython.noop),

        # Passo 3: Tornar unique e not null
        migrations.AlterField(
            model_name='equipamento',
            name='uuid',
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
    ]
