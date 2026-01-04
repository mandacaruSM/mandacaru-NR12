from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("cadastro", "0003_empreendimento_supervisor"),
    ]

    operations = [
        migrations.AddField(
            model_name='empreendimento',
            name='logradouro',
            field=models.CharField(max_length=150, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='empreendimento',
            name='numero',
            field=models.CharField(max_length=20, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='empreendimento',
            name='complemento',
            field=models.CharField(max_length=100, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='empreendimento',
            name='bairro',
            field=models.CharField(max_length=100, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='empreendimento',
            name='cidade',
            field=models.CharField(max_length=100, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='empreendimento',
            name='uf',
            field=models.CharField(max_length=2, blank=True, default=''),
        ),
        migrations.AddField(
            model_name='empreendimento',
            name='cep',
            field=models.CharField(max_length=10, blank=True, default=''),
        ),
    ]

