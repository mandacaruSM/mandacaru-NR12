# Como Alterar Senha - Guia Completo

## Visão Geral

O sistema oferece **duas formas** de alterar senha:

1. **Alterar Senha** (usuário autenticado) - Requer senha atual
2. **Redefinir Senha** (admin ou recuperação) - Requer documento (CPF/CNPJ)

---

## 1. Alterar Senha (Usuário Logado)

### 1.1 Endpoint

**POST** `/api/v1/auth/change-password/`

### 1.2 Requisitos

- ✅ Usuário deve estar **autenticado** (logado)
- ✅ Deve saber a **senha atual**
- ✅ Nova senha deve ter **mínimo 6 caracteres**
- ✅ Nova senha deve ser **diferente da atual**

### 1.3 Exemplo de Uso

**Request:**
```bash
POST /api/v1/auth/change-password/
Content-Type: application/json
Cookie: access=<JWT_TOKEN>

{
  "current_password": "senhaAtual123",
  "new_password": "novaSenhaSegura456"
}
```

**Response (200):**
```json
{
  "detail": "Senha alterada com sucesso",
  "username": "12345678900"
}
```

### 1.4 Erros Possíveis

**Senha atual incorreta (400):**
```json
{
  "detail": "Senha atual incorreta"
}
```

**Nova senha muito curta (400):**
```json
{
  "detail": "Nova senha deve ter pelo menos 6 caracteres"
}
```

**Nova senha igual à atual (400):**
```json
{
  "detail": "Nova senha deve ser diferente da senha atual"
}
```

**Não autenticado (401):**
```json
{
  "detail": "Não autenticado"
}
```

---

## 2. Redefinir Senha (Sem Login)

### 2.1 Endpoint

**POST** `/api/v1/auth/reset-password/`

### 2.2 Requisitos

- ✅ Saber o **documento** (CPF ou CNPJ)
- ✅ Nova senha deve ter **mínimo 6 caracteres**
- ⚠️ **Atenção**: Qualquer pessoa com o documento pode redefinir a senha!

### 2.3 Exemplo de Uso

**Request:**
```bash
POST /api/v1/auth/reset-password/
Content-Type: application/json

{
  "documento": "12.345.678/0001-90",
  "new_password": "novaSenhaRecuperada789"
}
```

**Response (200):**
```json
{
  "detail": "Senha redefinida com sucesso",
  "username": "12345678000190"
}
```

### 2.4 Erros Possíveis

**Usuário não encontrado (404):**
```json
{
  "detail": "Usuário não encontrado com este documento"
}
```

**Senha muito curta (400):**
```json
{
  "detail": "Nova senha deve ter pelo menos 6 caracteres"
}
```

---

## 3. Fluxos de Uso

### 3.1 Fluxo: Cliente Altera Senha no Sistema

```
┌────────────────────────────────────────────────────┐
│ 1. Cliente faz login normalmente                   │
│    POST /api/v1/auth/login/                        │
└────────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────┐
│ 2. Cliente acessa "Alterar Senha" no perfil       │
│    (Frontend mostra formulário)                    │
└────────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────┐
│ 3. Cliente preenche:                               │
│    - Senha atual: xY9k2Lm8                        │
│    - Nova senha: MinhaNovaSenh@123                │
│    - Confirmar nova senha: MinhaNovaSenh@123      │
└────────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────┐
│ 4. Frontend valida e envia:                       │
│    POST /api/v1/auth/change-password/             │
│    {                                               │
│      "current_password": "xY9k2Lm8",              │
│      "new_password": "MinhaNovaSenh@123"          │
│    }                                               │
└────────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────┐
│ 5. Backend valida:                                 │
│    ✓ Senha atual está correta?                    │
│    ✓ Nova senha tem mínimo 6 caracteres?          │
│    ✓ Nova senha é diferente da atual?             │
└────────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────┐
│ 6. Backend altera senha e retorna sucesso         │
│    {"detail": "Senha alterada com sucesso"}       │
└────────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────┐
│ 7. Frontend mostra mensagem de sucesso            │
│    "Senha alterada com sucesso!"                   │
│    Cliente continua usando o sistema normalmente   │
└────────────────────────────────────────────────────┘
```

