# EXEMPLO_PRATICO_SETUP.py
"""
Script de exemplo para configurar o sistema de manutenção preventiva
Execute via Django shell: python manage.py shell < EXEMPLO_PRATICO_SETUP.py
"""

from decimal import Decimal
from django.utils import timezone
from equipamentos.models import Equipamento, TipoEquipamento
from manutencao.models_alertas import GatilhoManutencao, ItemGatilhoManutencao
from almoxarifado.models import Produto
from cadastro.models import Cliente, Empreendimento

print("="*70)
print("CONFIGURAÇÃO DE EXEMPLO - SISTEMA DE MANUTENÇÃO PREVENTIVA")
print("="*70)

# =============================================================================
# PASSO 1: Criar produtos necessários (se não existirem)
# =============================================================================
print("\n📦 Criando/Verificando produtos...")

oleo_15w40, created = Produto.objects.get_or_create(
    codigo="OLEO-15W40",
    defaults={
        'nome': 'Óleo Motor 15W40 API CF',
        'categoria': 'LUBRIFICANTE',
        'unidade': 'L',
        'preco_custo': Decimal('25.00'),
        'preco_venda': Decimal('35.00'),
        'estoque_minimo': Decimal('100.000')
    }
)
print(f"  {'✅ Criado' if created else '✓  Já existe'}: {oleo_15w40}")

filtro_oleo, created = Produto.objects.get_or_create(
    codigo="FILTRO-OLEO-CAT",
    defaults={
        'nome': 'Filtro de Óleo Caterpillar Original',
        'categoria': 'FILTRO',
        'unidade': 'UN',
        'preco_custo': Decimal('120.00'),
        'preco_venda': Decimal('180.00'),
        'estoque_minimo': Decimal('10.000')
    }
)
print(f"  {'✅ Criado' if created else '✓  Já existe'}: {filtro_oleo}")

filtro_ar, created = Produto.objects.get_or_create(
    codigo="FILTRO-AR-CAT",
    defaults={
        'nome': 'Filtro de Ar Caterpillar Primário + Secundário',
        'categoria': 'FILTRO',
        'unidade': 'UN',
        'preco_custo': Decimal('95.00'),
        'preco_venda': Decimal('140.00'),
        'estoque_minimo': Decimal('10.000')
    }
)
print(f"  {'✅ Criado' if created else '✓  Já existe'}: {filtro_ar}")

filtro_combustivel, created = Produto.objects.get_or_create(
    codigo="FILTRO-COMB-CAT",
    defaults={
        'nome': 'Filtro de Combustível Caterpillar',
        'categoria': 'FILTRO',
        'unidade': 'UN',
        'preco_custo': Decimal('85.00'),
        'preco_venda': Decimal('125.00'),
        'estoque_minimo': Decimal('8.000')
    }
)
print(f"  {'✅ Criado' if created else '✓  Já existe'}: {filtro_combustivel}")

graxa, created = Produto.objects.get_or_create(
    codigo="GRAXA-MP-NLGI2",
    defaults={
        'nome': 'Graxa Multi-Purpose NLGI 2',
        'categoria': 'LUBRIFICANTE',
        'unidade': 'KG',
        'preco_custo': Decimal('18.00'),
        'preco_venda': Decimal('28.00'),
        'estoque_minimo': Decimal('50.000')
    }
)
print(f"  {'✅ Criado' if created else '✓  Já existe'}: {graxa}")

# =============================================================================
# PASSO 2: Buscar equipamento de exemplo
# =============================================================================
print("\n🔧 Buscando equipamentos...")

try:
    # Tentar buscar primeiro equipamento ativo
    equipamento = Equipamento.objects.filter(ativo=True).first()

    if not equipamento:
        print("  ⚠️  Nenhum equipamento encontrado no sistema.")
        print("  💡 Crie um equipamento primeiro antes de configurar gatilhos.")
        exit()

    print(f"  ✅ Equipamento selecionado: {equipamento.codigo} - {equipamento.descricao}")
    print(f"     Tipo de medição: {equipamento.get_tipo_medicao_display()}")
    print(f"     Leitura atual: {equipamento.leitura_atual}")

except Exception as e:
    print(f"  ❌ Erro ao buscar equipamento: {e}")
    exit()

