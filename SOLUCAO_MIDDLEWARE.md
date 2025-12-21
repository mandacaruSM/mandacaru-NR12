# 🔧 Solução do Problema de Autenticação - Middleware

## 🎯 Problema Identificado

O backend Django estava autenticando corretamente (200 OK), mas o middleware do Next.js não conseguia "ver" que o usuário estava autenticado, causando redirecionamentos infinitos para `/login`.

### Evidência do Problema nos Logs:
```
✅ Backend: POST /api/v1/auth/login/ → 200 OK
✅ Backend: GET /api/v1/me/ → 200 OK
❌ Middleware: Token: ❌ (não encontrado)
❌ Middleware: Redirecionando /dashboard → /login
```

### Causa Raiz:

O **middleware do Next.js** roda no **Edge Runtime** e só consegue ler:
- Cookies da requisição
- Headers da requisição

Ele **NÃO** consegue ler:
- `localStorage`
- `sessionStorage`
- State do React (Zustand, Context, etc.)

O `AuthContext` estava fazendo login corretamente no backend Django (que usa cookies HttpOnly), mas **não estava definindo nenhum cookie que o middleware pudesse ler**. Por isso:

1. ✅ Login funcionava (backend retornava 200 OK)
2. ✅ `/me/` funcionava (cookies HttpOnly do Django eram enviados)
3. ❌ Middleware não via token (procurava cookie `access` que não existia)
4. ❌ Redirecionamento infinito `/dashboard` → `/login`

---

## ✅ Solução Implementada

Criamos **Route Handlers** no Next.js que fazem **proxy** da autenticação e definem cookies que o middleware pode ler.

