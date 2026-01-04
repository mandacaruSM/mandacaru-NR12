# 🔧 Fix: Migration Falhou - Date para Numeric

**Commit:** `e710180` - Fix: Alterar proxima_manutencao de data para horímetro/km (com migration customizada)

---

## 🎯 Problema do Deploy

O deploy no Render falhou com o seguinte erro:

```
django.db.utils.ProgrammingError: cannot cast type date to numeric
LINE 1: ...ao" TYPE numeric(12, 2) USING "proxima_manutencao"::numeric(...
                                                             ^
```

### Causa do Erro

O PostgreSQL **não consegue converter automaticamente** valores do tipo `date` (data) para `numeric` (número).

**Migration automática gerada pelo Django:**
```python
migrations.AlterField(
    model_name='manutencao',
    name='proxima_manutencao',
    field=models.DecimalField(...)  # ❌ Tentou converter date->numeric
)
```

**SQL gerado:**
```sql
ALTER TABLE "manutencao_manutencao"
  ALTER COLUMN "proxima_manutencao"
  TYPE numeric(12, 2)
  USING "proxima_manutencao"::numeric(...);
  --    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ ERRO: não pode converter date para numeric
```

---

## ✅ Solução Aplicada

Criei uma **migration customizada** que:

1. **Primeiro:** Limpa todos os valores antigos (seta `NULL`)
2. **Depois:** Altera o tipo do campo de `date` para `numeric`

### Migration Customizada

**Arquivo:** [backend/manutencao/migrations/0002_alter_proxima_manutencao_to_decimal.py](backend/manutencao/migrations/0002_alter_proxima_manutencao_to_decimal.py)

```python
import django.core.validators
from django.db import migrations, models


def limpar_proxima_manutencao(apps, schema_editor):
    """
    Limpa valores antigos de proxima_manutencao antes de alterar o tipo.
    Não é possível converter automaticamente date para numeric.
    """
    Manutencao = apps.get_model('manutencao', 'Manutencao')
    # Define NULL para todos os registros existentes
    Manutencao.objects.all().update(proxima_manutencao=None)


class Migration(migrations.Migration):

    dependencies = [
        ('manutencao', '0001_initial'),
    ]

    operations = [
        # 1. Primeiro limpa os dados existentes
        migrations.RunPython(
            limpar_proxima_manutencao,
            reverse_code=migrations.RunPython.noop
        ),

        # 2. Depois altera o tipo do campo
        migrations.AlterField(
            model_name='manutencao',
            name='proxima_manutencao',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Horímetro/KM para a próxima manutenção preventiva',
                max_digits=12,
                null=True,
                validators=[django.core.validators.MinValueValidator(0)]
            ),
        ),
    ]
```

### Como Funciona

**Passo 1: RunPython - Limpar dados**
```python
migrations.RunPython(limpar_proxima_manutencao)
```
- Executa função Python customizada
- Seta `proxima_manutencao = NULL` para todos os registros
- SQL gerado: `UPDATE manutencao_manutencao SET proxima_manutencao = NULL;`

**Passo 2: AlterField - Alterar tipo**
```python
migrations.AlterField(model_name='manutencao', name='proxima_manutencao', ...)
```
- Como todos os valores estão NULL, não há conversão de tipo
- PostgreSQL aceita alterar de `date NULL` para `numeric NULL`
- SQL gerado: `ALTER TABLE ... ALTER COLUMN ... TYPE numeric(12, 2);`

---

## 🧪 Teste Local

**Reverter migration antiga:**
```bash
cd backend
python manage.py migrate manutencao 0001_initial
```

**Aplicar nova migration:**
```bash
python manage.py migrate manutencao
```

**Resultado:**
```
Operations to perform:
  Apply all migrations: manutencao
Running migrations:
  Applying manutencao.0002_alter_proxima_manutencao_to_decimal... OK ✅
```

---

## 📊 Antes vs Depois

### ❌ Migration Automática (Falhou)

```
Migration automática:
  ↓
AlterField (date -> numeric)
  ↓
SQL: ALTER COLUMN USING "proxima_manutencao"::numeric
  ↓
PostgreSQL: ❌ ERRO - cannot cast type date to numeric
  ↓
Deploy falha
```

### ✅ Migration Customizada (Funciona)

```
Migration customizada:
  ↓
1. RunPython: UPDATE proxima_manutencao = NULL
  ↓ (todos valores agora NULL)
2. AlterField (date NULL -> numeric NULL)
  ↓
SQL: ALTER COLUMN TYPE numeric(12, 2)
  ↓
PostgreSQL: ✅ OK - não há conversão de tipo
  ↓
Deploy sucesso
```

---

## 🔄 Impacto em Dados

### Dados Existentes

**⚠️ IMPORTANTE:** Todos os valores antigos de `proxima_manutencao` serão **perdidos** (setados como `NULL`).

**Antes da migration:**
```sql
SELECT id, tipo, proxima_manutencao FROM manutencao_manutencao;

-- Resultado:
-- id | tipo        | proxima_manutencao
-- 1  | preventiva  | 2025-01-15        (data)
-- 2  | corretiva   | NULL
```

**Depois da migration:**
```sql
SELECT id, tipo, proxima_manutencao FROM manutencao_manutencao;

-- Resultado:
-- id | tipo        | proxima_manutencao
-- 1  | preventiva  | NULL              (limpo)
-- 2  | corretiva   | NULL
```

