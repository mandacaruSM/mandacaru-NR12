# Generated manually

import uuid
from django.db import migrations, models


def generate_uuid_for_existing(apps, schema_editor):
    """Gera UUID para registros existentes"""
    Cliente = apps.get_model('cadastro', 'Cliente')
    Empreendimento = apps.get_model('cadastro', 'Empreendimento')

    for cliente in Cliente.objects.all():
        cliente.uuid = uuid.uuid4()
        cliente.save(update_fields=['uuid'])

    for empreendimento in Empreendimento.objects.all():
        empreendimento.uuid = uuid.uuid4()
        empreendimento.save(update_fields=['uuid'])


class Migration(migrations.Migration):

    dependencies = [
        ('cadastro', '0004_empreendimento_endereco_fields'),
    ]

    operations = [
        # Passo 1: Adicionar campo uuid nullable
        migrations.AddField(
            model_name='cliente',
            name='uuid',
            field=models.UUIDField(null=True, editable=False),
        ),
        migrations.AddField(
            model_name='empreendimento',
            name='uuid',
            field=models.UUIDField(null=True, editable=False),
        ),

        # Passo 2: Popular com UUIDs
        migrations.RunPython(generate_uuid_for_existing, migrations.RunPython.noop),

        # Passo 3: Tornar unique e not null
        migrations.AlterField(
            model_name='cliente',
            name='uuid',
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
        migrations.AlterField(
            model_name='empreendimento',
            name='uuid',
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
    ]
