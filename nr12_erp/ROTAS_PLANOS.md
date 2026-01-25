# 🗺️ GUIA DE ROTAS - Sistema de Planos e Assinaturas

## 📍 URLs de Acesso Direto

### 1. Gestão de Assinaturas (Admin)
- **URL:** `http://localhost:3000/assinaturas`
- **Arquivo:** `frontend/src/app/assinaturas/page.tsx`
- **Requer:** Login como ADMIN
- **Funcionalidades:**
  - ✅ Ver todas as assinaturas
  - ✅ Alterar plano de clientes
  - ✅ Suspender assinatura
  - ✅ Reativar assinatura
  - ✅ Cancelar assinatura

### 2. Alterar Senha (Todos)
- **URL:** `http://localhost:3000/alterar-senha`
- **Arquivo:** `frontend/src/app/alterar-senha/page.tsx`
- **Requer:** Login (qualquer usuário)
- **Funcionalidades:**
  - ✅ Alterar própria senha
  - ✅ Validações de segurança
  - ✅ Mensagem de sucesso

### 3. Novo Cliente com Seleção de Plano
- **URL:** `http://localhost:3000/dashboard/clientes/novo`
- **Arquivo:** `frontend/src/app/dashboard/clientes/novo/page.tsx`
- **Requer:** Login como ADMIN
- **NOVIDADE:**
  - ✅ Seção "Plano de Assinatura" no formulário
  - ✅ Cards visuais com todos os planos
  - ✅ Plano Essencial pré-selecionado
  - ✅ Trial de 30 dias automático

### 4. Editar Cliente com Alteração de Plano
- **URL:** `http://localhost:3000/dashboard/clientes/{id}`
- **Exemplo:** `http://localhost:3000/dashboard/clientes/1`
- **Arquivo:** `frontend/src/app/dashboard/clientes/[id]/page.tsx`
- **Requer:** Login como ADMIN
- **NOVIDADES:**
  - ✅ Seção "Gerenciar Acesso" com botão "Resetar Senha"
  - ✅ Seção "Plano de Assinatura" com botão "Alterar Plano"
  - ✅ Modal completo para alteração de plano

### 5. Dashboard do Cliente (Card de Plano)
- **URL:** `http://localhost:3000/dashboard`
- **Arquivo:** `frontend/src/app/dashboard/page.tsx`
- **Requer:** Login como CLIENTE
- **NOVIDADE:**
  - ✅ Card mostrando plano atual
  - ✅ Limites e uso de recursos
  - ✅ Barras de progresso
  - ✅ Módulos habilitados
  - ✅ Alerta de trial expirando

---

## 🧭 Como Navegar no Sistema

### Via Menu Dropdown (Canto Superior Direito)
```
[Avatar do Usuário] ▼
├── 🔑 Alterar Senha → /alterar-senha
├── 📋 Assinaturas (Admin) → /assinaturas
└── 🚪 Sair
```

### Via Menu Lateral
```
Dashboard
├── Clientes → /dashboard/clientes
│   ├── [Lista de Clientes]
│   ├── Botão "Novo Cliente" → /dashboard/clientes/novo
│   └── Clicar em Cliente → /dashboard/clientes/{id}
└── (Outros módulos...)
```

---

## 📂 Localização dos Arquivos

### Frontend - Páginas
```
frontend/src/app/
├── assinaturas/
│   └── page.tsx              ← Dashboard Admin de Assinaturas
├── alterar-senha/
│   └── page.tsx              ← Página de Alteração de Senha
└── dashboard/
    ├── page.tsx              ← Dashboard (Card de Plano para CLIENTE)
    ├── layout.tsx            ← Dropdown de usuário (Alterar Senha)
    └── clientes/
        ├── page.tsx          ← Lista de clientes
        ├── novo/
        │   └── page.tsx      ← NOVO: Seleção de plano
        └── [id]/
            └── page.tsx      ← NOVO: Alteração de plano + Reset senha
```

### Frontend - Componentes
```
frontend/src/components/
└── ClientPlanCard.tsx        ← Card de plano do cliente
```

### Backend - APIs
```
backend/cadastro/
├── planos.py                 ← Modelos: Plano, AssinaturaCliente
├── views.py                  ← ViewSets: PlanoViewSet, AssinaturaClienteViewSet
├── urls.py                   ← Rotas: /planos/, /assinaturas/
└── serializers.py            ← PlanoSerializer, AssinaturaClienteSerializer
```

---

## 🎯 Fluxo Completo: Criar Cliente com Plano

