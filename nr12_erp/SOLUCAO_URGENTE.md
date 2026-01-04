# 🚨 SOLUÇÃO URGENTE - Erro 404 no Login

## ❌ Problema Identificado

O frontend está fazendo requisições **SEM** o `/api/v1` no caminho:

```
❌ ERRADO:  https://nr12-backend.onrender.com/me/
❌ ERRADO:  https://nr12-backend.onrender.com/auth/login/

✅ CORRETO: https://nr12-backend.onrender.com/api/v1/me/
✅ CORRETO: https://nr12-backend.onrender.com/api/v1/auth/login/
```

## 🔧 SOLUÇÃO (2 minutos)

### Passo 1: Acessar Render Dashboard

1. Acesse: https://dashboard.render.com
2. Faça login
3. Clique no serviço **nr12-frontend**

### Passo 2: Corrigir Variável de Ambiente

1. No menu lateral, clique em **"Environment"**
2. Procure a variável `NEXT_PUBLIC_API_URL`
3. **Valor atual (ERRADO):**
   ```
   https://nr12-backend.onrender.com
   ```
4. **Altere para (CORRETO):**
   ```
   https://nr12-backend.onrender.com/api/v1
   ```
5. Clique em **"Save Changes"**

### Passo 3: Fazer Redeploy

**IMPORTANTE:** Alterar variável de ambiente NÃO redeployer automaticamente!

1. No menu lateral, clique em **"Manual Deploy"** (botão azul superior direito)
2. Selecione **"Clear build cache & deploy"**
3. Aguarde o build completar (~3-5 minutos)

### Passo 4: Testar Login

1. Acesse: https://nr12-frontend.onrender.com
2. Use as credenciais:
   - **Username:** `admin`
   - **Password:** `admin123`
3. **SUCESSO!** ✅

## 📋 Verificação

Se quiser confirmar que a variável está correta antes do redeploy:

1. No Render Dashboard → nr12-frontend → Environment
2. A variável `NEXT_PUBLIC_API_URL` deve estar **exatamente** assim:
   ```
   NEXT_PUBLIC_API_URL=https://nr12-backend.onrender.com/api/v1
   ```

## ⚠️ Nota Importante

- O valor **NÃO** deve ter `/` no final
- O valor **DEVE** incluir `/api/v1`
- Após alterar, **SEMPRE** fazer redeploy manual

## 🎯 Resumo

**Problema:** URL base da API sem `/api/v1`
**Solução:** Adicionar `/api/v1` na variável `NEXT_PUBLIC_API_URL`
**Tempo:** 2 minutos para alterar + 3-5 minutos de build
**Resultado:** Login funcionando perfeitamente! ✅

---

**Evidência do Erro nos Logs:**
```
📤 API Request: POST https://nr12-backend.onrender.com/auth/login/
📥 API Response: 404
```

**Como deveria ser:**
```
📤 API Request: POST https://nr12-backend.onrender.com/api/v1/auth/login/
📥 API Response: 200 OK
```
