# Sistema de Planos e Assinaturas - Mandacaru ERP

Documentação completa do sistema de planos de assinatura com controle de recursos e módulos.

## Índice

1. [Visão Geral](#visão-geral)
2. [Planos Disponíveis](#planos-disponíveis)
3. [Estrutura de Dados](#estrutura-de-dados)
4. [Fluxo Automático](#fluxo-automático)
5. [API Reference](#api-reference)
6. [Gerenciamento via Admin](#gerenciamento-via-admin)
7. [Validações e Limites](#validações-e-limites)
8. [Exemplos de Uso](#exemplos-de-uso)

---

## Visão Geral

O sistema implementa um modelo de assinatura SaaS com 4 planos diferentes, cada um com:
- Limites de recursos (usuários, equipamentos, empreendimentos)
- Módulos habilitados específicos
- Features especiais
- Período trial de 30 dias

### Objetivos

- ✅ Controlar acesso aos módulos baseado no plano
- ✅ Limitar recursos por plano (usuários, equipamentos, etc)
- ✅ Facilitar upgrade/downgrade de planos
- ✅ Período trial automático para novos clientes
- ✅ Gestão centralizada de assinaturas

---

## Planos Disponíveis

### 🟢 Plano Essencial - R$ 297/mês

**Público-alvo:** Pequenas operações, oficinas, empresas com poucos ativos

**Recursos:**
- Até 5 usuários
- Equipamentos ilimitados
- Empreendimentos ilimitados

**Módulos incluídos:** (7 módulos)
- dashboard
- clientes
- empreendimentos
- equipamentos
- tipos_equipamento
- manutencoes
- relatorios

**Features:**
- ❌ Bot Telegram
- ❌ QR Code por equipamento
- ❌ Checklist mobile
- ❌ Backups automáticos
- ❌ Suporte prioritário
- ❌ Suporte WhatsApp
- ✅ Suporte por e-mail

---

### 🔵 Plano Profissional - R$ 597/mês

**Público-alvo:** Empresas médias, terceirizadas de manutenção, mineração regional
**👉 Este é o plano mais vendido (core)**

**Recursos:**
- Até 15 usuários
- Equipamentos ilimitados
- Empreendimentos ilimitados

**Módulos incluídos:** (16 módulos)
- dashboard
- clientes
- empreendimentos
- equipamentos
- tipos_equipamento
- operadores
- tecnicos
- supervisores
- manutencoes
- manutencao_preventiva
- **nr12** (completo)
- orcamentos
- ordens_servico
- almoxarifado
- financeiro
- relatorios

**Features:**
- ❌ Bot Telegram
- ✅ QR Code por equipamento
- ❌ Checklist mobile
- ❌ Backups automáticos
- ✅ Suporte prioritário
- ❌ Suporte WhatsApp

---

### 🟠 Plano Avançado - R$ 997/mês

**Público-alvo:** Operações intensivas, contratos de manutenção, grandes frotas
**👉 Diferencial Mandacaru - briga com Fracttal e SGMAN**

**Recursos:**
- **Usuários ilimitados**
- Equipamentos ilimitados
- Empreendimentos ilimitados

**Módulos incluídos:** (17 módulos - todos do Profissional +)
- **abastecimentos** (consumo de combustível)

**Features:**
- ✅ Bot Telegram integrado
- ✅ QR Code por equipamento
- ✅ Checklist mobile (NR-12 via celular)
- ✅ Backups automáticos
- ❌ Suporte prioritário
- ✅ Suporte WhatsApp
- ❌ Multi-empresa
- ❌ Customizações

**Indicadores incluídos:**
- MTBF (Mean Time Between Failures)
- MTTR (Mean Time To Repair)
- Custos operacionais

---

### 🔴 Plano Enterprise - A partir de R$ 1.500/mês

**Público-alvo:** Grandes mineradoras, indústrias, contratos de longo prazo
**👉 Sob contrato personalizado**

**Recursos:**
- **Usuários ilimitados**
- Equipamentos ilimitados
- Empreendimentos ilimitados

**Módulos incluídos:** (17 módulos - todos)

**Features:**
- ✅ Bot Telegram integrado
- ✅ QR Code por equipamento
- ✅ Checklist mobile
- ✅ Backups automáticos
- ✅ Suporte prioritário
- ✅ Suporte WhatsApp
- ✅ **Multi-empresa/Multi-lavras**
- ✅ **Customizações específicas**
- ✅ **Hospedagem dedicada**
- ✅ **SLA de suporte**
- ✅ **Onboarding assistido**
- ✅ **Integrações personalizadas**

---

## Estrutura de Dados

### Modelo: Plano

```python
class Plano(models.Model):
    nome = CharField(max_length=100)
    tipo = CharField(choices=TIPO_CHOICES, unique=True)
    descricao = TextField()
    valor_mensal = DecimalField(max_digits=10, decimal_places=2)

    # Limites (0 = ilimitado)
    limite_usuarios = IntegerField(default=5)
    limite_equipamentos = IntegerField(default=0)
    limite_empreendimentos = IntegerField(default=0)

    # Módulos disponíveis (JSON)
    modulos_habilitados = JSONField(default=list)

    # Features booleanas
    bot_telegram = BooleanField(default=False)
    qr_code_equipamento = BooleanField(default=False)
    checklist_mobile = BooleanField(default=False)
    backups_automaticos = BooleanField(default=False)
    suporte_prioritario = BooleanField(default=False)
    suporte_whatsapp = BooleanField(default=False)
    multiempresa = BooleanField(default=False)
    customizacoes = BooleanField(default=False)
    hospedagem_dedicada = BooleanField(default=False)

    ativo = BooleanField(default=True)
    ordem = IntegerField(default=0)
```

### Modelo: AssinaturaCliente

```python
class AssinaturaCliente(models.Model):
    cliente = OneToOneField(Cliente, related_name='assinatura')
    plano = ForeignKey(Plano, related_name='assinaturas')

    status = CharField(choices=['ATIVA', 'SUSPENSA', 'CANCELADA', 'TRIAL'])

    data_inicio = DateField(auto_now_add=True)
    data_fim_trial = DateField(null=True, blank=True)
    data_proximo_pagamento = DateField(null=True, blank=True)
    data_cancelamento = DateField(null=True, blank=True)

    observacoes = TextField(blank=True)

    @property
    def esta_ativa(self):
        return self.status in ['ATIVA', 'TRIAL']
```

---

## Fluxo Automático

### 1. Cadastro de Novo Cliente

Quando um administrador cadastra um novo cliente via POST `/api/v1/cadastro/clientes/`:

```
┌─────────────────────────────────────┐
│  POST /api/v1/cadastro/clientes/    │
│  {                                   │
│    "nome_razao": "Empresa XYZ",     │
│    "documento": "12345678000190",    │
│    "email_financeiro": "...",        │
│    ...                               │
│  }                                   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Signal: create_cliente_user         │
│  (core/signals.py)                   │
└──────────────┬──────────────────────┘
               │
               ├──► 1. Cria User
               │    - username = documento (números)
               │    - password = aleatória (8 chars)
               │    - email = email_financeiro
               │
               ├──► 2. Busca Plano Essencial
               │    - Plano.objects.filter(tipo='ESSENCIAL')
               │
               ├──► 3. Atualiza Profile
               │    - role = 'CLIENTE'
               │    - modules_enabled = plano.modulos_habilitados
               │
               ├──► 4. Vincula User ao Cliente
               │    - cliente.user = user
               │
               └──► 5. Cria AssinaturaCliente
                    - status = 'TRIAL'
                    - data_fim_trial = hoje + 30 dias
                    - plano = Plano Essencial

┌─────────────────────────────────────┐
│  Console Output:                     │
│  [CLIENTE CRIADO]                    │
│  Username: 12345678000190            │
│  Senha: aB3dE9fG                     │
│  Plano: Plano Essencial (Trial 30)   │
│  Email: financeiro@empresa.com       │
│  Módulos: 7                          │
└─────────────────────────────────────┘
```

### 2. Cliente faz Login

```
POST /api/v1/auth/login/
{
  "username": "12345678000190",
  "password": "aB3dE9fG"
}

Response:
- Cookie: access token (2h)
- Cookie: refresh token (7 dias)
- User data com módulos habilitados
```

### 3. Sistema verifica permissões

```
Middleware HasModuleAccess:
  1. Verifica user.profile.modules_enabled
  2. Checa se módulo está na lista
  3. Bloqueia acesso se não tiver permissão

Exemplo:
- Cliente Essencial tenta acessar /nr12/
- modules_enabled = ['dashboard', 'clientes', ...]
- 'nr12' not in modules_enabled
- ❌ Response 403 Forbidden
```

---

## API Reference

### Listar Planos

```bash
GET /api/v1/cadastro/planos/
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": 1,
    "nome": "Plano Essencial",
    "tipo": "ESSENCIAL",
    "descricao": "Plano ideal para pequenas operações...",
    "valor_mensal": "297.00",
    "limite_usuarios": 5,
    "limite_equipamentos": 0,
    "limite_empreendimentos": 0,
    "modulos_habilitados": ["dashboard", "clientes", ...],
    "features_resumo": [
      "Até 5 usuários",
      "Equipamentos ilimitados",
      "Suporte por e-mail"
    ],
    "bot_telegram": false,
    "qr_code_equipamento": false,
    ...
  }
]
```

### Ver Assinatura (Cliente)

```bash
GET /api/v1/cadastro/assinaturas/
Authorization: Bearer {token_cliente}
```

Cliente vê apenas sua própria assinatura.

**Response:**
```json
[
  {
    "id": 1,
    "cliente": 5,
    "cliente_nome": "Empresa XYZ Ltda",
    "plano": 1,
    "plano_nome": "Plano Essencial",
    "plano_valor": "297.00",
    "status": "TRIAL",
    "esta_ativa": true,
    "data_inicio": "2026-01-18",
    "data_fim_trial": "2026-02-17",
    "data_proximo_pagamento": "2026-02-17",
    "data_cancelamento": null,
    "observacoes": "",
    "criado_em": "2026-01-18T10:30:00Z",
    "atualizado_em": "2026-01-18T10:30:00Z"
  }
]
```

### Ver Dados do Cliente (com info de plano)

```bash
GET /api/v1/cadastro/clientes/5/
Authorization: Bearer {token_admin}
```

**Response:**
```json
{
  "id": 5,
  "nome_razao": "Empresa XYZ Ltda",
  "documento": "12345678000190",
  "username": "12345678000190",
  "plano_nome": "Plano Essencial",
  "plano_tipo": "ESSENCIAL",
  "assinatura_status": "TRIAL",
  ...
}
```

### Alterar Plano (Admin)

```bash
POST /api/v1/cadastro/assinaturas/1/alterar_plano/
Authorization: Bearer {token_admin}
Content-Type: application/json

{
  "plano_id": 2
}
```

**O que acontece:**
1. Atualiza assinatura.plano = novo_plano
2. Atualiza user.profile.modules_enabled = novo_plano.modulos_habilitados
3. Cliente passa a ter acesso aos novos módulos imediatamente

**Response:**
```json
{
  "detail": "Plano alterado com sucesso",
  "assinatura": { ... }
}
```

### Suspender Assinatura (Admin)

```bash
POST /api/v1/cadastro/assinaturas/1/suspender/
Authorization: Bearer {token_admin}
```

**Response:**
```json
{
  "detail": "Assinatura suspensa",
  "assinatura": {
    "status": "SUSPENSA",
    "esta_ativa": false,
    ...
  }
}
```

### Reativar Assinatura (Admin)

```bash
POST /api/v1/cadastro/assinaturas/1/reativar/
Authorization: Bearer {token_admin}
```

### Cancelar Assinatura (Admin)

```bash
POST /api/v1/cadastro/assinaturas/1/cancelar/
Authorization: Bearer {token_admin}
```

Define `data_cancelamento` e `status = 'CANCELADA'`.

---

## Gerenciamento via Admin

### Comandos Django

#### Popular planos no banco

```bash
python manage.py seed_planos
```

Cria os 4 planos com todas as configurações.

#### Resetar credenciais admin

```bash
python manage.py reset_admin
# OU
python manage.py reset_admin --username admin --password novasenha
```

### Django Admin

Acesse `/admin/` e gerencie:
- **Planos**: Criar/editar planos
- **Assinaturas**: Ver/modificar assinaturas de clientes
- **Clientes**: Ver plano atual de cada cliente

---

## Validações e Limites

### Limite de Usuários

⚠️ **Em implementação**

Quando limite_usuarios > 0, o sistema deve:
1. Contar usuários vinculados ao cliente
2. Bloquear criação se atingiu limite
3. Retornar erro 400 com mensagem

```python
# AssinaturaCliente.verificar_limite_usuarios()
if plano.limite_usuarios == 0:
    return True  # Ilimitado

usuarios_cliente = User.objects.filter(
    cliente_profile=self.cliente
).exclude(profile__role='ADMIN').count()

return usuarios_cliente < plano.limite_usuarios
```

### Limite de Equipamentos

⚠️ **Em implementação**

```python
# AssinaturaCliente.verificar_limite_equipamentos()
if plano.limite_equipamentos == 0:
    return True  # Ilimitado

total = self.cliente.equipamentos.count()
return total < plano.limite_equipamentos
```

### Limite de Empreendimentos

⚠️ **Em implementação**

```python
# AssinaturaCliente.verificar_limite_empreendimentos()
if plano.limite_empreendimentos == 0:
    return True  # Ilimitado

total = self.cliente.empreendimentos.count()
return total < plano.limite_empreendimentos
```

---

## Exemplos de Uso

### Cenário 1: Novo cliente com trial

```python
# 1. Admin cadastra cliente
POST /api/v1/cadastro/clientes/
{
  "nome_razao": "Mineradora ABC",
  "tipo_pessoa": "J",
  "documento": "11222333000100",
  "email_financeiro": "financeiro@mineradoraabc.com"
}

# Sistema automaticamente:
# - Cria user (username=11222333000100, senha aleatória)
# - Cria assinatura Trial 30 dias (Plano Essencial)
# - Aplica 7 módulos ao perfil
# - Loga credenciais no console

# 2. Cliente faz login
POST /api/v1/auth/login/
{
  "username": "11222333000100",
  "password": "xY9pQr2m"  # senha do console
}

# 3. Cliente acessa dashboard
GET /api/v1/dashboard/
# ✅ Permitido (módulo 'dashboard' habilitado)

# 4. Cliente tenta acessar NR-12
GET /api/v1/nr12/checklists/
# ❌ 403 Forbidden (módulo 'nr12' não habilitado no Essencial)
```

### Cenário 2: Upgrade de plano

```python
# Cliente gostou do trial e quer contratar Plano Profissional

# 1. Admin busca assinatura do cliente
GET /api/v1/cadastro/assinaturas/?cliente=5
{
  "id": 10,
  "cliente": 5,
  "plano": 1,  # Essencial
  "status": "TRIAL"
}

# 2. Admin altera para Plano Profissional
POST /api/v1/cadastro/assinaturas/10/alterar_plano/
{
  "plano_id": 2  # ID do Plano Profissional
}

# Sistema automaticamente:
# - Atualiza assinatura.plano = Profissional
# - Atualiza profile.modules_enabled = 16 módulos
# - Cliente agora tem acesso a NR-12, OS, Financeiro, etc

# 3. Cliente acessa NR-12
GET /api/v1/nr12/checklists/
# ✅ Permitido (agora tem módulo 'nr12')
```

### Cenário 3: Suspender por inadimplência

```python
# Cliente não pagou a fatura

# 1. Admin suspende assinatura
POST /api/v1/cadastro/assinaturas/10/suspender/

# Sistema define status = 'SUSPENSA'
# esta_ativa = false

# 2. Cliente tenta fazer login
POST /api/v1/auth/login/
# Login funciona normalmente

# 3. Cliente tenta acessar qualquer módulo
GET /api/v1/dashboard/
# ⚠️ Middleware verifica assinatura.esta_ativa
# ❌ 403 Forbidden: "Assinatura suspensa. Entre em contato com suporte."

# 4. Cliente regulariza pagamento
# Admin reativa assinatura
POST /api/v1/cadastro/assinaturas/10/reativar/

# Cliente volta a ter acesso normal
```

---

## Roadmap

### Implementado ✅
- [x] Modelos Plano e AssinaturaCliente
- [x] 4 planos configurados (seed)
- [x] Criação automática de assinatura trial
- [x] API completa de gerenciamento
- [x] Serializers com info de plano
- [x] Actions: alterar_plano, suspender, reativar, cancelar

### Em Desenvolvimento 🚧
- [ ] Validação de limites de recursos
- [ ] Middleware para bloquear acesso de assinaturas suspensas
- [ ] Notificações de fim de trial
- [ ] Dashboard admin de assinaturas

### Planejado 📋
- [ ] Página frontend de listagem de planos
- [ ] Página admin para gerenciar assinaturas
- [ ] Integração com gateway de pagamento
- [ ] Sistema de faturas
- [ ] Relatórios de MRR (Monthly Recurring Revenue)
- [ ] Métricas de churn

---

## Suporte

Para dúvidas ou problemas:
- Email: suporte@mandacaru.com
- WhatsApp: (11) 9xxxx-xxxx (apenas Planos Avançado e Enterprise)

---

**Versão:** 1.0
**Última atualização:** 2026-01-18
