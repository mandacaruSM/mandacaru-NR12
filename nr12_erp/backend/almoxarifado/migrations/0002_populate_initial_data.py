# Generated manually on 2026-02-27

from django.db import migrations


def populate_unidades(apps, schema_editor):
    """Popula unidades de medida padrão"""
    UnidadeMedida = apps.get_model('almoxarifado', 'UnidadeMedida')

    unidades = [
        ('UN', 'Unidade'),
        ('PC', 'Peça'),
        ('CJ', 'Conjunto'),
        ('KG', 'Quilograma'),
        ('G', 'Grama'),
        ('L', 'Litro'),
        ('ML', 'Mililitro'),
        ('M', 'Metro'),
        ('M2', 'Metro Quadrado'),
        ('M3', 'Metro Cúbico'),
        ('CM', 'Centímetro'),
        ('MM', 'Milímetro'),
        ('KM', 'Quilômetro'),
        ('TON', 'Tonelada'),
        ('CX', 'Caixa'),
        ('PCT', 'Pacote'),
        ('FD', 'Fardo'),
        ('RL', 'Rolo'),
        ('SC', 'Saco'),
        ('TB', 'Tubo'),
    ]

    for sigla, descricao in unidades:
        UnidadeMedida.objects.get_or_create(
            sigla=sigla,
            defaults={'descricao': descricao}
        )


def populate_categorias(apps, schema_editor):
    """Popula categorias de produtos padrão"""
    CategoriaProduto = apps.get_model('almoxarifado', 'CategoriaProduto')

    categorias = [
        'Filtros',
        'Óleos e Lubrificantes',
        'Correias e Polias',
        'Pneus e Câmaras',
        'Baterias',
        'Fluidos Hidráulicos',
        'Combustíveis',
        'Peças de Reposição',
        'Ferramentas',
        'EPIs',
        'Material de Limpeza',
        'Material Elétrico',
        'Parafusos e Porcas',
    ]

    for nome in categorias:
        CategoriaProduto.objects.get_or_create(nome=nome)


class Migration(migrations.Migration):

    dependencies = [
        ('almoxarifado', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(populate_unidades, migrations.RunPython.noop),
        migrations.RunPython(populate_categorias, migrations.RunPython.noop),
    ]