# =============================================================================
# PASSO 3: Criar gatilho de manutenção 250h
# =============================================================================
print("\n⚙️  Criando gatilho: Revisão 250h...")

gatilho_250h, created = GatilhoManutencao.objects.get_or_create(
    equipamento=equipamento,
    nome="Revisão 250h - Troca de óleo e filtros",
    defaults={
        'descricao': (
            "Manutenção preventiva a cada 250 horas:\n"
            "- Troca de óleo do motor (15L)\n"
            "- Troca de filtro de óleo\n"
            "- Troca de filtros de ar (primário + secundário)\n"
            "- Troca de filtro de combustível\n"
            "- Lubrificação geral"
        ),
        'tipo_gatilho': 'HORIMETRO',
        'intervalo_leitura': Decimal('250.00'),
        'antecedencia_leitura': Decimal('0.10'),  # 10% = 25h antes
        'ativo': True
    }
)

if created:
    print(f"  ✅ Gatilho criado com sucesso!")

    # Calcular próxima execução
    gatilho_250h.calcular_proxima_execucao()
    print(f"  📅 Próxima execução calculada: {gatilho_250h.proxima_execucao_leitura} {equipamento.get_tipo_medicao_display()}")

    # Adicionar itens necessários
    print("\n  📦 Adicionando itens necessários...")

    ItemGatilhoManutencao.objects.get_or_create(
        gatilho=gatilho_250h,
        produto=oleo_15w40,
        defaults={
            'quantidade': Decimal('15.000'),
            'observacao': 'Óleo mineral 15W40 API CF para motor diesel'
        }
    )
    print(f"     ✓ {oleo_15w40.nome}: 15L")

    ItemGatilhoManutencao.objects.get_or_create(
        gatilho=gatilho_250h,
        produto=filtro_oleo,
        defaults={
            'quantidade': Decimal('1.000'),
            'observacao': 'Filtro original Caterpillar'
        }
    )
    print(f"     ✓ {filtro_oleo.nome}: 1 UN")

    ItemGatilhoManutencao.objects.get_or_create(
        gatilho=gatilho_250h,
        produto=filtro_ar,
        defaults={
            'quantidade': Decimal('2.000'),
            'observacao': 'Filtro primário + secundário'
        }
    )
    print(f"     ✓ {filtro_ar.nome}: 2 UN")

    ItemGatilhoManutencao.objects.get_or_create(
        gatilho=gatilho_250h,
        produto=filtro_combustivel,
        defaults={
            'quantidade': Decimal('1.000'),
            'observacao': 'Filtro de linha de combustível'
        }
    )
    print(f"     ✓ {filtro_combustivel.nome}: 1 UN")

    ItemGatilhoManutencao.objects.get_or_create(
        gatilho=gatilho_250h,
        produto=graxa,
        defaults={
            'quantidade': Decimal('2.000'),
            'observacao': 'Graxa para lubrificação de pinos e articulações'
        }
    )
    print(f"     ✓ {graxa.nome}: 2 KG")

else:
    print(f"  ✓  Gatilho já existe: {gatilho_250h.nome}")

# =============================================================================
# PASSO 4: Criar gatilho de manutenção 500h
# =============================================================================
print("\n⚙️  Criando gatilho: Revisão 500h...")

gatilho_500h, created = GatilhoManutencao.objects.get_or_create(
    equipamento=equipamento,
    nome="Revisão 500h - Manutenção Major",
    defaults={
        'descricao': (
            "Manutenção preventiva major a cada 500 horas:\n"
            "- Tudo da revisão 250h\n"
            "- Verificação de sistema hidráulico\n"
            "- Verificação de sistema elétrico\n"
            "- Ajuste de correias e tensionamento\n"
            "- Inspeção de desgaste de componentes"
        ),
        'tipo_gatilho': 'HORIMETRO',
        'intervalo_leitura': Decimal('500.00'),
        'antecedencia_leitura': Decimal('0.08'),  # 8% = 40h antes
        'ativo': True
    }
)

