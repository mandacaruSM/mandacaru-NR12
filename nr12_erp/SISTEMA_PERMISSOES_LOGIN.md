# Sistema de Permissões e Login Automático

## Visão Geral

Sistema completo de autenticação e autorização com criação automática de usuários para Supervisores e Clientes, controle de acesso por roles e módulos.

---

## 1. Criação Automática de Usuários

### 1.1 Supervisor

Quando um **Supervisor** é cadastrado, automaticamente:

1. **Usuário Django é criado:**
   - Username: CPF sem pontuação (ex: `12345678900`)
   - Password: Gerada aleatoriamente (8 caracteres)
   - Email: Email do supervisor
   - First/Last Name: Extraídos do nome completo

2. **Profile é configurado:**
   - Role: `SUPERVISOR`
   - Módulos habilitados:
     - dashboard
     - empreendimentos
     - equipamentos
     - abastecimentos
     - manutencoes
     - manutencao_preventiva
     - nr12
     - operadores
     - relatorios

3. **Vínculo é criado:**
   - Campo `user` no Supervisor aponta para o User criado
   - Relacionamento OneToOne entre Supervisor e User

**Localização do código:**
- Signal: `backend/core/signals.py` → `create_supervisor_user`
- Migration: `backend/core/migrations/0005_supervisor_user_field.py`

**Como obter as credenciais:**
```bash
# As credenciais são impressas no console ao criar o supervisor
[SUPERVISOR CRIADO] Username: 12345678900 | Senha: AbC12345 | Email: supervisor@email.com
```

### 1.2 Cliente

Quando um **Cliente** é cadastrado, automaticamente:

1. **Usuário Django é criado:**
   - Username: CNPJ ou CPF sem pontuação
   - Password: Gerada aleatoriamente (8 caracteres)
   - Email: Email financeiro do cliente

2. **Profile é configurado:**
   - Role: `CLIENTE`
   - Módulos habilitados:
     - dashboard
     - empreendimentos
     - equipamentos
     - relatorios

**Localização do código:**
- Signal: `backend/core/signals.py` → `create_cliente_user`

---

## 2. Roles (Papéis) e Permissões

### 2.1 Roles Disponíveis

| Role | Descrição | Acesso |
|------|-----------|--------|
| **ADMIN** | Administrador do Sistema | Acesso total a todos os módulos e dados |
| **SUPERVISOR** | Supervisor/Encarregado | Gerencia operadores, visualiza relatórios, acesso a empreendimentos e equipamentos |
| **OPERADOR** | Operador de Equipamentos | Executa checklists de NR12, acesso limitado a equipamentos autorizados |
| **TECNICO** | Técnico de Manutenção | Realiza manutenções, registra atividades de reparo |
| **CLIENTE** | Cliente/Empresa | Visualiza dados do próprio cliente (empreendimentos, equipamentos, relatórios) |
| **FINANCEIRO** | Gestor Financeiro | Acesso ao módulo financeiro, orçamentos e ordens de serviço |
| **COMPRAS** | Gestor de Compras | Acesso ao almoxarifado e abastecimentos |

### 2.2 Módulos por Role

**ADMIN:**
```python
[
    "dashboard", "clientes", "empreendimentos", "equipamentos",
    "tipos_equipamento", "operadores", "tecnicos", "supervisores",
    "manutencoes", "manutencao_preventiva", "nr12", "orcamentos",
    "ordens_servico", "almoxarifado", "abastecimentos",
    "financeiro", "relatorios"
]
```

**SUPERVISOR:**
```python
[
    "dashboard", "empreendimentos", "equipamentos", "abastecimentos",
    "manutencoes", "manutencao_preventiva", "nr12", "operadores",
    "relatorios"
]
```

**CLIENTE:**
```python
[
    "dashboard", "empreendimentos", "equipamentos", "relatorios"
]
```

---

## 3. Permission Classes

### 3.1 IsAdminUser

Permite acesso apenas para usuários com role `ADMIN`.

**Uso:**
```python
from core.permissions import IsAdminUser

class SupervisorViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]
```

### 3.2 IsSupervisorUser

Permite acesso para usuários com role `SUPERVISOR` ou `ADMIN`.

**Uso:**
```python
from core.permissions import IsSupervisorUser

class RelatorioViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsSupervisorUser]
```

### 3.3 HasModuleAccess

Verifica se o usuário tem o módulo habilitado no seu profile.

**Uso:**
```python
from core.permissions import HasModuleAccess

class EquipamentosViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasModuleAccess]
    required_module = 'equipamentos'  # Define qual módulo é necessário
```

