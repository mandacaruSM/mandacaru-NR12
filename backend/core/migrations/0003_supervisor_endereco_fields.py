from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0002_operadorcliente_operadorequipamento_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name='supervisor',
            name='logradouro',
            field=models.CharField(max_length=255, blank=True, verbose_name='Logradouro'),
        ),
        migrations.AddField(
            model_name='supervisor',
            name='numero',
            field=models.CharField(max_length=20, blank=True, verbose_name='Número'),
        ),
        migrations.AddField(
            model_name='supervisor',
            name='complemento',
            field=models.CharField(max_length=100, blank=True, verbose_name='Complemento'),
        ),
        migrations.AddField(
            model_name='supervisor',
            name='bairro',
            field=models.CharField(max_length=100, blank=True, verbose_name='Bairro'),
        ),
        migrations.AddField(
            model_name='supervisor',
            name='cidade',
            field=models.CharField(max_length=100, blank=True, verbose_name='Cidade'),
        ),
        migrations.AddField(
            model_name='supervisor',
            name='uf',
            field=models.CharField(max_length=2, blank=True, verbose_name='UF'),
        ),
        migrations.AddField(
            model_name='supervisor',
            name='cep',
            field=models.CharField(max_length=9, blank=True, verbose_name='CEP'),
        ),
    ]

