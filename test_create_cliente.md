# 🧪 Guia de Debug - Cadastro de Clientes

## Como Testar

### 1. Verifique o Console do Navegador

Quando você clica em "Salvar Cliente", procure por estas mensagens no console (F12):

```
📝 Dados do formulário: { tipo_pessoa: "PJ", nome_razao: "...", ... }
🚀 Enviando requisição para criar cliente...
📤 API Request: POST /api/proxy/cadastro/clientes/
📥 API Response: 201 Created
✅ Cliente criado com sucesso: { id: 1, nome_razao: "...", ... }
```

### 2. Se Ver Erro 401

```
📥 API Response: 401 Unauthorized
❌ Erro ao criar cliente: Não autenticado
```

**Solução:**
- Faça logout e login novamente
- Verifique se os cookies `access` e `refresh` existem (DevTools → Application → Cookies)

### 3. Se Ver Erro 400

```
📥 API Response: 400 Bad Request
❌ API Error: { "nome_razao": ["Este campo é obrigatório"] }
```

**Solução:**
- Verifique se preencheu o campo "Razão Social" ou "Nome Completo"
- Esse é o único campo obrigatório

### 4. Se Ver Erro 500

```
📥 API Response: 500 Internal Server Error
```

**Causa Provável:**
- Erro no backend Django
- Problema com banco de dados
- Problema com geração de QR code

**Como Verificar:**
- Veja os logs do backend
- Se estiver rodando local: veja terminal do `python manage.py runserver`
- Se estiver no Render: veja logs em https://dashboard.render.com

### 5. Se Nada Acontecer

**Verifique:**
- O botão "Salvar Cliente" está desabilitado durante o envio?
- Há mensagem de erro vermelha no formulário?
- Console mostra alguma mensagem?

## Campos do Formulário

### Obrigatórios ✅
- **Razão Social / Nome Completo** - obrigatório

### Opcionais
- Tipo de Pessoa (PJ/PF) - tem valor padrão "PJ"
- CNPJ/CPF
- Inscrição Estadual
- Email Financeiro
- Telefone
- Endereço completo
- Cliente ativo (checkbox) - tem valor padrão `true`

## Como Forçar Valores de Teste

Se quiser testar rapidamente, use este payload mínimo:

```javascript
// No console do navegador, cole:
const formData = {
  tipo_pessoa: "PJ",
  nome_razao: "Empresa Teste LTDA",
  ativo: true
};

// Depois execute a criação:
fetch('/api/proxy/cadastro/clientes/', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(formData)
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

## Problemas Comuns

### "Erro ao cadastrar cliente" sem detalhes

**Debug:**
1. Abra DevTools (F12)
2. Vá em Network tab
3. Filtre por "Fetch/XHR"
4. Clique em "Salvar Cliente"
5. Encontre a requisição para `/api/proxy/cadastro/clientes/`
6. Veja:
   - Request Headers (tem Cookie?)
   - Request Payload (dados estão corretos?)
   - Response (qual o status code?)
   - Response body (qual a mensagem de erro?)

### Backend retorna HTML em vez de JSON

**Sintoma:**
```
📥 API Response: 200 OK
❌ API Error: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

**Causa:**
- URL incorreta (Django retorna página 404/500 em HTML)
- Proxy não está funcionando

**Solução:**
- Verifique que a URL é `/api/proxy/cadastro/clientes/` (com trailing slash)
- Verifique que o proxy está rodando (veja logs: `🔀 [Proxy] POST /cadastro/clientes/`)

## Me Envie Essas Informações

Se ainda não funcionar, me envie:

1. **Screenshot do erro** que aparece na tela
2. **Console logs** (copie e cole tudo)
3. **Network request details:**
   - URL da requisição
   - Status code
   - Request headers
   - Request payload
   - Response body
4. **Ambiente:**
   - Está rodando local ou no Render?
   - Qual navegador está usando?
