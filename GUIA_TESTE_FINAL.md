# 🧪 Guia de Teste Final - NR12 ERP

**Data:** 2024-12-25
**URLs Confirmadas:**
- **Frontend:** https://nr12-frontend.onrender.com
- **Backend:** https://nr12-backend.onrender.com

---

## ✅ Status dos Serviços

### Frontend (Next.js)
- **URL:** https://nr12-frontend.onrender.com
- **Status:** ✅ ONLINE (200 OK)
- **Server:** Next.js + Render
- **Último Deploy:** Commit 18d4156 (fix tipagem proxy)

### Backend (Django + Gunicorn)
- **URL:** https://nr12-backend.onrender.com
- **Status:** ✅ ONLINE (200 OK)
- **Health Check:** https://nr12-backend.onrender.com/api/v1/health/
- **Server:** Gunicorn + Django + PostgreSQL

---

## 🎯 Teste 1: Login

### Passo 1: Acessar Tela de Login
```
URL: https://nr12-frontend.onrender.com/login
```

**Verificações:**
- [ ] Página carrega sem erros
- [ ] Formulário de login visível
- [ ] Campos: Username e Password

### Passo 2: Fazer Login
```
Username: admin
Password: admin123
```

**Ações:**
1. Digite `admin` no campo Username
2. Digite `admin123` no campo Password
3. Clique em "Entrar"

**Resultados Esperados:**
- ✅ Redirecionamento para `/dashboard`
- ✅ Dashboard carrega sem erros
- ✅ Nenhum erro 401 no console