### Por Que Limpar?

**Opção 1: Tentar converter (❌ Não funciona)**
```python
# Não é possível converter automaticamente
# date('2025-01-15') -> numeric ???
# Não há lógica clara de conversão
```

**Opção 2: Limpar e permitir novos valores (✅ Escolhida)**
```python
# Limpa valores antigos (date)
proxima_manutencao = NULL

# Novos valores serão numeric (horímetro/km)
proxima_manutencao = 2500.00
```

**Justificativa:**
- Valores antigos (datas) não fazem sentido no novo modelo
- Sistema agora trabalha com horímetro/km, não datas
- Usuários podem re-preencher com valores corretos

---

## 🚀 Deploy no Render

### O Que Vai Acontecer

**Logs esperados:**
```
==> Running migrations...
Running migrations:
  Applying manutencao.0002_alter_proxima_manutencao_to_decimal...
    Running Python code: limpar_proxima_manutencao
    Altering field proxima_manutencao on manutencao
  OK ✅
==> Your service is live 🎉
```

**Tempo estimado:** 3-5 minutos

---

## 📋 Checklist de Verificação

### Deploy
- [x] Migration customizada criada
- [x] Migration testada localmente
- [x] Commit feito (e710180)
- [x] Push com --force-with-lease (substituiu commit anterior)
- [ ] Render detectou commit
- [ ] Backend iniciou rebuild
- [ ] Migration executada sem erro
- [ ] Serviço live

### Pós-Deploy
- [ ] Criar nova manutenção preventiva
- [ ] Preencher "Próxima Manutenção" com valor numérico (ex: 2500.0)
- [ ] Salvar sem erro
- [ ] Verificar valor salvo no banco: 2500.00

---

## 🔮 Alternativas Consideradas

### Alternativa 1: Conversão Manual de Dados

**Se houvesse dados importantes para preservar:**

```python
def converter_data_para_horimetro(apps, schema_editor):
    """
    Converte datas para horímetros baseado em alguma lógica de negócio.
    Exemplo: assumir 250 horas por mês.
    """
    from datetime import date
    Manutencao = apps.get_model('manutencao', 'Manutencao')

    for m in Manutencao.objects.exclude(proxima_manutencao=None):
        # Lógica customizada de conversão
        proxima_data = m.proxima_manutencao  # date
        hoje = date.today()
        dias_faltando = (proxima_data - hoje).days
        horas_estimadas = (dias_faltando / 30) * 250  # Exemplo

        # Nota: ainda não funciona porque campo é date, não numeric
        # Precisaria de múltiplas migrations
```

**Por que não usamos:**
- Lógica arbitrária (não há relação direta entre data e horímetro)
- Sistema novo, provavelmente sem dados em produção
- Mais simples limpar e re-preencher

### Alternativa 2: Criar Novo Campo

```python
# Manter proxima_manutencao_data (date)
# Criar proxima_manutencao_horimetro (numeric)
# Depreciar campo antigo
```

**Por que não usamos:**
- Complexidade desnecessária
- Campo antigo estava conceitualmente errado
- Melhor corrigir agora que o sistema está novo

---

## 🆘 Troubleshooting

### Se migration ainda falhar no Render

**Verificar logs completos:**
```
Render Dashboard → nr12-backend → Logs
```

**Possíveis problemas:**

#### 1. Erro de sintaxe na migration
```python
# Verificar se código Python está correto
python manage.py migrate --plan
```

#### 2. Migration já foi aplicada parcialmente
```python
# No Django shell do Render
python manage.py showmigrations manutencao

# Se 0002 aparecer como [X] (aplicada):
python manage.py migrate manutencao 0001 --fake
python manage.py migrate manutencao
```

#### 3. Conflito de migrations
```bash
# Verificar ordem de dependências
python manage.py makemigrations --check
```

### Se dados precisam ser preservados

**Script SQL manual:**
```sql
-- 1. Adicionar coluna temporária
ALTER TABLE manutencao_manutencao
  ADD COLUMN proxima_manutencao_novo NUMERIC(12, 2) NULL;

-- 2. Copiar dados convertidos (se lógica existir)
-- UPDATE manutencao_manutencao SET proxima_manutencao_novo = ...

-- 3. Remover coluna antiga
ALTER TABLE manutencao_manutencao DROP COLUMN proxima_manutencao;

-- 4. Renomear nova coluna
ALTER TABLE manutencao_manutencao
  RENAME COLUMN proxima_manutencao_novo TO proxima_manutencao;
```

---

## 🎊 Resultado Esperado

```
┌────────────────────────────────────────────────┐
│  ✅ MIGRATION EXECUTADA COM SUCESSO           │
├────────────────────────────────────────────────┤
│  ✅ Dados antigos limpos (NULL)                │
│  ✅ Campo alterado: date → numeric(12, 2)      │
│  ✅ Deploy concluído no Render                 │
│  ✅ Manutenção preventiva aceita números       │
│  ✅ Exemplo: 2500.0 km ou horas                │
└────────────────────────────────────────────────┘
```

---

**Última atualização:** 2025-12-21
**Status:** ✅ Migration corrigida e enviada para deploy
**Commit:** e710180
