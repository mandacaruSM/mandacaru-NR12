# Gerenciamento de Senhas de Clientes

Este documento explica como o sistema gerencia as credenciais de acesso dos clientes.

## Índice

1. [Criação Automática de Usuários](#criação-automática-de-usuários)
2. [Alteração de Senha pelo Admin (Via Edição)](#alteração-de-senha-via-edição)
3. [Resetar Senha (Action Dedicada)](#resetar-senha-action-dedicada)
4. [Permissões](#permissões)
5. [Exemplos de Uso](#exemplos-de-uso)

---

## Criação Automática de Usuários

Quando um **Cliente** é cadastrado no sistema, um usuário é criado automaticamente através de um signal Django.

### Credenciais Geradas

- **Username**: CNPJ/CPF do cliente (apenas números)
- **Senha**: Aleatória de 8 caracteres
- **Email**: Email financeiro do cliente (ou gerado automaticamente)
- **Role**: `CLIENTE`
- **Módulos habilitados**:
  - dashboard
  - empreendimentos
  - equipamentos
  - relatorios

### Logs

As credenciais são exibidas no console do backend:

```
[CLIENTE CRIADO] Username: 12345678900 | Senha: aB3dE9fG | Email: cliente@empresa.com
```

⚠️ **Importante**: A senha aleatória **NÃO é armazenada em nenhum lugar** após a criação. Certifique-se de:
1. Copiar a senha do log imediatamente
2. Enviar para o cliente via email (implementação futura)
3. Ou resetar a senha usando uma das opções abaixo

---

## Alteração de Senha via Edição

Administradores podem definir uma nova senha ao **editar** um cliente existente.

### Endpoint

```
PATCH /api/v1/cadastro/clientes/{id}/
PUT /api/v1/cadastro/clientes/{id}/
```

### Permissões

✅ **ADMIN** apenas

### Payload

```json
{
  "nome_razao": "Empresa XYZ Ltda",
  "telefone": "(11) 98765-4321",
  "nova_senha": "MinhaNovaSenh@123"
}
```

O campo `nova_senha` é **opcional** e **write-only**:
- Se fornecido, a senha do usuário será alterada
- Se não fornecido, apenas os outros campos serão atualizados
- Mínimo de 6 caracteres

### Resposta

```json
{
  "id": 1,
  "nome_razao": "Empresa XYZ Ltda",
  "documento": "12345678900",
  "username": "12345678900",  // read-only
  "telefone": "(11) 98765-4321",
  ...
}
```

⚠️ A senha **NÃO é retornada** na resposta por segurança.

### Log

```
[SENHA ALTERADA] Cliente: Empresa XYZ Ltda | Username: 12345678900 | Nova senha definida pelo admin
```

---

## Resetar Senha (Action Dedicada)

Action específica para resetar a senha de um cliente, com opção de gerar senha aleatória.

### Endpoint

```
POST /api/v1/cadastro/clientes/{id}/resetar_senha/
```

### Permissões

✅ **ADMIN** apenas

### Opção 1: Gerar senha aleatória

```bash
# Request
POST /api/v1/cadastro/clientes/5/resetar_senha/
Content-Type: application/json
```

```json
{}
```

```json
# Response
{
  "detail": "Senha resetada com sucesso.",
  "username": "12345678900",
  "senha": "xY9pQr2m",  // ⚠️ Senha aleatória gerada
  "senha_gerada_automaticamente": true
}
```

### Opção 2: Definir senha específica

```bash
# Request
POST /api/v1/cadastro/clientes/5/resetar_senha/
Content-Type: application/json
```

```json
{
  "senha": "Senh@Forte2024"
}
```

```json
# Response
{
  "detail": "Senha resetada com sucesso.",
  "username": "12345678900",
  "senha": "***",  // ⚠️ Senha customizada não é retornada
  "senha_gerada_automaticamente": false
}
```

### Validações

- Cliente deve ter usuário vinculado
- Senha mínima de 6 caracteres
- Apenas administradores podem executar

### Log

```
[SENHA RESETADA] Cliente: Empresa XYZ Ltda | Username: 12345678900 | Admin: admin
```

---

## Permissões

| Operação | ADMIN | SUPERVISOR | CLIENTE |
|----------|-------|------------|---------|
| Cadastrar cliente (cria usuário) | ✅ | ❌ | ❌ |
| Editar cliente com nova_senha | ✅ | ❌ | ❌ |
| Resetar senha (action) | ✅ | ❌ | ❌ |
| Ver username do cliente | ✅ | ✅ | ✅ (próprio) |

---

## Exemplos de Uso

### 1. Cadastro de novo cliente

```python
import requests

response = requests.post(
    'http://localhost:8000/api/v1/cadastro/clientes/',
    json={
        "nome_razao": "Nova Empresa Ltda",
        "tipo_pessoa": "J",
        "documento": "12345678000190",
        "email_financeiro": "financeiro@novaempresa.com",
        "telefone": "(11) 98765-4321",
        "cidade": "São Paulo",
        "estado": "SP"
    },
    cookies={'access': 'token_admin'}
)

# ⚠️ Verificar console do backend para senha gerada:
# [CLIENTE CRIADO] Username: 12345678000190 | Senha: aB3dE9fG | Email: financeiro@novaempresa.com
```

### 2. Alterar senha ao editar cliente

```python
response = requests.patch(
    'http://localhost:8000/api/v1/cadastro/clientes/5/',
    json={
        "telefone": "(11) 99999-8888",
        "nova_senha": "Senh@NovaForte2024"
    },
    cookies={'access': 'token_admin'}
)

print(response.json())
# {
#   "id": 5,
#   "nome_razao": "Nova Empresa Ltda",
#   "username": "12345678000190",
#   "telefone": "(11) 99999-8888",
#   ...
# }
```

### 3. Resetar senha com senha aleatória

```python
response = requests.post(
    'http://localhost:8000/api/v1/cadastro/clientes/5/resetar_senha/',
    json={},  # Vazio = gera senha aleatória
    cookies={'access': 'token_admin'}
)

result = response.json()
print(f"Nova senha: {result['senha']}")
# Nova senha: xY9pQr2m

# ⚠️ Anotar esta senha e enviar ao cliente!
```

### 4. Resetar senha com senha específica

```python
response = requests.post(
    'http://localhost:8000/api/v1/cadastro/clientes/5/resetar_senha/',
    json={
        "senha": "ClienteSenh@2024"
    },
    cookies={'access': 'token_admin'}
)

print(response.json())
# {
#   "detail": "Senha resetada com sucesso.",
#   "username": "12345678000190",
#   "senha": "***",
#   "senha_gerada_automaticamente": false
# }
```

---

## Frontend - Formulário de Edição

### Campo de Senha no Formulário

```tsx
// Exemplo para o formulário de edição de cliente
interface ClienteForm {
  nome_razao: string;
  documento: string;
  telefone: string;
  nova_senha?: string;  // ⚠️ Opcional
}

function EditarClienteForm({ clienteId }: { clienteId: number }) {
  const [formData, setFormData] = useState<ClienteForm>({
    nome_razao: '',
    documento: '',
    telefone: '',
  });

  const [mostrarCampoSenha, setMostrarCampoSenha] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = { ...formData };

    // Remove nova_senha se estiver vazia
    if (!payload.nova_senha || payload.nova_senha.trim() === '') {
      delete payload.nova_senha;
    }

    const response = await fetch(
      `${API_URL}/cadastro/clientes/${clienteId}/`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      }
    );

    if (response.ok) {
      alert('Cliente atualizado com sucesso!');
      if (formData.nova_senha) {
        alert('⚠️ Senha alterada! Comunique o cliente.');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={formData.nome_razao}
        onChange={(e) => setFormData({ ...formData, nome_razao: e.target.value })}
        placeholder="Nome/Razão Social"
      />

      <input
        type="text"
        value={formData.telefone}
        onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
        placeholder="Telefone"
      />

      {/* Toggle para mostrar campo de senha */}
      <div>
        <label>
          <input
            type="checkbox"
            checked={mostrarCampoSenha}
            onChange={(e) => setMostrarCampoSenha(e.target.checked)}
          />
          Alterar senha de acesso
        </label>
      </div>

      {mostrarCampoSenha && (
        <div>
          <input
            type="password"
            value={formData.nova_senha || ''}
            onChange={(e) => setFormData({ ...formData, nova_senha: e.target.value })}
            placeholder="Nova senha (mínimo 6 caracteres)"
            minLength={6}
          />
          <small>⚠️ A nova senha será aplicada imediatamente.</small>
        </div>
      )}

      <button type="submit">Salvar Alterações</button>
    </form>
  );
}
```

### Botão de Resetar Senha

```tsx
function ResetarSenhaButton({ clienteId }: { clienteId: number }) {
  const [loading, setLoading] = useState(false);

  const handleResetarSenha = async () => {
    if (!confirm('Deseja resetar a senha deste cliente? Uma nova senha será gerada.')) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/cadastro/clientes/${clienteId}/resetar_senha/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({})  // Vazio = gera senha aleatória
        }
      );

      const result = await response.json();

      if (response.ok) {
        alert(
          `Senha resetada com sucesso!\n\n` +
          `Username: ${result.username}\n` +
          `Nova senha: ${result.senha}\n\n` +
          `⚠️ IMPORTANTE: Anote esta senha e envie ao cliente!`
        );
      } else {
        alert(`Erro: ${result.detail}`);
      }
    } catch (error) {
      alert('Erro ao resetar senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleResetarSenha}
      disabled={loading}
      className="btn-danger"
    >
      {loading ? 'Resetando...' : '🔑 Resetar Senha'}
    </button>
  );
}
```

---

## Segurança

✅ **Boas Práticas Implementadas**

1. ✅ Senhas sempre hasheadas com `set_password()` (bcrypt via Django)
2. ✅ Campo `nova_senha` é write-only (nunca retornado na API)
3. ✅ Apenas administradores podem alterar senhas
4. ✅ Validação de tamanho mínimo (6 caracteres)
5. ✅ Logs de todas as alterações de senha
6. ✅ Username baseado em documento (não pode ser alterado)

⚠️ **Atenção**

- Senhas geradas automaticamente são mostradas **UMA ÚNICA VEZ**
- Certifique-se de anotar/enviar ao cliente imediatamente
- Considere implementar envio automático por email (TODO)

---

## Próximos Passos (TODO)

- [ ] Implementar envio automático de credenciais por email
- [ ] Criar página frontend para gerenciar senhas
- [ ] Adicionar histórico de alterações de senha
- [ ] Implementar política de senha forte (opcional)
- [ ] Permitir que cliente altere própria senha após primeiro login

---

## Troubleshooting

### Cliente não possui usuário vinculado

```json
{
  "detail": "Este cliente não possui usuário vinculado no sistema."
}
```

**Solução**: O signal não criou o usuário. Verifique:
1. Se o cliente foi criado antes da implementação do signal
2. Se há erros no console do backend
3. Considere deletar e recriar o cliente

### Senha não está sendo aceita no login

**Possíveis causas**:
1. Username errado (deve ser apenas números do CNPJ/CPF)
2. Senha copiada incorretamente
3. Caracteres especiais problemáticos

**Solução**: Use a action `resetar_senha` para gerar uma nova senha aleatória.

### Permissão negada ao resetar senha

```json
{
  "detail": "Apenas administradores têm acesso a este recurso."
}
```

**Solução**: Certifique-se de estar autenticado como ADMIN.