**Se der erro "Credenciais inválidas":**
- Significa que o usuário admin ainda não foi criado
- Veja [Solução Alternativa](#solução-alternativa-criar-usuário-manualmente) abaixo

### Passo 3: Verificar Cookies (DevTools)
1. Abra DevTools (F12)
2. Vá em **Application** → **Cookies**
3. Selecione `https://nr12-frontend.onrender.com`

**Cookies Esperados:**
```
Name: access
Value: <token JWT>
Domain: nr12-frontend.onrender.com
Path: /
HttpOnly: ✓
Secure: ✓
SameSite: None

Name: refresh
Value: <token JWT>
Domain: nr12-frontend.onrender.com
Path: /
HttpOnly: ✓
Secure: ✓
SameSite: None
```

### Passo 4: Verificar Console
DevTools → Console

**Logs Esperados:**
```
🔐 Tentando fazer login...
🍪 [API Route] Cookies recebidos do Django: 2
🔑 [API Route] Access token extraído: SIM
🔑 [API Route] Refresh token extraído: SIM
🍪 [API Route] Cookie access definido
🍪 [API Route] Cookie refresh definido
✅ Login bem-sucedido, cookies definidos
🔍 Verificando autenticação...
✅ Usuário autenticado: admin
```

**Logs NÃO ESPERADOS (problemas):**
```
❌ 401 Unauthorized
❌ Não autenticado
❌ CORS Error
```

---

## 🎯 Teste 2: Dashboard e Dados

### Passo 1: Navegar no Dashboard
Após login, você deve estar em `/dashboard`

**Verificações:**
- [ ] Sidebar esquerda visível com menu
- [ ] Header superior com nome do usuário
- [ ] Cards de estatísticas (podem estar vazios se não há dados)
- [ ] Nenhum erro 401 no console

### Passo 2: Acessar Clientes
Clique em **"Clientes"** no menu lateral

**URL Esperada:** `/dashboard/clientes`

**Verificações:**
- [ ] Página carrega sem erros
- [ ] Tabela de clientes visível (vazia ou com dados)
- [ ] Botão "Novo Cliente" visível
- [ ] Console mostra requisições bem-sucedidas

**Console Esperado:**
```
🔀 [Proxy] GET /cadastro/clientes/
📥 API Response: 200 OK
✅ Lista de clientes carregada
```

**Console NÃO ESPERADO:**
```
❌ 401 Unauthorized  ← Se aparecer, há problema!
❌ Não autenticado
```

### Passo 3: Acessar Empreendimentos
Clique em **"Empreendimentos"** no menu lateral

**Verificações:**
- [ ] Página carrega sem erros (status 200)
- [ ] Nenhum erro 401 no console
- [ ] Requisições API passando pelo proxy

**Console Esperado:**
```
🔀 [Proxy] GET /cadastro/empreendimentos/
📥 API Response: 200 OK
```

### Passo 4: Acessar Equipamentos
Clique em **"Equipamentos"** no menu lateral

**Verificações:**
- [ ] Página carrega sem erros
- [ ] Console mostra proxy funcionando
- [ ] Dados carregam (se houver)

---

## 🎯 Teste 3: Verificar Proxy (Avançado)

### DevTools → Network Tab

1. Abra DevTools (F12)
2. Vá em **Network**
3. Filtre por "Fetch/XHR"
4. Navegue entre páginas do dashboard

**Requisições Esperadas:**
```
Request URL: https://nr12-frontend.onrender.com/api/proxy/cadastro/clientes/
Method: GET
Status: 200 OK
Request Headers:
  Cookie: access=<token>; refresh=<token>
Response:
  { "results": [...], "count": 0 }
```

**IMPORTANTE:**
- ✅ URLs devem começar com `/api/proxy/`
- ✅ Status deve ser 200 (não 401)
- ✅ Cookies enviados automaticamente

**Requisições NÃO ESPERADAS (problemas):**
```
Request URL: https://nr12-backend.onrender.com/...  ← Direto ao backend!
Status: 401 Unauthorized  ← Sem autenticação!
```

---

## 🎯 Teste 4: Navegação e Persistência

### Passo 1: Testar Navegação
Navegue entre várias páginas:
1. Dashboard
2. Clientes
3. Empreendimentos
4. Equipamentos
5. Voltar para Dashboard

**Verificações:**
- [ ] Nenhum loop de redirecionamento
- [ ] Cookies persistem entre páginas
- [ ] Middleware não bloqueia navegação
- [ ] Console limpo (sem erros 401)

### Passo 2: Recarregar Página (F5)
1. Estando em `/dashboard/clientes`
2. Pressione F5 (reload)

**Resultado Esperado:**
- ✅ Página recarrega normalmente
- ✅ Usuário continua logado
- ✅ Dados carregam sem erro 401

**Resultado NÃO ESPERADO:**
- ❌ Redirecionado para /login
- ❌ Erro 401 Unauthorized

---

## 🎯 Teste 5: Logout

### Passo 1: Fazer Logout
1. Clique no botão de logout (ícone de porta/seta no canto inferior da sidebar)

**Resultados Esperados:**
- ✅ Redirecionamento para `/login`
- ✅ Cookies `access` e `refresh` removidos
- ✅ Tentativa de acessar `/dashboard` redireciona para `/login`

### Passo 2: Verificar Cookies Removidos
DevTools → Application → Cookies

**Verificação:**
- [ ] Cookie `access` foi removido
- [ ] Cookie `refresh` foi removido

---

## ⚠️ Solução de Problemas

### Problema 1: "Credenciais inválidas" no login

**Causa:** Usuário admin ainda não foi criado no banco

**Solução Alternativa: Criar Usuário Manualmente**

#### Opção A: Via Dashboard do Render (Recomendado)
1. Acesse: https://dashboard.render.com
2. Vá em **Services** → **nr12-backend**
3. Clique na aba **Shell**
4. Execute:
   ```bash
   python manage.py create_default_user
   ```
5. Aguarde mensagem:
   ```
   ✅ Usuário criado com sucesso!
   Username: admin
   Password: admin123
   ```
6. Volte ao frontend e faça login

#### Opção B: Via Python Shell
No Shell do Render:
```bash
python manage.py shell
```

Cole:
```python
from django.contrib.auth import get_user_model
from core.models import Profile

User = get_user_model()

user = User.objects.create_superuser(
    username='admin',
    email='admin@nr12.com',
    password='admin123'
)

Profile.objects.create(
    user=user,
    role='ADMIN',
    modules_enabled=[
        'dashboard', 'clientes', 'empreendimentos', 'equipamentos',
        'tipos_equipamento', 'operadores', 'tecnicos', 'supervisores',
        'manutencoes', 'manutencao_preventiva', 'nr12', 'orcamentos',
        'ordens_servico', 'almoxarifado', 'abastecimentos', 'financeiro',
        'relatorios',
    ]
)

print("✅ Usuário admin criado!")
exit()
```

### Problema 2: Requisições retornam 401 após login

**Causa:** Proxy não está funcionando ou cookies não estão sendo lidos

**Diagnóstico:**
1. DevTools → Console → Procure por logs do proxy:
   ```
   🔀 [Proxy] GET /cadastro/clientes/
   ```
2. Se NÃO aparecer `🔀 [Proxy]`, o proxy não está ativo

**Solução:**
1. Verifique que `frontend/src/lib/api.ts` tem:
   ```typescript
   const API_BASE = '/api/proxy';
   ```
2. Verifique que `frontend/src/app/api/proxy/[...path]/route.ts` existe
3. Limpe cache do navegador (Ctrl+Shift+Delete)
4. Faça logout e login novamente

### Problema 3: CORS Error

**Causa:** Backend não aceita origem do frontend

**Solução:**
1. Verifique no código do backend (`backend/config/settings.py`):
   ```python
   CORS_ALLOWED_ORIGINS = ['https://nr12-frontend.onrender.com']
   ```
2. Se estiver diferente, corrija e faça redeploy
3. Sem trailing slash!

### Problema 4: Cookies não aparecem no DevTools

**Causa:** Login não está configurando cookies ou navegador bloqueou

**Solução:**
1. Verifique que está em HTTPS (não HTTP)
2. Limpe cookies antigos: DevTools → Application → Clear storage
3. Faça login novamente
4. Verifique console para logs de cookie:
   ```
   🍪 [API Route] Cookie access definido
   ```

### Problema 5: Loop de redirecionamento

**Causa:** Cookies antigos do localStorage ou middleware mal configurado

**Solução:**
1. DevTools → Application → Clear storage
2. Marque "Cookies" e "Local storage"
3. Clique "Clear site data"
4. Recarregue (Ctrl+F5)
5. Faça login novamente

---

## 📊 Checklist Final de Validação

### Login e Autenticação
- [ ] Login com admin/admin123 funciona
- [ ] Cookies access e refresh criados
- [ ] Cookies têm atributos corretos (HttpOnly, Secure, SameSite)
- [ ] Redirecionamento para /dashboard após login
- [ ] Console mostra "✅ Usuário autenticado: admin"

### Requisições API
- [ ] Todas as requisições passam por /api/proxy/
- [ ] Console mostra logs de proxy: 🔀 [Proxy]
- [ ] Status 200 OK (não 401)
- [ ] Dados carregam sem erro

### Navegação
- [ ] Navegação entre páginas sem loops
- [ ] Cookies persistem ao navegar
- [ ] F5 (reload) mantém usuário logado
- [ ] Middleware não bloqueia acesso

### Logout
- [ ] Logout redireciona para /login
- [ ] Cookies removidos após logout
- [ ] /dashboard inacessível após logout

### Cross-Domain
- [ ] Frontend em nr12-frontend.onrender.com
- [ ] Backend em nr12-backend.onrender.com
- [ ] Proxy funcionando como ponte
- [ ] Sem erros CORS

---

## 🎉 Sistema Funcionando - Indicadores

Você saberá que o sistema está **100% funcional** quando:

1. ✅ **Login:** Sem erro "Credenciais inválidas"
2. ✅ **Console:** Logs de proxy aparecem
3. ✅ **Cookies:** Visíveis no DevTools com atributos corretos
4. ✅ **Dashboard:** Carrega sem erros 401
5. ✅ **Clientes/Empreendimentos:** Páginas carregam com status 200
6. ✅ **Network Tab:** Todas as requisições vão para /api/proxy/
7. ✅ **Navegação:** Fluida sem loops ou redirecionamentos
8. ✅ **Logout:** Remove cookies e bloqueia acesso ao dashboard

---

## 📞 Precisa de Ajuda?

Se os testes não passarem, verifique:

1. **Logs do Render:**
   - Backend: Procure por "✅ Usuário criado com sucesso!"
   - Frontend: Procure por erros de build

2. **Documentação Completa:**
   - [SOLUCAO_CROSS_DOMAIN_COOKIES.md](SOLUCAO_CROSS_DOMAIN_COOKIES.md)
   - [CRIAR_USUARIO_ADMIN.md](CRIAR_USUARIO_ADMIN.md)
   - [DEPLOY_STATUS.md](DEPLOY_STATUS.md)

3. **Commits Aplicados:**
   - 18d4156: Fix tipagem proxy (Next.js 15)
   - 1721d3b: Fix autenticação cross-domain via proxy
   - d769aaa: Criação automática de usuário admin

---

**🚀 Boa sorte com os testes!**

Se tudo funcionar, o sistema está pronto para produção! 🎊