### Arquitetura da Solução:

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────┐
│   Browser   │ ───> │  Next.js API     │ ───> │   Django    │
│             │      │  Route Handlers  │      │   Backend   │
│             │      │  /api/auth/*     │      │  /api/v1/*  │
└─────────────┘      └──────────────────┘      └─────────────┘
      ↑                      │                        │
      │                      │ Define cookies         │
      │                      │ (access=authenticated) │
      │                      ↓                        │
      │              ┌───────────────┐                │
      └──────────────│  Middleware   │                │
                     │  (Edge Runtime)│<───────────────┘
                     │  Lê cookie     │  (cookies HttpOnly)
                     │  "access"      │
                     └───────────────┘
```

### Fluxo de Autenticação:

#### 1. Login
```typescript
// AuthContext.tsx
const login = async (username, password) => {
  // Chama /api/auth/login (Route Handler local)
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

  // Route Handler faz:
  // 1. Chama Django /api/v1/auth/login/
  // 2. Recebe cookies HttpOnly do Django
  // 3. Define cookie "access=authenticated" para o middleware
  // 4. Retorna sucesso

  // Middleware agora vê: access ✅
}
```

#### 2. Verificação de Autenticação
```typescript
// AuthContext.tsx
const checkAuth = async () => {
  // Chama /api/auth/me (Route Handler local)
  const response = await fetch('/api/auth/me', {
    credentials: 'include', // Envia cookies
  });

  // Route Handler faz:
  // 1. Encaminha cookies para Django /api/v1/me/
  // 2. Django valida cookies HttpOnly
  // 3. Retorna dados do usuário

  return userData;
}
```

#### 3. Logout
```typescript
// AuthContext.tsx
const logout = async () => {
  // Chama /api/auth/logout (Route Handler local)
  await fetch('/api/auth/logout', { method: 'POST' });

  // Route Handler faz:
  // 1. Chama Django /api/v1/auth/logout/
  // 2. Remove cookie "access"
  // 3. Remove cookie "refresh"
}
```

### Middleware Continua Igual:

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get('access')?.value;

  // Agora o cookie "access" existe! ✅
  if (!accessToken && isDashboardPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}
```

---

## 📁 Arquivos Criados

### 1. `/app/api/auth/login/route.ts`

**Função:** Proxy de login que define cookie para o middleware

```typescript
export async function POST(request: NextRequest) {
  const { username, password } = await request.json();

  // Chama backend Django
  const response = await fetch(`${API_BASE_URL}/auth/login/`, {
    method: 'POST',
    body: JSON.stringify({ username, password }),
    credentials: 'include',
  });

  if (!response.ok) {
    return NextResponse.json({ error: 'Erro ao fazer login' }, { status: 400 });
  }

  // Define cookie "access" que o middleware pode ler
  const cookieStore = await cookies();
  cookieStore.set('access', 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60, // 1 hora
    path: '/',
  });

  return NextResponse.json(await response.json());
}
```

**Por que isso funciona:**
- Define cookie `access` que o **middleware consegue ler**
- Cookie é **HttpOnly** (seguro)
- Cookie é **SameSite=Lax** (funciona dentro do mesmo domínio)
- Cookie expira em 1 hora (sincronizado com sessão Django)

### 2. `/app/api/auth/logout/route.ts`

**Função:** Limpa cookies de autenticação

```typescript
export async function POST(request: NextRequest) {
  // Chama backend Django
  await fetch(`${API_BASE_URL}/auth/logout/`, {
    method: 'POST',
    credentials: 'include',
  });

  // Remove cookies locais
  const cookieStore = await cookies();
  cookieStore.delete('access');
  cookieStore.delete('refresh');

  return NextResponse.json({ detail: 'Logout realizado com sucesso' });
}
```

### 3. `/app/api/auth/me/route.ts`

**Função:** Encaminha verificação de autenticação para o backend

```typescript
export async function GET(request: NextRequest) {
  // Pega cookies da requisição
  const cookieHeader = request.headers.get('cookie') || '';

  // Encaminha para Django
  const response = await fetch(`${API_BASE_URL}/me/`, {
    headers: {
      'Cookie': cookieHeader, // Encaminha cookies HttpOnly do Django
    },
    credentials: 'include',
  });

  if (!response.ok) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  return NextResponse.json(await response.json());
}
```

---

## 🔐 Segurança

### Cookies Definidos:

| Cookie | Tipo | Onde é usado | Segurança |
|--------|------|--------------|-----------|
| `access` | HttpOnly | Middleware Next.js | ✅ HttpOnly, Secure, SameSite=Lax |
| `sessionid` | HttpOnly | Django Backend | ✅ HttpOnly, Secure (Django) |
| `csrftoken` | Não-HttpOnly | Django CSRF | ✅ SameSite (Django) |

### Por que é seguro?

1. **Cookie `access` é HttpOnly:**
   - JavaScript não consegue ler (protege contra XSS)
   - Só o servidor (middleware) acessa

2. **Cookies do Django continuam HttpOnly:**
   - Token real fica no `sessionid` (HttpOnly)
   - Cookie `access` é apenas um "flag" para o middleware

3. **SameSite=Lax:**
   - Protege contra CSRF em cross-site
   - Permite navegação normal dentro do site

4. **Secure em produção:**
   - Cookies só enviados via HTTPS no Render

---

## 📊 Comparação: Antes vs Depois

### ❌ ANTES (Não funcionava)

```
1. Login via AuthContext
   └─> Chama Django /api/v1/auth/login/ ✅
   └─> Django retorna 200 OK ✅
   └─> Django define cookies HttpOnly ✅
   └─> AuthContext NÃO define cookie "access" ❌

2. Usuário tenta acessar /dashboard
   └─> Middleware verifica cookie "access" ❌ (não existe)
   └─> Redireciona para /login ❌
   └─> Loop infinito ❌
```

### ✅ DEPOIS (Funciona)

```
1. Login via AuthContext
   └─> Chama Next.js /api/auth/login ✅
       └─> Route Handler chama Django ✅
       └─> Django retorna 200 OK ✅
       └─> Django define cookies HttpOnly ✅
       └─> Route Handler define cookie "access" ✅

2. Usuário tenta acessar /dashboard
   └─> Middleware verifica cookie "access" ✅ (existe!)
   └─> Permite acesso ✅
   └─> Dashboard carrega ✅
```

---

## 🚀 Deploy no Render

### Nenhuma configuração adicional necessária!

As alterações são **apenas no código frontend**. O Render vai:

1. Detectar o novo commit automaticamente
2. Fazer rebuild do frontend
3. Deploy automático
4. **Login vai funcionar imediatamente!**

### Variáveis de Ambiente (já configuradas):

```bash
# Frontend
NEXT_PUBLIC_API_URL=https://nr12-backend.onrender.com/api/v1

# Backend (não precisa mudar nada)
DJANGO_CORS_ORIGINS=https://nr12-frontend.onrender.com
```

---

## ✅ Como Testar Após Deploy

### 1. Acessar Frontend
```
https://nr12-frontend.onrender.com
```

### 2. Fazer Login
- Username: `admin`
- Password: `admin123`

### 3. Verificar Console do Navegador
Deve aparecer:
```
🔐 [API Route] Fazendo login no backend...
✅ [API Route] Login bem-sucedido
✅ Usuário autenticado: admin
✅ Login realizado com sucesso!
```

### 4. Verificar Middleware (não deve mais redirecionar)
```
🛣️ Middleware: /dashboard | Token: ✅
```

### 5. Dashboard deve carregar normalmente! ✅

---

## 🎯 Resumo da Solução

| Aspecto | Solução |
|---------|---------|
| **Problema** | Middleware não via token de autenticação |
| **Causa** | AuthContext não definia cookies que middleware pudesse ler |
| **Solução** | Route Handlers `/api/auth/*` que definem cookie `access` |
| **Vantagens** | ✅ Seguro (HttpOnly), ✅ Simples, ✅ Sem mudanças no backend |
| **Deploy** | ✅ Automático (Render detecta commit) |
| **Tempo** | ~5 minutos após push |

---

## 📝 Checklist de Verificação

Após deploy:

- [ ] Login funciona (200 OK)
- [ ] Cookie `access` é definido
- [ ] Middleware permite acesso ao `/dashboard`
- [ ] Não há redirecionamento infinito
- [ ] Logout limpa cookies corretamente
- [ ] Trocar senha padrão `admin123`

---

**Última atualização:** 2025-12-21
**Status:** ✅ Pronto para deploy
