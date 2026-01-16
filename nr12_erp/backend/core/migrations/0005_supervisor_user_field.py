# Generated migration to add user field to Supervisor

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('core', '0004_operador_empreendimentos_vinculados_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='supervisor',
            name='user',
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='supervisor_profile',
                to=settings.AUTH_USER_MODEL,
                verbose_name='Usuário do Sistema'
            ),
        ),
    ]
