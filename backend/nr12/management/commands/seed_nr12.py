# backend/nr12/management/commands/seed_nr12.py
"""
Comando Django para popular o banco com dados de exemplo
Execute: python manage.py seed_nr12
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from equipamentos.models import TipoEquipamento, Equipamento
from cadastro.models import Cliente, Empreendimento
from nr12.models import ModeloChecklist, ItemChecklist

User = get_user_model()


class Command(BaseCommand):
    help = 'Popula o banco com dados de exemplo do módulo NR12'

    def handle(self, *args, **options):
        self.stdout.write("\n🌱 Iniciando seed do módulo NR12...")
        self.stdout.write("=" * 50)

        # Cliente e Empreendimento
        self.stdout.write("\n📋 1. Criando Cliente e Empreendimento...")
        cliente, created = Cliente.objects.get_or_create(
            documento="12345678000190",
            defaults={
                "tipo_pessoa": "PJ",
                "nome_razao": "Mineradora Exemplo LTDA",
                "email_financeiro": "financeiro@exemplo.com",
                "telefone": "(77) 3555-0000",
                "cidade": "Livramento de Brumado",
                "uf": "BA",
                "ativo": True
            }
        )
        self.stdout.write(f"   {'✅ Criado' if created else 'ℹ️  Já existe'}: {cliente.nome_razao}")

        empreendimento, created = Empreendimento.objects.get_or_create(
            cliente=cliente,
            nome="Mina Principal",
            defaults={"tipo": "LAVRA", "distancia_km": "15.5", "ativo": True}
        )
        self.stdout.write(f"   {'✅ Criado' if created else 'ℹ️  Já existe'}: {empreendimento.nome}")

        # Tipos de Equipamento
        self.stdout.write("\n🏗️  2. Criando Tipos de Equipamento...")
        tipos_data = [
            {"nome": "Escavadeira Hidráulica", "descricao": "Equipamento para escavação"},
            {"nome": "Caminhão Fora de Estrada", "descricao": "Transporte de minério"},
            {"nome": "Trator de Esteiras", "descricao": "Movimentação de terra"},
        ]
        
        tipo_equipamentos = []
        for tipo_data in tipos_data:
            tipo, created = TipoEquipamento.objects.get_or_create(
                nome=tipo_data["nome"],
                defaults={"descricao": tipo_data["descricao"], "ativo": True}
            )
            tipo_equipamentos.append(tipo)
            self.stdout.write(f"   {'✅ Criado' if created else 'ℹ️  Já existe'}: {tipo.nome}")

        # Equipamentos
        self.stdout.write("\n🚜 3. Criando Equipamentos...")
        equipamentos_data = [
            {
                "tipo": tipo_equipamentos[0],
                "codigo": "ESC-001",
                "descricao": "Escavadeira Caterpillar 320D",
                "fabricante": "Caterpillar",
                "modelo": "320D",
                "ano_fabricacao": 2020,
            },
            {
                "tipo": tipo_equipamentos[1],
                "codigo": "CAM-001",
                "descricao": "Caminhão Volvo FMX 540",
                "fabricante": "Volvo",
                "modelo": "FMX 540",
                "ano_fabricacao": 2019,
            },
        ]

        for eq_data in equipamentos_data:
            equipamento, created = Equipamento.objects.get_or_create(
                codigo=eq_data["codigo"],
                defaults={
                    "cliente": cliente,
                    "empreendimento": empreendimento,
                    "tipo": eq_data["tipo"],
                    "descricao": eq_data["descricao"],
                    "fabricante": eq_data["fabricante"],
                    "modelo": eq_data["modelo"],
                    "ano_fabricacao": eq_data["ano_fabricacao"],
                    "tipo_medicao": "HORA",
                    "leitura_atual": "0",
                    "ativo": True
                }
            )
            self.stdout.write(f"   {'✅ Criado' if created else 'ℹ️  Já existe'}: {equipamento.codigo}")

        # Modelos de Checklist
        self.stdout.write("\n📝 4. Criando Modelos de Checklist NR12...")
        
        modelo, created = ModeloChecklist.objects.get_or_create(
            tipo_equipamento=tipo_equipamentos[0],
            nome="Checklist Diário - Escavadeira",
            defaults={
                "descricao": "Inspeção diária conforme NR12 para escavadeiras",
                "periodicidade": "DIARIO",
                "ativo": True
            }
        )
        
        if created:
            self.stdout.write(f"   ✅ Modelo criado: {modelo.nome}")
            
            itens = [
                {
                    "ordem": 1,
                    "categoria": "SEGURANCA",
                    "pergunta": "Dispositivo de parada de emergência está operacional?",
                    "tipo_resposta": "CONFORME",
                    "obrigatorio": True,
                    "requer_observacao_nao_conforme": True,
                },
                {
                    "ordem": 2,
                    "categoria": "VISUAL",
                    "pergunta": "Sinalização de segurança está visível e em bom estado?",
                    "tipo_resposta": "CONFORME",
                    "obrigatorio": True,
                    "requer_observacao_nao_conforme": True,
                },
                {
                    "ordem": 3,
                    "categoria": "FUNCIONAL",
                    "pergunta": "Sistema de iluminação está funcionando corretamente?",
                    "tipo_resposta": "CONFORME",
                    "obrigatorio": True,
                    "requer_observacao_nao_conforme": False,
                },
                {
                    "ordem": 4,
                    "categoria": "SEGURANCA",
                    "pergunta": "Cinto de segurança está em condições adequadas?",
                    "tipo_resposta": "CONFORME",
                    "obrigatorio": True,
                    "requer_observacao_nao_conforme": True,
                },
                {
                    "ordem": 5,
                    "categoria": "FUNCIONAL",
                    "pergunta": "Alarme de ré está operacional?",
                    "tipo_resposta": "CONFORME",
                    "obrigatorio": True,
                    "requer_observacao_nao_conforme": True,
                },
            ]
            
            for item_data in itens:
                ItemChecklist.objects.create(modelo=modelo, **item_data, ativo=True)
            
            self.stdout.write(f"      └─ {len(itens)} itens criados")
        else:
            self.stdout.write(f"   ℹ️  Modelo já existe: {modelo.nome}")

        # Resumo
        self.stdout.write("\n" + "=" * 50)
        self.stdout.write(self.style.SUCCESS("✅ Seed concluído com sucesso!"))
        self.stdout.write("=" * 50)
        self.stdout.write(f"\n📊 Resumo:")
        self.stdout.write(f"   • Clientes: {Cliente.objects.count()}")
        self.stdout.write(f"   • Tipos de Equipamento: {TipoEquipamento.objects.count()}")
        self.stdout.write(f"   • Equipamentos: {Equipamento.objects.count()}")
        self.stdout.write(f"   • Modelos NR12: {ModeloChecklist.objects.count()}")
        self.stdout.write(f"   • Itens de Checklist: {ItemChecklist.objects.count()}")
        self.stdout.write("\n")