### 3.4 CanManageOperadores

Permite leitura para `SUPERVISOR` e `ADMIN`, mas apenas `ADMIN` pode criar/editar/deletar.

**Uso:**
```python
from core.permissions import CanManageOperadores

class OperadorViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, CanManageOperadores]
```

### 3.5 CanViewOwnDataOnly

Usuários não-admin só podem ver seus próprios dados ou dados relacionados.

**Uso:**
```python
from core.permissions import CanViewOwnDataOnly

class DocumentoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, CanViewOwnDataOnly]
```

---

## 4. Endpoints de Autenticação

### 4.1 Login

**POST** `/api/v1/auth/login/`

```json
{
  "username": "12345678900",  // CPF/CNPJ sem pontuação
  "password": "senha123"
}
```

**Resposta (200):**
```json
{
  "detail": "Login realizado com sucesso.",
  "user": {
    "id": 1,
    "username": "12345678900",
    "email": "supervisor@email.com"
  }
}
```

Cookies HTTP-Only são automaticamente definidos:
- `access`: Token JWT (validade: 2 horas)
- `refresh`: Refresh token (validade: 7 dias)

### 4.2 Logout

**POST** `/api/v1/auth/logout/`

Blacklista o refresh token e remove os cookies.

### 4.3 Refresh Token

**POST** `/api/v1/auth/refresh/`

Renova o access token usando o refresh token do cookie.

### 4.4 Obter Dados do Usuário Autenticado

**GET** `/api/v1/me/`

**Resposta (200):**
```json
{
  "id": 1,
  "username": "12345678900",
  "email": "supervisor@email.com",
  "first_name": "João",
  "last_name": "Silva",
  "role": "SUPERVISOR",
  "modules_enabled": [
    "dashboard",
    "empreendimentos",
    "equipamentos",
    "abastecimentos",
    "manutencoes",
    "manutencao_preventiva",
    "nr12",
    "operadores",
    "relatorios"
  ],
  "supervisor": {
    "id": 1,
    "nome_completo": "João Silva",
    "cpf": "123.456.789-00",
    "email": "supervisor@email.com",
    "telefone": "(11) 98765-4321"
  }
}
```

### 4.5 Redefinir Senha

**POST** `/api/v1/auth/reset-password/`

```json
{
  "documento": "12345678900",  // CPF ou CNPJ sem pontuação
  "new_password": "novaSenha123"
}
```

**Resposta (200):**
```json
{
  "detail": "Senha redefinida com sucesso",
  "username": "12345678900"
}
```

---

## 5. Fluxo de Cadastro e Login

### 5.1 Fluxo do Supervisor

```
1. Admin cadastra Supervisor
   ↓
2. Signal cria User automaticamente
   ↓
3. Password gerada é impressa no console
   ↓
4. Admin informa credenciais ao Supervisor
   (Username: CPF sem pontuação)
   ↓
5. Supervisor faz login com CPF e senha
   ↓
6. Sistema autentica e define cookies
   ↓
7. Frontend redireciona para dashboard
```

### 5.2 Primeiro Acesso do Supervisor

1. **Login com CPF e senha inicial**
   ```
   POST /api/v1/auth/login/
   {
     "username": "12345678900",
     "password": "AbC12345"  // Senha gerada
   }
   ```

2. **Redefinir senha (opcional)**
   ```
   POST /api/v1/auth/reset-password/
   {
     "documento": "12345678900",
     "new_password": "minhaNovaSenha"
   }
   ```

3. **Fazer login novamente com nova senha**

---

## 6. Segurança

### 6.1 Cookies HTTP-Only

Os tokens JWT são armazenados em cookies HTTP-Only:
- **Proteção contra XSS:** JavaScript não pode acessar os cookies
- **HTTPS obrigatório em produção:** `Secure=True`
- **SameSite:** `Lax` (dev) / `None` (prod para cross-origin)

### 6.2 Middleware de Autenticação

`CookieToAuthorizationMiddleware` promove o cookie `access` para o header `Authorization`:

