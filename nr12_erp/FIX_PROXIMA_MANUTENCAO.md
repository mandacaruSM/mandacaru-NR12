# 🔧 Fix: Campo "Próxima Manutenção" - Data vs Horímetro/KM

**Commit:** `9c6f370` - Fix: Alterar proxima_manutencao de data para horímetro/km

---

## 🎯 Problema Identificado

Ao tentar salvar uma **manutenção preventiva** com valor para "Próxima Manutenção", o sistema retornava erro:

```json
{
  "proxima_manutencao": [
    "Formato inválido para data. Use um dos formatos a seguir: YYYY-MM-DD."
  ]
}
```

### Comportamento Incorreto

**Frontend:**
- Campo: "Próxima Manutenção (Horímetro/KM)"
- Tipo: `<input type="number" step="0.01">`
- Valor enviado: `2500.5` (número)

**Backend:**
- Campo esperava: **data** (YYYY-MM-DD)
- Tipo do modelo: `DateField`
- Validação: Rejeitava números ❌

---

## 🔍 Análise da Causa

### Backend - Modelo Incorreto

**Arquivo:** [backend/manutencao/models.py](backend/manutencao/models.py:34)

**ANTES (Incorreto):**
```python
class Manutencao(models.Model):
    # ...
    proxima_manutencao = models.DateField(null=True, blank=True)
    #                            ^^^^^^^^^ ERRADO - espera data
```

**Contexto do negócio:**
- Manutenção preventiva é agendada por **horímetro** ou **quilometragem**, não por data
- Exemplo: "Próxima manutenção aos 2500 km" ou "Próxima manutenção às 1500 horas"
- Campo deveria armazenar **número decimal**, não data

### Frontend - Correto

**Arquivo:** [frontend/src/app/dashboard/manutencoes/_Form.tsx](frontend/src/app/dashboard/manutencoes/_Form.tsx:353-364)

```tsx
<label className="flex flex-col gap-2">
  <span className="text-sm font-semibold text-gray-900">
    Próxima Manutenção (Horímetro/KM)
  </span>
  <input
    type="number"      {/* ✅ Correto - envia número */}
    step="0.01"
    min="0"
    value={form.proxima_manutencao ?? ''}
    onChange={e => onChange('proxima_manutencao', e.target.value)}
    disabled={form.tipo !== 'preventiva'}
    placeholder="Ex: 2500.0"
  />
</label>
```

**Frontend estava correto:**
- ✅ Label indica "Horímetro/KM"
- ✅ Input type="number" envia valor numérico
- ✅ Placeholder: "Ex: 2500.0"
- ✅ Habilitado apenas para manutenção preventiva

---

## ✅ Solução Aplicada

### 1. Alterar Modelo no Backend

**Arquivo:** [backend/manutencao/models.py](backend/manutencao/models.py:34-41)

**DEPOIS (Correto):**
```python
class Manutencao(models.Model):
    # ...
    proxima_manutencao = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        help_text='Horímetro/KM para a próxima manutenção preventiva'
    )
```

**Mudanças:**
- ❌ Removido: `DateField`
- ✅ Adicionado: `DecimalField(max_digits=12, decimal_places=2)`
- ✅ Validação: `MinValueValidator(0)` (não aceita valores negativos)
- ✅ Help text: documenta o propósito do campo

**Capacidade do campo:**
- Valores suportados: `0.00` até `9999999999.99`
- Exemplos válidos:
  - `1500.5` (1500 horas e 30 minutos)
  - `2500.0` (2500 km)
  - `10000` (10000 km)

### 2. Criar Migration

**Arquivo:** [backend/manutencao/migrations/0002_alter_proxima_manutencao_to_decimal.py](backend/manutencao/migrations/0002_alter_proxima_manutencao_to_decimal.py)

```python
class Migration(migrations.Migration):
    dependencies = [
        ('manutencao', '0001_initial'),
    ]

    operations = [
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

**Migration aplicada localmente:**
```bash
$ python manage.py migrate manutencao
Operations to perform:
  Apply all migrations: manutencao
Running migrations:
  Applying manutencao.0002_alter_proxima_manutencao_to_decimal... OK ✅
```

---

## 🧪 Como Testar (Após Deploy)

### Passo 1: Aguardar Deploy

O Render vai detectar commit `9c6f370` e fazer deploy automático (~3-5 minutos):

**Logs esperados:**
```
==> Running migrations...
Running migrations:
  Applying manutencao.0002_alter_proxima_manutencao_to_decimal... OK
==> Your service is live 🎉
```

### Passo 2: Criar Manutenção Preventiva

1. **Acessar:** https://nr12-frontend.onrender.com
2. **Login:** admin / admin123
3. **Ir para:** Dashboard → Manutenções → Nova Manutenção
4. **Preencher:**
   - Cliente: (selecionar)
   - Empreendimento: (selecionar)
   - Equipamento: (selecionar)
   - **Tipo:** **Preventiva** ✅
   - Data: Hoje
   - Horímetro: 1500
   - **Próxima Manutenção:** `2500.0` ✅
   - Descrição: "Teste de manutenção preventiva"
5. **Salvar**

### Resultado Esperado:

**✅ Sucesso:**
```
✅ Manutenção criada com sucesso
✅ Redirecionado para lista de manutenções
✅ Próxima manutenção salva como: 2500.00
```

**Console do navegador (F12):**
```
📤 POST https://nr12-backend.onrender.com/api/v1/manutencoes/
📥 Response: 201 Created
```

**Resposta da API:**
```json
{
  "id": 1,
  "tipo": "preventiva",
  "horimetro": "1500.00",
  "proxima_manutencao": "2500.00",  ✅ Número decimal
  ...
}
```

---

## 📊 Antes vs Depois

### ❌ ANTES (Não Funcionava)

```
Frontend envia:  proxima_manutencao = 2500.0 (número)
                          ↓
