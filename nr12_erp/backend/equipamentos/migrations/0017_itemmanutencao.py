# Generated manually on 2026-02-27

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('almoxarifado', '0001_initial'),
        ('equipamentos', '0016_add_tracking_fields_to_model'),
    ]

    operations = [
        migrations.CreateModel(
            name='ItemManutencao',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('categoria', models.CharField(
                    choices=[
                        ('FILTRO', 'Filtro'),
                        ('OLEO', 'Óleo/Lubrificante'),
                        ('CORREIA', 'Correia'),
                        ('PNEU', 'Pneu'),
                        ('BATERIA', 'Bateria'),
                        ('FLUIDO', 'Fluido'),
                        ('OUTRO', 'Outro'),
                    ],
                    default='OUTRO',
                    help_text='Categoria do item de manutenção',
                    max_length=20
                )),
                ('descricao', models.CharField(
                    blank=True,
                    default='',
                    help_text='Descrição adicional ou localização do item',
                    max_length=200
                )),
                ('quantidade_necessaria', models.DecimalField(
                    decimal_places=2,
                    default=1,
                    help_text='Quantidade necessária por manutenção',
                    max_digits=10
                )),
                ('periodicidade_km', models.PositiveIntegerField(
                    blank=True,
                    help_text='Periodicidade em KM (para equipamentos com odômetro)',
                    null=True
                )),
                ('periodicidade_horas', models.PositiveIntegerField(
                    blank=True,
                    help_text='Periodicidade em horas (para equipamentos com horímetro)',
                    null=True
                )),
                ('periodicidade_dias', models.PositiveIntegerField(
                    blank=True,
                    help_text='Periodicidade em dias (alternativa à leitura)',
                    null=True
                )),
                ('ativo', models.BooleanField(default=True)),
                ('observacoes', models.TextField(blank=True, default='')),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('atualizado_em', models.DateTimeField(auto_now=True)),
                ('equipamento', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='itens_manutencao',
                    to='equipamentos.equipamento'
                )),
                ('produto', models.ForeignKey(
                    help_text='Produto do almoxarifado vinculado a este item',
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='itens_manutencao',
                    to='almoxarifado.produto'
                )),
            ],
            options={
                'verbose_name': 'Item de Manutenção',
                'verbose_name_plural': 'Itens de Manutenção',
                'ordering': ['categoria', 'produto__nome'],
            },
        ),
    ]