```python
# Cookie: access=eyJ0eXAiOiJKV1QiLCJhbGc...
# Header: Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

### 6.3 Token Blacklist

Ao fazer logout, o refresh token é adicionado à blacklist, invalidando-o permanentemente.

### 6.4 Validação de CPF/CNPJ

Validadores customizados garantem que documentos sejam válidos:
- `validate_cpf(value)`: Valida CPF com dígitos verificadores
- `validate_cnpj(value)`: Valida CNPJ com dígitos verificadores

**Localização:** `backend/core/validators.py`

---

## 7. Exemplos de Uso no Frontend

### 7.1 Login

```typescript
// frontend/src/lib/api.ts
async function login(username: string, password: string) {
  const response = await fetch('/api/v1/auth/login/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',  // Importante para enviar/receber cookies
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    throw new Error('Login falhou');
  }

  return await response.json();
}
```

### 7.2 Obter Dados do Usuário

```typescript
async function getMe() {
  const response = await fetch('/api/v1/me/', {
    credentials: 'include'  // Envia cookies automaticamente
  });

  return await response.json();
}
```

### 7.3 Proteger Rotas no Frontend

```typescript
// frontend/src/middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('access');

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verificar role/módulos se necessário
  return NextResponse.next();
}
```

---

## 8. Testes

### 8.1 Testar Criação de Supervisor

```bash
# Via Django Admin ou API
POST /api/v1/supervisores/
{
  "nome_completo": "João Silva",
  "cpf": "123.456.789-00",
  "data_nascimento": "1990-01-01",
  "email": "joao@email.com",
  "telefone": "(11) 98765-4321"
}

# Verificar console para credenciais:
# [SUPERVISOR CRIADO] Username: 12345678900 | Senha: AbC12345 | Email: joao@email.com
```

### 8.2 Testar Login

```bash
POST /api/v1/auth/login/
{
  "username": "12345678900",
  "password": "AbC12345"
}

# Cookies devem ser definidos:
# Set-Cookie: access=eyJ0eXAi...; HttpOnly; Secure; SameSite=None
# Set-Cookie: refresh=eyJ0eXAi...; HttpOnly; Secure; SameSite=None
```

### 8.3 Testar Permissões

```bash
# Como SUPERVISOR, tentar acessar endpoint restrito a ADMIN
GET /api/v1/supervisores/
# Esperado: 403 Forbidden

# Como SUPERVISOR, acessar endpoint permitido
GET /api/v1/operadores/
# Esperado: 200 OK (apenas leitura)
```

---

## 9. Troubleshooting

### 9.1 Supervisor não consegue fazer login

**Problema:** Credenciais inválidas

**Solução:**
1. Verificar se o usuário foi criado:
   ```python
   from django.contrib.auth.models import User
   User.objects.filter(username='12345678900').exists()
   ```

2. Verificar se o signal foi executado:
   ```python
   from core.models import Supervisor
   supervisor = Supervisor.objects.get(cpf='123.456.789-00')
   print(supervisor.user)  # Deve retornar o User
   ```

3. Redefinir senha manualmente:
   ```python
   user = User.objects.get(username='12345678900')
   user.set_password('novaSenha')
   user.save()
   ```

### 9.2 Permissão negada para Supervisor

**Problema:** 403 Forbidden ao acessar recurso

**Solução:**
1. Verificar role do usuário:
   ```python
   user.profile.role  # Deve ser 'SUPERVISOR'
   ```

2. Verificar módulos habilitados:
   ```python
   user.profile.modules_enabled
   # Deve incluir o módulo necessário
   ```

3. Verificar se a view tem `required_module` definido

### 9.3 Cookies não são enviados

**Problema:** Cookies HTTP-Only não aparecem nas requisições

**Solução:**
1. Garantir `credentials: 'include'` no fetch:
   ```javascript
   fetch('/api/v1/me/', { credentials: 'include' })
   ```

2. Verificar CORS:
   ```python
   # settings.py
   CORS_ALLOWED_ORIGINS = ['https://frontend.com']
   CORS_ALLOW_CREDENTIALS = True
   ```

3. Verificar se está usando HTTPS em produção (obrigatório para `Secure=True`)

---

## 10. Próximos Passos (TODO)

- [ ] Implementar envio de email com credenciais ao criar supervisor
- [ ] Adicionar campo `user` no model Cliente (similar ao Supervisor)
- [ ] Implementar recuperação de senha via email
- [ ] Criar interface de primeiro acesso para trocar senha
- [ ] Adicionar 2FA (Two-Factor Authentication) opcional
- [ ] Implementar auditoria de acessos (quem acessou o que e quando)
- [ ] Criar dashboard específico por role
- [ ] Implementar rate limiting para proteção contra força bruta

---

## Arquivos Modificados/Criados

- `backend/core/signals.py` - Signals de criação de usuários
- `backend/core/permissions.py` - Permission classes customizadas
- `backend/core/views.py` - Views atualizadas com permissões
- `backend/core/migrations/0005_supervisor_user_field.py` - Migration para campo user
- `backend/config/auth_views.py` - Endpoints de reset password e me
- `backend/config/urls.py` - Rotas atualizadas