### 1. Acesse
```
http://localhost:3000/dashboard/clientes/novo
```

### 2. Preencha os dados do cliente
- Tipo Pessoa (PJ/PF)
- Nome/Razão Social
- Documento (CPF/CNPJ)
- Contato
- Endereço

### 3. Role até a seção "Plano de Assinatura"
```
┌─────────────────────────────────────────────┐
│ PLANO DE ASSINATURA                         │
├─────────────────────────────────────────────┤
│ ○ Plano Essencial         R$ 297,00/mês    │
│   Para pequenas operações...               │
│                                             │
│ ○ Plano Profissional      R$ 597,00/mês    │
│   Para operações completas...              │
│                                             │
│ ○ Plano Avançado          R$ 997,00/mês    │
│   Para grandes operações...                │
│                                             │
│ ○ Plano Enterprise        R$ 1500,00/mês   │
│   Plano customizado...                     │
└─────────────────────────────────────────────┘
ℹ️ O cliente receberá 30 dias de trial gratuito
```

### 4. Selecione o plano desejado (clique no card)

### 5. Marque "Cliente ativo" (se necessário)

### 6. Clique em "Salvar Cliente"

✅ **Resultado:**
- Cliente criado
- Usuário criado (username = documento)
- Assinatura criada com plano selecionado
- Status: TRIAL (30 dias)
- Módulos do plano aplicados automaticamente

---

## 🔧 Fluxo Completo: Alterar Plano de Cliente Existente

### 1. Acesse a lista de clientes
```
http://localhost:3000/dashboard/clientes
```

### 2. Clique em qualquer cliente

### 3. Scroll até a seção "Plano de Assinatura"
```
┌─────────────────────────────────────────────┐
│ PLANO DE ASSINATURA                         │
├─────────────────────────────────────────────┤
│ Plano Atual                                 │
│ Plano Essencial                             │
│ Status: TRIAL                               │
│                      [Alterar Plano] ←━━━━━━┤
└─────────────────────────────────────────────┘
```

### 4. Clique em "Alterar Plano"

### 5. Modal abre com todos os planos
```
┌─────────────────────────────────────────────┐
│ ALTERAR PLANO DE ASSINATURA                 │
├─────────────────────────────────────────────┤
│ Cliente: Nome do Cliente                    │
│ Plano atual: Plano Essencial                │
│                                             │
│ ○ Plano Essencial [Plano Atual]            │
│ ○ Plano Profissional                        │
│ ○ Plano Avançado                            │
│ ○ Plano Enterprise                          │
│                                             │
│ ℹ️ Módulos e limites serão atualizados     │
│                                             │
│              [Cancelar] [Alterar Plano]     │
└─────────────────────────────────────────────┘
```

### 6. Selecione o novo plano

### 7. Clique em "Alterar Plano"

✅ **Resultado:**
- Plano atualizado
- Módulos atualizados automaticamente
- Limites ajustados
- Notificação de sucesso

---

## 🔐 Fluxo: Resetar Senha do Cliente

### 1. Acesse o cliente (edição)
```
http://localhost:3000/dashboard/clientes/{id}
```

### 2. Scroll até "Gerenciar Acesso"
```
┌─────────────────────────────────────────────┐
│ GERENCIAR ACESSO                            │
├─────────────────────────────────────────────┤
│ Credenciais de Acesso                       │
│ Username: 12345678901234                    │
│                      [Resetar Senha] ←━━━━━━┤
└─────────────────────────────────────────────┘
```

### 3. Clique em "Resetar Senha"

### 4. Modal abre com opções
```
┌─────────────────────────────────────────────┐
│ RESETAR SENHA DO CLIENTE                    │
├─────────────────────────────────────────────┤
│ Cliente: Nome do Cliente                    │
│ Username: 12345678901234                    │
│                                             │
│ Nova Senha (opcional)                       │
│ [___________________________]               │
│ Deixe vazio para gerar aleatória           │
│                                             │
│ ⚠️ Esta ação irá alterar a senha           │
│                                             │
│              [Cancelar] [Resetar Senha]     │
└─────────────────────────────────────────────┘
```

### 5. Opções:
- **Deixar em branco:** Gera senha aleatória de 8 caracteres
- **Digitar senha:** Define senha customizada (mínimo 6 caracteres)

### 6. Clique em "Resetar Senha"

✅ **Resultado:**
- Senha alterada
- Se gerada automaticamente, exibe a senha na tela
- Copie e envie para o cliente

---

