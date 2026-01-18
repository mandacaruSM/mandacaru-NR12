# Sistema de Filtro Automático por Cliente

## Visão Geral

Sistema que garante isolamento total de dados entre clientes. Cada cliente vê apenas seus próprios dados, enquanto supervisores veem dados dos empreendimentos que supervisionam e admins veem tudo.

---

## 1. Como Funciona

### 1.1 Arquitetura

O sistema usa um **mixin** (`ClienteFilterMixin`) que intercepta todas as queries no Django REST Framework e aplica filtros automáticos baseados no **role** do usuário autenticado.

```python
# core/permissions.py
class ClienteFilterMixin:
    def get_queryset(self):
        # Intercepta a query e filtra automaticamente
        # baseado no role e no cliente vinculado
```

### 1.2 Fluxo de Dados

```
┌────────────────────────────────────────────────────────┐
│  Cliente faz login                                      │
│  Username: 12345678000190 (CNPJ)                       │
└────────────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────────┐
│  Backend identifica:                                    │
│  - user.profile.role = "CLIENTE"                       │
│  - user.cliente_profile.id = 5                         │
└────────────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────────┐
│  Cliente faz requisição:                                │
│  GET /api/v1/cadastro/empreendimentos/                 │
└────────────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────────┐
│  ClienteFilterMixin intercepta:                         │
│  queryset = Empreendimento.objects.all()               │
│  ↓                                                      │
│  queryset = queryset.filter(cliente_id=5)              │
└────────────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────────┐
│  Cliente recebe apenas:                                 │
│  - Empreendimentos onde cliente_id = 5                 │
│  - Impossível ver dados de outros clientes             │
└────────────────────────────────────────────────────────┘
```

---

## 2. Filtros por Role

### 2.1 ADMIN
- **Acesso**: Total
- **Filtro**: Nenhum
- **Vê**: Todos os dados de todos os clientes

```python
if user.profile.role == 'ADMIN':
    return queryset  # Sem filtros
```

### 2.2 SUPERVISOR
- **Acesso**: Empreendimentos que supervisiona
- **Filtro**: Por supervisor vinculado
- **Vê**:
  - Empreendimentos onde `empreendimento.supervisor = supervisor`
  - Equipamentos desses empreendimentos
  - Clientes desses empreendimentos

```python
if user.profile.role == 'SUPERVISOR':
    supervisor = user.supervisor_profile

    # Se é Empreendimento
    return queryset.filter(supervisor=supervisor)

    # Se tem campo empreendimento (ex: Equipamento)
    return queryset.filter(empreendimento__supervisor=supervisor)

    # Se tem campo cliente (ex: Cliente)
    empreendimentos_ids = supervisor.empreendimentos.values_list('cliente_id', flat=True)
    return queryset.filter(cliente_id__in=empreendimentos_ids)
```

### 2.3 CLIENTE
- **Acesso**: Apenas seus próprios dados
- **Filtro**: Por cliente vinculado
- **Vê**:
  - Seu próprio cadastro
  - Seus empreendimentos
  - Seus equipamentos
  - Manutenções dos seus equipamentos
  - Relatórios dos seus dados

```python
if user.profile.role == 'CLIENTE':
    cliente = user.cliente_profile

    # Se é Cliente
    if queryset.model.__name__ == 'Cliente':
        return queryset.filter(id=cliente.id)

    # Se tem campo cliente (ex: Empreendimento, Equipamento)
    if hasattr(queryset.model, 'cliente'):
        return queryset.filter(cliente=cliente)

    # Se não tem relação, não vê nada
    return queryset.none()
```

---

## 3. ViewSets Protegidos

### 3.1 ViewSets com ClienteFilterMixin

**Cadastro:**
- `ClienteViewSet` - Cliente vê apenas seu cadastro
- `EmpreendimentoViewSet` - Cliente vê apenas seus empreendimentos

**Equipamentos:**
- `EquipamentoViewSet` - Cliente vê apenas seus equipamentos
- `PlanoManutencaoItemViewSet` - Cliente vê planos dos seus equipamentos
- `MedicaoEquipamentoViewSet` - Cliente vê medições dos seus equipamentos

**Outros módulos (a implementar):**
- Abastecimentos - Cliente vê apenas abastecimentos dos seus equipamentos
- Manutenções - Cliente vê apenas manutenções dos seus equipamentos
- NR12 Checklists - Cliente vê apenas checklists dos seus equipamentos
- Relatórios - Cliente vê apenas relatórios dos seus dados

### 3.2 Como Aplicar o Mixin