if created:
    print(f"  ✅ Gatilho criado com sucesso!")
    gatilho_500h.calcular_proxima_execucao()
    print(f"  📅 Próxima execução calculada: {gatilho_500h.proxima_execucao_leitura} {equipamento.get_tipo_medicao_display()}")

    # Adicionar mesmos itens da 250h (pode adicionar mais itens específicos)
    print("\n  📦 Adicionando itens necessários...")

    for item_250h in gatilho_250h.itens.all():
        ItemGatilhoManutencao.objects.get_or_create(
            gatilho=gatilho_500h,
            produto=item_250h.produto,
            defaults={
                'quantidade': item_250h.quantidade,
                'observacao': item_250h.observacao
            }
        )
        print(f"     ✓ {item_250h.produto.nome}: {item_250h.quantidade} {item_250h.produto.unidade}")

else:
    print(f"  ✓  Gatilho já existe: {gatilho_500h.nome}")

# =============================================================================
# PASSO 5: Criar gatilho de inspeção mensal NR12
# =============================================================================
print("\n⚙️  Criando gatilho: Inspeção Mensal NR12...")

gatilho_mensal, created = GatilhoManutencao.objects.get_or_create(
    equipamento=equipamento,
    nome="Inspeção Mensal de Segurança NR12",
    defaults={
        'descricao': (
            "Inspeção obrigatória mensal conforme NR12:\n"
            "- Verificação de botões de emergência\n"
            "- Teste de alarmes sonoros\n"
            "- Inspeção de travas e proteções\n"
            "- Verificação de sensores de segurança\n"
            "- Teste de sistemas de parada de emergência"
        ),
        'tipo_gatilho': 'CALENDARIO',
        'intervalo_dias': 30,
        'antecedencia_dias': 5,  # Alertar 5 dias antes
        'ativo': True
    }
)

if created:
    print(f"  ✅ Gatilho criado com sucesso!")
    gatilho_mensal.calcular_proxima_execucao()
    print(f"  📅 Próxima execução calculada: {gatilho_mensal.proxima_execucao_data}")
else:
    print(f"  ✓  Gatilho já existe: {gatilho_mensal.nome}")

# =============================================================================
# PASSO 6: Testar verificação de alertas
# =============================================================================
print("\n🔍 Testando verificação de alertas...")

alertas_criados = []

for gatilho in [gatilho_250h, gatilho_500h, gatilho_mensal]:
    print(f"\n  Verificando: {gatilho.nome}")
    alerta = gatilho.verificar_e_criar_alerta()

    if alerta:
        alertas_criados.append(alerta)
        print(f"  🚨 ALERTA CRIADO: [{alerta.get_prioridade_display()}]")
        print(f"     {alerta.mensagem}")

        # Mostrar itens necessários
        itens = gatilho.itens.all()
        if itens:
            print(f"\n     📦 Itens necessários:")
            for item in itens:
                print(f"        - {item.produto.nome}: {item.quantidade} {item.produto.unidade}")
    else:
        print(f"  ✅ OK - Não requer alerta no momento")

# =============================================================================
# RESUMO FINAL
# =============================================================================
print("\n" + "="*70)
print("RESUMO DA CONFIGURAÇÃO")
print("="*70)
print(f"Equipamento: {equipamento.codigo} - {equipamento.descricao}")
print(f"Leitura atual: {equipamento.leitura_atual} {equipamento.get_tipo_medicao_display()}")
print(f"\nGatilhos configurados:")
print(f"  ✓ Revisão 250h - Próxima: {gatilho_250h.proxima_execucao_leitura}")
print(f"  ✓ Revisão 500h - Próxima: {gatilho_500h.proxima_execucao_leitura}")
print(f"  ✓ Inspeção Mensal NR12 - Próxima: {gatilho_mensal.proxima_execucao_data}")
print(f"\nAlertas criados agora: {len(alertas_criados)}")

if alertas_criados:
    print("\n🚨 ALERTAS ATIVOS:")
    for alerta in alertas_criados:
        print(f"  - [{alerta.get_prioridade_display()}] {alerta.titulo}")

print("\n" + "="*70)
print("✅ CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!")
print("="*70)
print("\nPróximos passos:")
print("1. Configure o cron para executar: python manage.py verificar_manutencoes")
print("2. Acesse o Django Admin em /admin/manutencao/")
print("3. Visualize alertas em /admin/manutencao/manutencaoalerta/")
print("\nPara testar manualmente:")
print("  python manage.py verificar_manutencoes")
print("  python manage.py verificar_manutencoes --equipamento", equipamento.codigo)
