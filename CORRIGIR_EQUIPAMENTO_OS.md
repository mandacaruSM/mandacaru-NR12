# Como Corrigir Equipamento Errado em Ordem de Serviço Concluída

## 📋 Situação

Você criou um orçamento, gerou uma ordem de serviço (OS) e finalizou, mas percebeu que selecionou o equipamento errado.

Quando uma OS é concluída, ela:
1. Cria automaticamente um registro de **Manutenção** vinculado
2. Atualiza o horímetro do equipamento
3. Não pode mais ser editada normalmente

## ✅ Solução Implementada

Foi criado um **endpoint especial de correção administrativa** que permite corrigir o equipamento mesmo após a OS estar concluída.

### O que é corrigido automaticamente:
- ✅ Equipamento na **Ordem de Serviço**
- ✅ Equipamento na **Manutenção** vinculada
- ✅ Validação: O equipamento deve pertencer ao empreendimento

---

## 🔧 Como Usar via API

### Passo 1: Identifique os IDs necessários

1. **ID da OS**: Encontre na lista de ordens de serviço ou no número da OS (ex: OS-000001)
2. **ID do Equipamento Correto**: Vá em Equipamentos e pegue o ID do equipamento que deveria estar na OS

### Passo 2: Faça a requisição API

**Endpoint**: `PATCH /api/v1/ordens-servico/{id}/corrigir_equipamento/`

**Exemplo usando curl**:
```bash
curl -X PATCH https://mandacaru-nr-12.vercel.app/api/v1/ordens-servico/123/corrigir_equipamento/ \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "equipamento": 456
  }'
```

**Exemplo usando JavaScript no console do navegador**:
```javascript
// 1. Abra o DevTools (F12) no site
// 2. Vá na aba Console
// 3. Execute este código (ajuste os IDs):

const osId = 123;  // ID da OS que quer corrigir
const novoEquipamentoId = 456;  // ID do equipamento correto

fetch(`/api/proxy/ordens-servico/${osId}/corrigir_equipamento/`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    equipamento: novoEquipamentoId
  })
})
.then(res => res.json())
.then(data => {
  console.log('✅ Sucesso:', data);
  alert('Equipamento corrigido com sucesso!');
  location.reload(); // Recarrega a página
})
.catch(err => {
  console.error('❌ Erro:', err);
  alert('Erro ao corrigir equipamento: ' + err.message);
});
```

---

## 🖥️ Interface Web (Próximos Passos)

Para facilitar o uso, pode-se adicionar um botão "Corrigir Equipamento" na página de detalhes da OS.

### Implementação Sugerida:

1. Adicionar um botão visível apenas para administradores
2. Abrir um modal com lista de equipamentos do mesmo empreendimento
3. Selecionar o equipamento correto
4. Confirmar a correção
5. Recarregar a página

---

## ⚠️ Avisos Importantes

1. **Use com cuidado**: Esta é uma correção administrativa que altera registros históricos
2. **Validação**: O sistema valida se o equipamento pertence ao empreendimento
3. **Auditoria**: A correção não cria log de auditoria (considere adicionar)
4. **Horímetro**: Se já atualizou o horímetro do equipamento errado, pode ser necessário corrigir manualmente

---

## 🔄 Alternativa: Reabrir e Refazer

Se preferir não usar a correção administrativa, pode:

1. Criar nova OS com equipamento correto
2. Marcar a OS errada como CANCELADA
3. Deletar a manutenção criada incorretamente (via Django Admin)

---

## 📝 Exemplo Completo Passo a Passo

### Cenário:
- OS #123 foi concluída com Equipamento #100 (ERRADO)
- O equipamento correto é #200
- A OS pertence ao Empreendimento #50

### Solução:

```javascript
// Console do navegador (F12)
fetch('/api/proxy/ordens-servico/123/corrigir_equipamento/', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ equipamento: 200 })
})
.then(res => res.json())
.then(data => {
  if (data.detail) {
    alert(data.detail); // "Equipamento corrigido com sucesso"
    location.reload();
  }
})
.catch(err => alert('Erro: ' + err));
```

---

## 🚀 Melhorias Futuras

- [ ] Adicionar botão na interface web
- [ ] Criar log de auditoria para correções
- [ ] Permitir corrigir também o orçamento vinculado
- [ ] Notificar usuários sobre a correção
- [ ] Adicionar permissão específica para correções administrativas