```python
# Antes (sem filtro)
class EmpreendimentoViewSet(viewsets.ModelViewSet):
    queryset = Empreendimento.objects.all()
    serializer_class = EmpreendimentoSerializer
    permission_classes = [IsAuthenticated]

# Depois (com filtro automático)
class EmpreendimentoViewSet(ClienteFilterMixin, viewsets.ModelViewSet):
    queryset = Empreendimento.objects.all()
    serializer_class = EmpreendimentoSerializer
    permission_classes = [IsAuthenticated, HasModuleAccess]
    required_module = 'empreendimentos'
```

**IMPORTANTE:** O `ClienteFilterMixin` deve vir **ANTES** de `viewsets.ModelViewSet` para que o método `get_queryset()` seja interceptado corretamente.

---

## 4. Endpoint /me Atualizado

### 4.1 Resposta para Cliente

```json
{
  "id": 10,
  "username": "12345678000190",
  "email": "financeiro@mineradora.com",
  "first_name": "Mineradora",
  "last_name": "ABC",
  "role": "CLIENTE",
  "modules_enabled": [
    "dashboard",
    "empreendimentos",
    "equipamentos",
    "relatorios"
  ],
  "supervisor": null,
  "cliente": {
    "id": 5,
    "nome_razao": "Mineradora ABC LTDA",
    "tipo_pessoa": "PJ",
    "documento": "12.345.678/0001-90",
    "email_financeiro": "financeiro@mineradora.com",
    "telefone": "(11) 1234-5678"
  }
}
```

### 4.2 Resposta para Supervisor

```json
{
  "id": 8,
  "username": "12345678900",
  "email": "supervisor@empresa.com",
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
    "id": 3,
    "nome_completo": "João Silva",
    "cpf": "123.456.789-00",
    "email": "supervisor@empresa.com",
    "telefone": "(11) 98765-4321"
  },
  "cliente": null
}
```

---

## 5. Segurança

### 5.1 Isolamento de Dados

✅ **Garantido em Nível de Banco**
- Filtros aplicados na query SQL
- Impossível bypassar via API
- Não depende de JavaScript no frontend

✅ **Object-Level Permissions**
- `CanViewOwnDataOnly` verifica permissões em objetos individuais
- Bloqueia acesso mesmo se URL direta for conhecida

### 5.2 Cenários de Teste

**Teste 1: Cliente tentando acessar dados de outro cliente**
```bash
# Cliente A (id=5) tenta acessar empreendimento do Cliente B (id=8)
GET /api/v1/cadastro/empreendimentos/42/

# Resposta: 404 Not Found
# O empreendimento existe, mas não pertence ao cliente logado
```

**Teste 2: Cliente listando empreendimentos**
```bash
# Cliente A (id=5) lista empreendimentos
GET /api/v1/cadastro/empreendimentos/

# Resposta: Apenas empreendimentos onde cliente_id = 5
{
  "count": 3,
  "results": [
    {"id": 10, "nome": "Mina A", "cliente": 5},
    {"id": 15, "nome": "Mina B", "cliente": 5},
    {"id": 20, "nome": "Planta C", "cliente": 5}
  ]
}
```

**Teste 3: Supervisor vendo empreendimentos**
```bash
# Supervisor (supervisiona empreendimentos 10, 15, 30)
GET /api/v1/cadastro/empreendimentos/

# Resposta: Apenas empreendimentos que supervisiona
{
  "count": 3,
  "results": [
    {"id": 10, "nome": "Mina A", "supervisor": 3},
    {"id": 15, "nome": "Mina B", "supervisor": 3},
    {"id": 30, "nome": "Obra D", "supervisor": 3}
  ]
}
```

---

## 6. Implementação Futura

### 6.1 Módulos Pendentes

Aplicar `ClienteFilterMixin` em:
- [ ] `AbastecimentoViewSet`
- [ ] `ManutencaoViewSet`
- [ ] `ChecklistRealizadoViewSet` (NR12)
- [ ] `ContaReceberViewSet` (Financeiro)
- [ ] `OrcamentoViewSet`
- [ ] `OrdemServicoViewSet`

### 6.2 Exemplo de Implementação

```python
# abastecimentos/views.py
from core.permissions import ClienteFilterMixin, HasModuleAccess

class AbastecimentoViewSet(ClienteFilterMixin, viewsets.ModelViewSet):
    queryset = Abastecimento.objects.select_related(
        'equipamento__cliente'
    ).all()
    serializer_class = AbastecimentoSerializer
    permission_classes = [IsAuthenticated, HasModuleAccess]
    required_module = 'abastecimentos'
```

**Resultado:**
- ADMIN: Vê todos os abastecimentos
- SUPERVISOR: Vê abastecimentos dos empreendimentos que supervisiona
- CLIENTE: Vê apenas abastecimentos dos seus equipamentos

