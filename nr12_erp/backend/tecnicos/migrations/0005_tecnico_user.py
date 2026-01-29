from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('tecnicos', '0004_tecnico_codigo_valido_ate_tecnico_codigo_vinculacao_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='tecnico',
            name='user',
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='tecnico_profile',
                to=settings.AUTH_USER_MODEL,
                verbose_name='Usuário do Sistema',
            ),
        ),
    ]