### 3.2 Fluxo: Cliente Esqueceu a Senha

```
┌────────────────────────────────────────────────────┐
│ 1. Cliente tenta fazer login mas esqueceu senha   │
│    Clica em "Esqueci minha senha"                 │
└────────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────┐
│ 2. Frontend pede documento (CPF/CNPJ)             │
│    Cliente digita: 12.345.678/0001-90             │
└────────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────┐
│ 3. Cliente define nova senha                      │
│    Nova senha: MinhaSenh@Recuper123               │
│    Confirmar: MinhaSenh@Recuper123                │
└────────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────┐
│ 4. Frontend envia:                                 │
│    POST /api/v1/auth/reset-password/              │
│    {                                               │
│      "documento": "12345678000190",               │
│      "new_password": "MinhaSenh@Recuper123"       │
│    }                                               │
└────────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────┐
│ 5. Backend valida documento e redefine senha      │
│    {"detail": "Senha redefinida com sucesso"}     │
└────────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────┐
│ 6. Frontend redireciona para login                │
│    Cliente faz login com a nova senha             │
└────────────────────────────────────────────────────┘
```

### 3.3 Fluxo: Admin Redefine Senha do Cliente

```
┌────────────────────────────────────────────────────┐
│ 1. Cliente liga: "Esqueci minha senha"            │
│    Admin anota o CNPJ do cliente                   │
└────────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────┐
│ 2. Admin usa endpoint ou Django Admin:            │
│    POST /api/v1/auth/reset-password/              │
│    {                                               │
│      "documento": "12345678000190",               │
│      "new_password": "SenhaTemporaria123"         │
│    }                                               │
└────────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────┐
│ 3. Admin informa ao cliente:                      │
│    "Sua nova senha é: SenhaTemporaria123"         │
└────────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────┐
│ 4. Cliente faz login com senha temporária         │
│    Recomendação: Alterar senha imediatamente      │
└────────────────────────────────────────────────────┘
```

---

## 4. Implementação no Frontend

### 4.1 Página de Alteração de Senha

```typescript
// frontend/src/app/profile/change-password/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validação no frontend
    if (newPassword.length < 6) {
      setError('Nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Nova senha e confirmação não coincidem');
      return;
    }

    if (currentPassword === newPassword) {
      setError('Nova senha deve ser diferente da senha atual');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Erro ao alterar senha');
      }

      setSuccess(true);

      // Redireciona após 2 segundos
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">Alterar Senha</h1>

      {success && (
        <div className="mb-4 p-4 bg-green-100 text-green-800 rounded">
          Senha alterada com sucesso! Redirecionando...
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-800 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Senha Atual
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            required
            disabled={loading || success}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Nova Senha
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            required
            minLength={6}
            disabled={loading || success}
          />
          <p className="text-xs text-gray-500 mt-1">
            Mínimo 6 caracteres
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Confirmar Nova Senha
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            required
            disabled={loading || success}
          />
        </div>

        <button
          type="submit"
          disabled={loading || success}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Alterando...' : 'Alterar Senha'}
        </button>
      </form>
    </div>
  );
}
```

### 4.2 Página de Recuperação de Senha

```typescript
// frontend/src/app/forgot-password/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [documento, setDocumento] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(1); // 1: documento, 2: nova senha
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validação
    if (newPassword.length < 6) {
      setError('Nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Senhas não coincidem');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documento: documento,
          new_password: newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Erro ao redefinir senha');
      }

      setSuccess(true);

      // Redireciona para login após 3 segundos
      setTimeout(() => {
        router.push('/login');
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'Erro ao redefinir senha');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-6 bg-white rounded-lg shadow">
          <div className="text-center">
            <div className="text-green-600 text-6xl mb-4">✓</div>
            <h2 className="text-2xl font-bold mb-4">Senha Redefinida!</h2>
            <p className="text-gray-600 mb-4">
              Sua senha foi redefinida com sucesso.
              Redirecionando para o login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">Recuperar Senha</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-800 rounded">
            {error}
          </div>
        )}

        {step === 1 && (
          <div>
            <p className="text-gray-600 mb-4">
              Digite seu CPF ou CNPJ para redefinir a senha
            </p>
            <input
              type="text"
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              placeholder="CPF ou CNPJ"
              className="w-full px-3 py-2 border rounded mb-4"
              required
            />
            <button
              onClick={() => setStep(2)}
              disabled={!documento}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              Continuar
            </button>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Nova Senha
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                required
                minLength={6}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Confirmar Nova Senha
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Redefinindo...' : 'Redefinir Senha'}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-gray-600 hover:text-gray-800"
            >
              Voltar
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link href="/login" className="text-blue-600 hover:text-blue-800">
            Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  );
}
```

