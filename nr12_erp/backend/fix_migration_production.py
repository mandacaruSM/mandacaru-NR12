"""
Script para marcar migração 0018 de equipamentos como aplicada em produção.
Execute via: python manage.py shell < fix_migration_production.py
"""

from django.db import connection
from django.db.migrations.recorder import MigrationRecorder

# Verificar se a migração já está marcada
recorder = MigrationRecorder(connection)
applied = recorder.applied_migrations()

migration_key = ('equipamentos', '0018_equipamento_data_ultima_leitura_and_more')

if migration_key in applied:
    print(f"✓ Migração {migration_key} já está marcada como aplicada")
else:
    print(f"⚠ Migração {migration_key} NÃO está marcada como aplicada")
    print("Marcando como aplicada...")

    # Marcar como aplicada
    recorder.record_applied('equipamentos', '0018_equipamento_data_ultima_leitura_and_more')

    print("✅ Migração marcada com sucesso!")

print("\nVerificando novamente...")
applied = recorder.applied_migrations()
if migration_key in applied:
    print("✓ Confirmado: Migração está marcada como aplicada")
else:
    print("❌ Erro: Migração ainda não está marcada")
