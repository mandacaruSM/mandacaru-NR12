# 🔧 Fix: Erro 404 ao Salvar Manutenção

**Commit:** `a97b3a0` - Fix: Corrigir endpoint de manutenções - erro 404 ao salvar

---

## 🎯 Problema Identificado

Ao tentar salvar uma nova manutenção, o sistema retornava erro **404 Not Found** com resposta HTML:

```html
<!doctype html>
<html lang="en">
  <head><title>Not Found</title></head>
  <body>
    <h1>Not Found</h1>
    <p>The requested resource was not found on this server.</p>
  </body>
</html>
```

---

## 🔍 Análise da Causa

### Backend (Correto)

As rotas de manutenção no Django estão configuradas corretamente:

**Arquivo:** [backend/config/urls.py](backend/config/urls.py:47)
```python
path('api/v1/', include('manutencao.urls')),
```

**Arquivo:** [backend/manutencao/urls.py](backend/manutencao/urls.py:6)
```python
router.register(r'manutencoes', ManutencaoViewSet, basename='manutencoes')
```

**Rota esperada pelo backend:**
```
POST /api/v1/manutencoes/  ✅
PUT /api/v1/manutencoes/{id}/  ✅
```

### Frontend (Incorreto)

**Arquivo:** [frontend/src/app/dashboard/manutencoes/_Form.tsx](frontend/src/app/dashboard/manutencoes/_Form.tsx:177-180)

**ANTES (Código com erro):**
```typescript
const API_BASE_V0 = process.env.NEXT_PUBLIC_API_URL?.replace('/v1', '') || 'http://localhost:8000/api';
const url = mode === 'create'
  ? `${API_BASE_V0}/manutencoes/`      // ❌ /api/manutencoes/
  : `${API_BASE_V0}/manutencoes/${id}/`;
```

**Problema:**
- `NEXT_PUBLIC_API_URL` = `https://nr12-backend.onrender.com/api/v1`
- Código fazia `.replace('/v1', '')` → `https://nr12-backend.onrender.com/api`
- URL final: `https://nr12-backend.onrender.com/api/manutencoes/` ❌
- Backend esperava: `https://nr12-backend.onrender.com/api/v1/manutencoes/` ✅

### Por que `.replace('/v1', '')` estava lá?

Provavelmente um código antigo quando a API não tinha versionamento, ou uma tentativa equivocada de "remover versão" para alguma rota específica.

---

## ✅ Solução Aplicada

**Arquivo:** [frontend/src/app/dashboard/manutencoes/_Form.tsx](frontend/src/app/dashboard/manutencoes/_Form.tsx:177-180)

**DEPOIS (Código corrigido):**
```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
const url = mode === 'create'
  ? `${API_BASE}/manutencoes/`      // ✅ /api/v1/manutencoes/
  : `${API_BASE}/manutencoes/${id}/`;
```

**Mudanças:**
1. ❌ Removido: `.replace('/v1', '')`
2. ✅ Usa `NEXT_PUBLIC_API_URL` diretamente (já inclui `/api/v1`)
3. ✅ URL correta: `https://nr12-backend.onrender.com/api/v1/manutencoes/`

---

## 🧪 Como Testar

### Após Deploy (3-5 minutos)

1. **Acesse:** https://nr12-frontend.onrender.com
2. **Faça login:** admin / admin123
3. **Navegue:** Dashboard → Manutenções → Nova Manutenção
4. **Preencha o formulário:**
   - Selecione Cliente
   - Selecione Empreendimento
   - Selecione Equipamento
   - Tipo: Corretiva ou Preventiva
   - Data: Hoje
   - Horímetro: 1500 (exemplo)
   - Técnico: (opcional)
   - Descrição: "Teste de manutenção"
5. **Clique em "Criar Manutenção"**

### Resultado Esperado:

**Console do navegador (F12):**
```
📤 Fazendo requisição: POST https://nr12-backend.onrender.com/api/v1/manutencoes/
📥 Resposta recebida: 201 Created
✅ Manutenção criada com sucesso!
```

**Tela:**
```
✅ Redirecionado para /dashboard/manutencoes
✅ Nova manutenção aparece na lista
✅ Sem erro 404
```

---

## 📊 URLs Antes vs Depois

| Operação | URL ANTES (Errada) | URL DEPOIS (Correta) | Status |
|----------|-------------------|---------------------|--------|
| Criar manutenção | `/api/manutencoes/` | `/api/v1/manutencoes/` | ✅ Corrigido |
| Editar manutenção | `/api/manutencoes/{id}/` | `/api/v1/manutencoes/{id}/` | ✅ Corrigido |

---

## 🔍 Verificação Adicional

Verificar se outros módulos **não** têm o mesmo problema:

```bash
# Buscar por .replace('/v1', '') no código
grep -r "replace('/v1'" frontend/src/
```

Se encontrar outros arquivos com `.replace('/v1', '')`, aplicar a mesma correção.

---

## 📝 Checklist de Verificação

### Deploy
- [x] Código corrigido
- [x] Commit criado (a97b3a0)
- [x] Push concluído
- [ ] Render detectou commit
- [ ] Frontend iniciou rebuild
- [ ] Build concluído sem erros
- [ ] Serviço live

### Testes
- [ ] Limpar cache do navegador
- [ ] Acessar /dashboard/manutencoes/novo
- [ ] Preencher formulário completo
- [ ] Salvar manutenção
- [ ] Verificar redirecionamento para lista
- [ ] Nova manutenção aparece na lista
- [ ] Sem erro 404

---

## 🎊 Resultado Esperado

```
┌────────────────────────────────────────────┐
│  ✅ MANUTENÇÕES FUNCIONANDO               │
├────────────────────────────────────────────┤
│  ✅ Criar manutenção (POST)                │
│  ✅ Editar manutenção (PUT)                │
│  ✅ Listar manutenções (GET)               │
│  ✅ URL correta: /api/v1/manutencoes/      │
│  ✅ Sem erro 404                           │
└────────────────────────────────────────────┘
```

---

## 🚀 Deploy Automático

O Render vai detectar o commit `a97b3a0` e fazer deploy automático em ~3-5 minutos.

**Acompanhar:**
```
Render Dashboard → nr12-frontend → Logs
Aguarde: "Your service is live 🎉"
```

---

**Última atualização:** 2025-12-21
**Status:** ✅ Corrigido e enviado para deploy
