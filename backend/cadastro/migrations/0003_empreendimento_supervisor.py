from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0002_operadorcliente_operadorequipamento_and_more"),
        ("cadastro", "0002_alter_cliente_documento"),
    ]

    operations = [
        migrations.AddField(
            model_name="empreendimento",
            name="supervisor",
            field=models.ForeignKey(
                related_name="empreendimentos",
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to="core.supervisor",
            ),
        ),
    ]