Backend espera:   DateField (data YYYY-MM-DD)
                          ↓
Validação:        ❌ ERRO: "Formato inválido para data"
```

### ✅ DEPOIS (Funciona)

```
Frontend envia:  proxima_manutencao = 2500.0 (número)
                          ↓
Backend espera:   DecimalField (número)
                          ↓
Validação:        ✅ OK: Salva 2500.00
```

---

## 🔄 Impacto em Dados Existentes

### Manutenções Antigas

**Se existirem manutenções com `proxima_manutencao` como data:**

A migration **NÃO converte automaticamente** datas para números. Você pode:

**Opção 1: Limpar valores antigos**
```sql
UPDATE manutencao_manutencao SET proxima_manutencao = NULL;
```

**Opção 2: Converter manualmente (se necessário)**
```python
# Exemplo: converter datas para horímetros aproximados
# (apenas se fizer sentido no seu contexto de negócio)
from manutencao.models import Manutencao
from datetime import date

for m in Manutencao.objects.exclude(proxima_manutencao=None):
    # Lógica de conversão personalizada
    # m.proxima_manutencao = calcular_horimetro(m)
    # m.save()
    pass
```

**Recomendação:**
Se não houver dados em produção ainda, não precisa fazer nada. A migration simplesmente altera o tipo do campo.

---

## 📋 Checklist de Verificação

### Deploy
- [x] Migration criada (0002_alter_proxima_manutencao_to_decimal.py)
- [x] Migration testada localmente
- [x] Commit enviado (9c6f370)
- [x] Push concluído
- [ ] Render detectou commit
- [ ] Backend iniciou rebuild
- [ ] Migration aplicada no banco de produção
- [ ] Serviço live

### Testes
- [ ] Limpar cache do navegador
- [ ] Acessar /dashboard/manutencoes/novo
- [ ] Selecionar tipo "Preventiva"
- [ ] Campo "Próxima Manutenção" habilitado
- [ ] Preencher com número: 2500.0
- [ ] Salvar manutenção
- [ ] ✅ Sucesso (sem erro de formato de data)
- [ ] Verificar valor salvo: 2500.00

---

## 🎊 Resultado Esperado

```
┌────────────────────────────────────────────────┐
│  ✅ MANUTENÇÃO PREVENTIVA FUNCIONANDO         │
├────────────────────────────────────────────────┤
│  ✅ Campo aceita número decimal                │
│  ✅ Validação: valor >= 0                      │
│  ✅ Suporte a 2 casas decimais                 │
│  ✅ Exemplo: 2500.50 km ou horas               │
│  ✅ Sem erro "Formato inválido para data"     │
└────────────────────────────────────────────────┘
```

---

## 🔮 Melhorias Futuras (Opcional)

### 1. Alertas de Manutenção

Quando o horímetro atual do equipamento atingir a "próxima manutenção":

```python
# Exemplo de lógica
equipamento = Equipamento.objects.get(id=1)
manutencao_preventiva = equipamento.manutencoes.filter(
    tipo='preventiva'
).order_by('-data').first()

if manutencao_preventiva and manutencao_preventiva.proxima_manutencao:
    if equipamento.leitura_atual >= manutencao_preventiva.proxima_manutencao:
        # 🔔 Enviar alerta: "Manutenção preventiva vencida!"
        pass
```

### 2. Integração com PlanoManutencaoItem

O modelo `PlanoManutencaoItem` já tem suporte para periodicidade por KM/HORA/DIAS:

```python
# equipamentos/models.py
class PlanoManutencaoItem(models.Model):
    MODO_CHOICES = [("KM", "KM"), ("HORA", "HORA"), ("DIAS", "DIAS")]
    modo = models.CharField(max_length=10, choices=MODO_CHOICES)
    periodicidade_valor = models.PositiveIntegerField()  # ex: 250
    proxima_leitura = models.DecimalField(...)
```

Pode-se criar uma integração para calcular automaticamente `proxima_manutencao` baseado no plano.

---

## 📞 Troubleshooting

### Erro: Migration não aplicada

**Sintoma:**
```
django.db.utils.OperationalError: no such column: manutencao_manutencao.proxima_manutencao
```

**Solução:**
```bash
# Render Console
python manage.py migrate manutencao
```

### Erro: Valor inválido após migration

**Sintoma:**
```
ValueError: invalid literal for Decimal(): '2025-01-15'
```

**Causa:** Dados antigos com datas não foram limpos

**Solução:**
```sql
-- Django Shell ou SQL direto
UPDATE manutencao_manutencao SET proxima_manutencao = NULL
WHERE proxima_manutencao IS NOT NULL;
```

---

**Última atualização:** 2025-12-21
**Status:** ✅ Corrigido e enviado para deploy