---

## 5. Segurança

### 5.1 Boas Práticas Implementadas

✅ **Senha atual obrigatória** - Previne alteração não autorizada
✅ **Mínimo 6 caracteres** - Requisito básico de segurança
✅ **Senha diferente da atual** - Evita "não alteração"
✅ **Hash bcrypt** - Django usa hash seguro automaticamente
✅ **HTTP-Only cookies** - Tokens não acessíveis via JavaScript

### 5.2 Melhorias Futuras

🔄 **Email de confirmação** - Avisar por email quando senha for alterada
🔄 **Validação de senha forte** - Exigir letras, números e símbolos
🔄 **Histórico de senhas** - Impedir reutilização de senhas antigas
🔄 **Rate limiting** - Limitar tentativas de alteração de senha
🔄 **Código de verificação** - Enviar código por email para redefinição
🔄 **Expiração de link** - Link de recuperação com tempo limitado

---

## 6. Troubleshooting

### 6.1 "Senha atual incorreta"

**Problema**: Cliente digitou a senha atual errada

**Solução**:
1. Pedir para tentar novamente
2. Se esqueceu, usar "Esqueci minha senha"
3. Admin pode redefinir usando o endpoint de reset

### 6.2 "Usuário não encontrado com este documento"

**Problema**: Documento não existe no sistema

**Solução**:
1. Verificar se o documento está correto
2. Verificar se cliente tem usuário criado:
   ```python
   from cadastro.models import Cliente
   cliente = Cliente.objects.get(documento='12345678000190')
   print(cliente.user)  # Deve retornar User, não None
   ```
3. Se `user` é None, criar manualmente ou cadastrar cliente novamente

### 6.3 Cliente não consegue alterar senha

**Problema**: Erro 401 ao chamar /auth/change-password/

**Diagnóstico**:
```bash
# Verificar se está autenticado
GET /api/v1/me/
# Deve retornar dados do usuário, não 401
```

**Solução**:
1. Fazer login novamente
2. Verificar se cookies estão sendo enviados (`credentials: 'include'`)
3. Verificar se token não expirou

---

## 7. Resumo dos Endpoints

| Endpoint | Método | Autenticação | Usa Para |
|----------|--------|--------------|----------|
| `/api/v1/auth/change-password/` | POST | ✅ Requerida | Cliente alterar sua própria senha |
| `/api/v1/auth/reset-password/` | POST | ❌ Não requerida | Recuperar senha esquecida ou admin redefinir |
| `/api/v1/auth/login/` | POST | ❌ Não requerida | Fazer login após alterar/redefinir senha |
| `/api/v1/me/` | GET | ✅ Requerida | Verificar se está autenticado |

---

## 8. Próximos Passos Recomendados

Para melhorar o sistema de senhas:

1. **Implementar envio de email**
   - Enviar credenciais iniciais por email
   - Enviar código de verificação para redefinição
   - Notificar quando senha for alterada

2. **Adicionar validação de senha forte**
   ```python
   # backend/core/validators.py
   def validate_strong_password(password):
       if len(password) < 8:
           raise ValidationError('Senha deve ter pelo menos 8 caracteres')
       if not any(char.isdigit() for char in password):
           raise ValidationError('Senha deve conter pelo menos um número')
       if not any(char.isupper() for char in password):
           raise ValidationError('Senha deve conter pelo menos uma letra maiúscula')
   ```

3. **Implementar recuperação via email**
   - Gerar token único
   - Enviar link com token
   - Validar token antes de permitir redefinição

4. **Adicionar campo "Forçar alteração de senha no primeiro login"**
   ```python
   # backend/core/models.py
   class Profile(models.Model):
       must_change_password = models.BooleanField(default=False)
   ```

---

**Sistema de alteração de senha implementado e funcionando!** 🔐
