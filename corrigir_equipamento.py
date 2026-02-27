"""
Script para corrigir equipamento em Ordem de Serviço e Manutenção
Execute: python manage.py shell < corrigir_equipamento.py
"""

from ordens_servico.models import OrdemServico
from manutencao.models import Manutencao
from equipamentos.models import Equipamento

# ========================================
# CONFIGURE AQUI OS IDs
# ========================================
OS_ID = 19  # ID da Ordem de Serviço
EQUIPAMENTO_CORRETO_ID = 22  # ID do equipamento correto
# ========================================

print("=" * 60)
print("CORREÇÃO DE EQUIPAMENTO EM OS E MANUTENÇÃO")
print("=" * 60)

try:
    # Buscar OS
    os = OrdemServico.objects.get(id=OS_ID)
    print(f"\n✓ OS encontrada: {os.numero}")
    print(f"  Cliente: {os.cliente.nome_razao}")
    print(f"  Status: {os.get_status_display()}")
    print(f"  Equipamento atual: {os.equipamento.codigo if os.equipamento else 'Nenhum'} (ID: {os.equipamento_id})")

    # Buscar equipamento correto
    equipamento_correto = Equipamento.objects.get(id=EQUIPAMENTO_CORRETO_ID)
    print(f"\n✓ Equipamento correto encontrado: {equipamento_correto.codigo}")
    print(f"  Descrição: {equipamento_correto.descricao}")
    print(f"  Empreendimento: {equipamento_correto.empreendimento.nome}")

    # Validar que equipamento pertence ao mesmo empreendimento
    if os.empreendimento_id != equipamento_correto.empreendimento_id:
        print(f"\n⚠ AVISO: Equipamento pertence a empreendimento diferente!")
        print(f"  OS: {os.empreendimento.nome} (ID: {os.empreendimento_id})")
        print(f"  Equipamento: {equipamento_correto.empreendimento.nome} (ID: {equipamento_correto.empreendimento_id})")
        resposta = input("\nDeseja continuar mesmo assim? (s/N): ")
        if resposta.lower() != 's':
            print("\n❌ Operação cancelada pelo usuário")
            exit(0)

    # Confirmar alteração
    print("\n" + "=" * 60)
    print("ALTERAÇÃO A SER REALIZADA:")
    print("=" * 60)
    print(f"Equipamento ANTIGO: {os.equipamento.codigo if os.equipamento else 'Nenhum'} (ID: {os.equipamento_id})")
    print(f"Equipamento NOVO:   {equipamento_correto.codigo} (ID: {EQUIPAMENTO_CORRETO_ID})")

    resposta = input("\nConfirma a correção? (s/N): ")
    if resposta.lower() != 's':
        print("\n❌ Operação cancelada pelo usuário")
        exit(0)

    # Realizar alteração
    print("\n🔄 Atualizando...")

    # 1. Atualizar OS
    equipamento_antigo_id = os.equipamento_id
    os.equipamento = equipamento_correto
    os.save()
    print(f"✓ OS {os.numero} atualizada")

    # 2. Atualizar manutenções vinculadas
    manutencoes = Manutencao.objects.filter(ordem_servico=os)
    count_manutencoes = 0
    for manutencao in manutencoes:
        manutencao.equipamento = equipamento_correto
        manutencao.save()
        count_manutencoes += 1
        print(f"✓ Manutenção ID {manutencao.id} atualizada")

    print("\n" + "=" * 60)
    print("✅ CORREÇÃO CONCLUÍDA COM SUCESSO!")
    print("=" * 60)
    print(f"OS atualizada: {os.numero}")
    print(f"Manutenções atualizadas: {count_manutencoes}")
    print(f"Equipamento antigo ID: {equipamento_antigo_id}")
    print(f"Equipamento novo ID: {EQUIPAMENTO_CORRETO_ID}")
    print("=" * 60)

except OrdemServico.DoesNotExist:
    print(f"\n❌ ERRO: Ordem de Serviço ID {OS_ID} não encontrada")
except Equipamento.DoesNotExist:
    print(f"\n❌ ERRO: Equipamento ID {EQUIPAMENTO_CORRETO_ID} não encontrado")
except Exception as e:
    print(f"\n❌ ERRO: {str(e)}")
    import traceback
    traceback.print_exc()