### 6.3 Filtro para Equipamentos Relacionados

Para models que não têm campo `cliente` direto, mas se relacionam via `equipamento`:

```python
# core/permissions.py - ClienteFilterMixin
# Adicionar no método get_queryset():

# Se tem campo equipamento (ex: Abastecimento, Manutencao)
if hasattr(queryset.model, 'equipamento'):
    if user.profile.role == 'CLIENTE':
        return queryset.filter(equipamento__cliente=cliente)

    if user.profile.role == 'SUPERVISOR':
        return queryset.filter(
            equipamento__empreendimento__supervisor=supervisor
        )
```

---

## 7. Troubleshooting

### 7.1 Cliente não vê seus dados

**Problema:** Cliente faz login mas lista de empreendimentos vem vazia

**Diagnóstico:**
```python
# Django shell
from django.contrib.auth.models import User
user = User.objects.get(username='12345678000190')

# Verificar se tem cliente_profile
print(hasattr(user, 'cliente_profile'))  # Deve ser True
print(user.cliente_profile.id)  # Deve retornar o ID

# Verificar empreendimentos do cliente
from cadastro.models import Empreendimento
print(Empreendimento.objects.filter(cliente=user.cliente_profile))
```

**Soluções:**
1. Verificar se cliente tem `user` vinculado
2. Verificar se empreendimentos têm `cliente` correto
3. Verificar se ViewSet está usando `ClienteFilterMixin`

### 7.2 Filtro não está funcionando

**Problema:** Cliente vê dados de outros clientes

**Diagnóstico:**
```python
# Verificar se o mixin está na ordem correta
class EmpreendimentoViewSet(ClienteFilterMixin, viewsets.ModelViewSet):
    # ✅ Correto: ClienteFilterMixin ANTES de ModelViewSet
    pass

class EmpreendimentoViewSet(viewsets.ModelViewSet, ClienteFilterMixin):
    # ❌ Errado: ModelViewSet ANTES de ClienteFilterMixin
    pass
```

**Soluções:**
1. Reordenar herança: `ClienteFilterMixin` sempre primeiro
2. Verificar se `get_queryset()` do ViewSet chama `super().get_queryset()`
3. Verificar se `permission_classes` inclui `IsAuthenticated`

### 7.3 Permission Denied em objeto específico

**Problema:** Lista funciona, mas GET /empreendimentos/42/ retorna 403

**Causa:** `CanViewOwnDataOnly` bloqueia acesso a objetos individuais

**Solução:** Adicionar permission class no ViewSet:
```python
from core.permissions import ClienteFilterMixin, CanViewOwnDataOnly

class EmpreendimentoViewSet(ClienteFilterMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, CanViewOwnDataOnly]
```

---

## 8. Boas Práticas

### 8.1 Sempre usar ClienteFilterMixin

Em ViewSets que lidam com dados sensíveis, **sempre** incluir `ClienteFilterMixin`:

```python
# ✅ Bom
class EquipamentoViewSet(ClienteFilterMixin, viewsets.ModelViewSet):
    pass

# ❌ Ruim - Dados vazam entre clientes
class EquipamentoViewSet(viewsets.ModelViewSet):
    pass
```

### 8.2 Combinar com HasModuleAccess

```python
permission_classes = [IsAuthenticated, HasModuleAccess]
required_module = 'equipamentos'
```

Isso garante que:
1. Usuário está autenticado
2. Usuário tem o módulo habilitado
3. Dados são filtrados automaticamente

### 8.3 Testar com Múltiplos Roles

Sempre testar endpoints com:
- Admin (vê tudo)
- Supervisor (vê empreendimentos específicos)
- Cliente (vê apenas seus dados)
- Usuário sem permissão (403 Forbidden)

---

## 9. Documentação Relacionada

- [SISTEMA_PERMISSOES_LOGIN.md](SISTEMA_PERMISSOES_LOGIN.md) - Sistema de autenticação e roles
- [core/permissions.py](backend/core/permissions.py) - Implementação do ClienteFilterMixin
- [core/signals.py](backend/core/signals.py) - Criação automática de usuários

---

## 10. Migration

**Arquivo:** `cadastro/migrations/0008_add_cliente_user_field.py`

Adiciona campo `user` ao model `Cliente`:
```python
user = models.OneToOneField(
    User,
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name='cliente_profile'
)
```

**Aplicar:**
```bash
python manage.py migrate
```

**Criar clientes existentes:**
```python
# Para vincular clientes já existentes a usuários:
from cadastro.models import Cliente
from django.contrib.auth.models import User

for cliente in Cliente.objects.filter(user__isnull=True):
    # Trigger signal manualmente ou criar user via script
    pass
```