## 🎨 Componente: Card de Plano (Cliente)

**Visível apenas quando logado como CLIENTE**

### Onde aparece:
```
http://localhost:3000/dashboard
```

### O que mostra:
```
┌──────────────────────────────────────────────┐
│ SEU PLANO                         [ATIVA]    │
├──────────────────────────────────────────────┤
│ Plano Essencial                              │
│ R$ 297,00/mês                                │
├──────────────────────────────────────────────┤
│ Trial válido até: 20/02/2026                 │
├──────────────────────────────────────────────┤
│ USO DE RECURSOS                              │
│                                              │
│ Usuários              1 / 5                  │
│ [▓▓░░░░░░░░] 20%                            │
│                                              │
│ Equipamentos          15 / 50                │
│ [▓▓▓▓▓▓░░░░] 30%                            │
│                                              │
│ Empreendimentos       Ilimitado ✓            │
├──────────────────────────────────────────────┤
│ MÓDULOS DISPONÍVEIS                          │
│ [clientes] [empreendimentos] [equipamentos]  │
│ [manutencoes] [abastecimentos] [nr12]        │
│ [almoxarifado]                               │
├──────────────────────────────────────────────┤
│ RECURSOS ESPECIAIS                           │
│ ✓ Backups Automáticos                        │
│ ✓ Suporte Prioritário                        │
└──────────────────────────────────────────────┘
```

---

## 🔗 Endpoints da API (Backend)

### Planos
- **GET** `/api/v1/cadastro/planos/` - Lista todos os planos
- **GET** `/api/v1/cadastro/planos/{id}/` - Detalhes de um plano

### Assinaturas
- **GET** `/api/v1/cadastro/assinaturas/` - Lista assinaturas
- **GET** `/api/v1/cadastro/assinaturas/?cliente={id}` - Assinatura de um cliente
- **POST** `/api/v1/cadastro/assinaturas/{id}/alterar_plano/` - Alterar plano
- **POST** `/api/v1/cadastro/assinaturas/{id}/suspender/` - Suspender
- **POST** `/api/v1/cadastro/assinaturas/{id}/reativar/` - Reativar
- **POST** `/api/v1/cadastro/assinaturas/{id}/cancelar/` - Cancelar

### Clientes
- **POST** `/api/v1/cadastro/clientes/{id}/resetar_senha/` - Resetar senha

### Autenticação
- **POST** `/api/v1/auth/change-password/` - Alterar própria senha

---

## 📊 Resumo Visual da Implementação

```
┌─────────────────────────────────────────────────────────────┐
│                    SISTEMA DE PLANOS                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  👑 ADMIN                    👤 CLIENTE                     │
│  ├─ /assinaturas            ├─ /dashboard (Card Plano)     │
│  │  └─ Gerenciar tudo       └─ /alterar-senha              │
│  ├─ /dashboard/clientes                                    │
│  │  ├─ /novo (Selecionar)                                  │
│  │  └─ /{id} (Alterar)                                     │
│  └─ /alterar-senha                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Checklist de Funcionalidades

### Cadastro e Edição
- [x] Selecionar plano ao criar cliente
- [x] Alterar plano de cliente existente
- [x] Resetar senha de cliente (Admin)
- [x] Alterar própria senha (Usuário)

### Visualização
- [x] Dashboard de assinaturas (Admin)
- [x] Card de plano no dashboard (Cliente)
- [x] Status visual (badges coloridos)
- [x] Barras de progresso de uso

### Gestão
- [x] Suspender assinatura
- [x] Reativar assinatura
- [x] Cancelar assinatura
- [x] Trial de 30 dias automático

### Validações
- [x] Limites de equipamentos
- [x] Limites de empreendimentos
- [x] Controle de módulos por plano
- [x] Verificação de assinatura ativa

---

## 🚀 Teste Rápido

1. Faça login como ADMIN
2. Acesse: `http://localhost:3000/dashboard/clientes/novo`
3. Preencha um cliente teste
4. **Selecione um plano** (role até encontrar a seção)
5. Salve
6. Vá para: `http://localhost:3000/assinaturas`
7. Veja a assinatura criada
8. Teste alterar o plano
9. Faça logout
10. Faça login com o cliente criado (username = documento)
11. Veja o card do plano no dashboard

---

**Dúvidas? Problemas?**
- Verifique se o frontend está rodando: `npm run dev`
- Verifique se o backend está rodando
- Limpe o cache do navegador (Ctrl+Shift+R)
- Verifique o console do navegador (F12)
