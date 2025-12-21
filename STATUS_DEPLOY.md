# Status do Deploy - NR12 ERP

## 🚨 PROBLEMA ENCONTRADO E SOLUÇÃO

### ❌ Erro Atual
Frontend retorna **404 Not Found** ao tentar fazer login.

**Causa:** Variável de ambiente `NEXT_PUBLIC_API_URL` está **ERRADA** no Render!

### ✅ SOLUÇÃO IMEDIATA (2 minutos)

**No Render Dashboard → nr12-frontend → Environment:**

Alterar de:
```
NEXT_PUBLIC_API_URL=https://nr12-backend.onrender.com
```

Para:
```
NEXT_PUBLIC_API_URL=https://nr12-backend.onrender.com/api/v1
```

**Depois:**
1. Salvar alterações
2. Clicar em "Manual Deploy" → "Clear build cache & deploy"
3. Aguardar build (3-5 minutos)
4. Testar login com `admin` / `admin123`

---

## ✅ Status dos Serviços

### Frontend
- **URL**: https://nr12-frontend.onrender.com
- **Status**: ⚠️ ONLINE mas com erro 404 (variável de ambiente incorreta)
- **Último commit**: 03f531a
- **Build**: Concluído com sucesso

### Backend
- **URL**: https://nr12-backend.onrender.com
- **Status**: ✅ FUNCIONANDO 100%
- **Usuário admin**: ✅ Criado automaticamente
- **API funcionando**: ✅ Testado com curl

---

## 📝 Evidências do Problema

### Logs do Console (Frontend)
```
📤 API Request: POST https://nr12-backend.onrender.com/auth/login/
📥 API Response: 404
```

**Problema:** Falta `/api/v1` no caminho!

### Teste Manual (Backend - Funcionando)
```bash
curl -X POST https://nr12-backend.onrender.com/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Resposta:
{"detail": "Login realizado com sucesso.", "user": {...}}  ✅
```

---

## 🎯 Credenciais de Login

```
Username: admin
Password: admin123
Email: admin@nr12.com
```

**⚠️ IMPORTANTE:** Trocar senha após primeiro login!

---

## 📊 Variáveis de Ambiente Corretas

### Backend (nr12-backend)
```bash
DJANGO_SECRET_KEY=<gerado pelo Render>
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=nr12-backend.onrender.com
DJANGO_CORS_ORIGINS=https://nr12-frontend.onrender.com
DATABASE_URL=<PostgreSQL nr12-db>
ERP_PUBLIC_BASE_URL=https://nr12-backend.onrender.com
```

### Frontend (nr12-frontend) - ⚠️ CORRIGIR
```bash
NEXT_PUBLIC_API_URL=https://nr12-backend.onrender.com/api/v1
```

**❌ ERRO COMUM:** Esquecer o `/api/v1` no final!

---

## 🔧 Troubleshooting

### Se ainda der 404 após corrigir:
1. Verificar se salvou as alterações no Render
2. Verificar se fez redeploy manual
3. Limpar cache do navegador (Ctrl+Shift+Del)
4. Abrir aba anônima e testar novamente

### Se der CORS error:
- Backend já está configurado corretamente
- Verificar se `DJANGO_CORS_ORIGINS` está certo

### Se backend demorar:
- Servidores free tier "hibernam" após inatividade
- Primeiro acesso pode levar 30-60 segundos
- Abrir https://nr12-backend.onrender.com/api/v1/health/ primeiro

---

## 📋 Checklist de Deploy

- [x] Backend deployado no Render
- [x] Frontend deployado no Render
- [x] PostgreSQL configurado
- [x] Usuário admin criado automaticamente
- [x] CORS configurado
- [ ] **PENDING:** Corrigir `NEXT_PUBLIC_API_URL` no frontend
- [ ] **PENDING:** Fazer redeploy do frontend
- [ ] **PENDING:** Testar login
- [ ] **PENDING:** Trocar senha padrão

---

## 🆘 Links Úteis

- **Frontend**: https://nr12-frontend.onrender.com
- **Backend API**: https://nr12-backend.onrender.com/api/v1
- **Health Check**: https://nr12-backend.onrender.com/api/v1/health/
- **Admin Django**: https://nr12-backend.onrender.com/admin/
- **Render Dashboard**: https://dashboard.render.com

