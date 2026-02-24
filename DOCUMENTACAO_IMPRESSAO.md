# Documentação - Sistema de Impressão Profissional

## Visão Geral

O sistema possui impressão profissional para três tipos de documentos:
- **Orçamentos**
- **Ordens de Serviço**
- **Faturas (Contas a Receber)**

Todos usam o mesmo padrão visual moderno e profissional, otimizado para impressão em papel A4.

---

## Componente: ImpressaoProfissional.tsx

Localização: `frontend/src/components/ImpressaoProfissional.tsx`

### Função Principal

```typescript
gerarImpressaoProfissional(
  tipo: 'orcamento' | 'ordem_servico' | 'fatura',
  dados: any
)
```

### Características do Layout

- ✅ **Design moderno** com gradientes e badges coloridos
- ✅ **Otimizado para A4** (margens 12mm, fontes reduzidas)
- ✅ **Logo da empresa** com suporte a fallback
- ✅ **Dados da empresa** configuráveis via `empresa.ts`
- ✅ **Seções organizadas** (cliente, documento, itens, valores)
- ✅ **Tabelas estilizadas** com zebra striping
- ✅ **Badges de status** coloridos por tipo
- ✅ **Assinatura do cliente** (para OS concluídas)

---

## Configuração de Dados da Empresa

Localização: `frontend/src/config/empresa.ts`

```typescript
export const DADOS_EMPRESA = {
  nome: 'MANDACARU S M',
  cnpj: '57.138.641/0001-24',
  endereco: 'Av. Desembargador antonio carlos souto,80',
  cidade: 'Livramento de Nossa Senhora - BA',
  cep: '46140-000',
  celular: '(33) 99927-3648',
  email: 'wgm.mandacaru@gamil.com',
  site: 'www.mandacaru.com',

  // Informações bancárias (para faturas)
  banco: 'Scoob',
  agencia: '',
  conta: '',
  pix: '57.138.641/0001-24',
};

export const LOGO_PATH = '/logo.png';
```

**Como editar:** Basta alterar os valores neste arquivo e as mudanças aparecerão em todos os documentos impressos.

---

## Uso em Orçamentos

Página: `frontend/src/app/dashboard/orcamentos/[id]/page.tsx`

```typescript
import { gerarImpressaoProfissional } from '@/components/ImpressaoProfissional';

// No botão de impressão
function handleImprimir() {
  gerarImpressaoProfissional('orcamento', orcamento);
}
```

### Dados necessários:
- `numero`, `tipo_display`, `status`, `status_display`
- `cliente_nome`, `empreendimento_nome`, `equipamento_codigo`
- `data_emissao`, `data_validade`, `prazo_execucao_dias`
- `itens[]` (array de itens com tipo, descricao, quantidade, valor)
- `valor_servicos`, `valor_produtos`, `valor_deslocamento`, `valor_desconto`, `valor_total`
- `descricao`, `observacoes`

---

## Uso em Ordens de Serviço

Página: `frontend/src/app/dashboard/ordens-servico/[id]/page.tsx`

```typescript
import { gerarImpressaoProfissional } from '@/components/ImpressaoProfissional';

// No botão de impressão
function handleImprimir() {
  gerarImpressaoProfissional('ordem_servico', ordemServico);
}
```

### Dados necessários:
- Mesmos campos do orçamento
- `data_abertura`, `data_inicio`, `data_conclusao`, `data_prevista`
- `horimetro_inicial`, `horimetro_final`
- `tecnico_responsavel_nome`
- `valor_adicional`, `valor_final`

### Recurso especial:
- Se `status === 'CONCLUIDA'`, exibe área para assinatura do cliente

---

## Uso em Faturas (Contas a Receber)

### Emissão de Fatura Consolidada

Página principal: `frontend/src/app/dashboard/financeiro/contas-receber/emitir-fatura/page.tsx`

Este é o fluxo principal de emissão de faturas:

1. **Selecionar Cliente** - Busca e escolha do cliente
2. **Selecionar Contas** - Marca as contas abertas/vencidas
3. **Gerar Fatura** - Cria fatura consolidada com todas as contas

```typescript
import { gerarImpressaoProfissional } from '@/components/ImpressaoProfissional';

function handleGerarPDF() {
  // Gera número único da fatura
  const numeroFatura = `FAT-${ano}${mes}${dia}-${random}`;

  // Prepara dados da fatura consolidada
  const dadosFatura = {
    numero: numeroFatura,
    tipo_display: 'Fatura Consolidada',
    status: 'ABERTA',

    cliente_nome: clienteInfo.nome_razao,
    cliente_cpf_cnpj: clienteInfo.cnpj_cpf,

    data_emissao: new Date(),
    data_vencimento: vencimentoMaisProximo,

    valor_final: totalFatura,

    // Lista de contas incluídas
    contas_incluidas: contasFatura.map(conta => ({
      numero: conta.numero,
      tipo: getOrigemDisplay(conta),
      descricao: conta.descricao,
      data_vencimento: conta.data_vencimento,
      valor: conta.valor_final,
      status: conta.status,
    })),
  };

  gerarImpressaoProfissional('fatura', dadosFatura);
}
```

### Impressão de Conta Individual

Página de detalhes: `frontend/src/app/dashboard/financeiro/contas-receber/[id]/page.tsx`

Para imprimir uma única conta a receber:

```typescript
import { gerarImpressaoProfissional } from '@/components/ImpressaoProfissional';

function handleImprimirFatura() {
  const dadosFatura = {
    numero: conta.numero,
    tipo_display: conta.tipo_display,
    status: conta.status,
    status_display: conta.status_display,

    // Cliente
    cliente_nome: conta.cliente_nome,
    cliente_cpf_cnpj: conta.cliente_cpf_cnpj,

    // Datas
    data_emissao: conta.data_emissao,
    data_vencimento: conta.data_vencimento,
    data_pagamento: conta.data_pagamento,

    // Valores
    valor_original: conta.valor_original,
    valor_juros: conta.valor_juros,
    valor_desconto: conta.valor_desconto,
    valor_final: conta.valor_final,
    valor_pago: conta.valor_pago,

    // Documentos vinculados
    orcamento_numero: conta.orcamento_numero,
    orcamento_data: conta.orcamento_data,
    orcamento_valor: conta.valor_original,
    ordem_servico_numero: conta.ordem_servico_numero,
    ordem_servico_data: conta.ordem_servico_data,
    ordem_servico_valor: conta.valor_original,

    // Informações
    descricao: conta.descricao,
    observacoes: conta.observacoes,
    forma_pagamento: conta.forma_pagamento,
  };

  gerarImpressaoProfissional('fatura', dadosFatura);
}
```

### Recursos especiais da fatura:

1. **Fatura Consolidada** (múltiplas contas)
   - Tabela mostra todas as contas incluídas
   - Campos: Nº Conta, Origem, Descrição, Vencimento, Valor
   - Badges coloridos por status (vencida = vermelho, aberta = azul)
   - Total consolidado no resumo de valores

2. **Fatura Individual** (uma conta)
   - Tabela de Documentos Vinculados
   - Mostra orçamento (se houver)
   - Mostra ordem de serviço (se houver)
   - Destaca o número da conta a receber

3. **Informações de Pagamento**
   - Banco, agência, conta (do arquivo `empresa.ts`)
   - Chave PIX destacada em fonte monoespaçada
   - Facilita cópia do PIX pelo cliente

4. **Data de Vencimento Destacada**
   - Aparece em vermelho e negrito
   - Chama atenção para o prazo de pagamento

5. **Mensagem no rodapé**
   - "Pagamento até a data de vencimento. Após o vencimento, sujeito a multa e juros."

---

## Estrutura Visual

### Cabeçalho
```
┌─────────────────────────────────────────────┐
│ [LOGO]              MANDACARU S M           │
│                     CNPJ: XX.XXX.XXX/XX     │
│                     Endereço completo       │
├─────────────────────────────────────────────┤
│ [TIPO DOCUMENTO]            #NUMERO         │
└─────────────────────────────────────────────┘
```

### Seções
- 📋 **Informações do Cliente**
- 📅 **Informações do Documento** (ou 💳 Informações da Fatura)
- 📝 **Descrição** (se houver)
- 🛠️ **Itens do Serviço** (ou 📑 Documentos Vinculados para fatura)
- 💰 **Resumo de Valores**
- 💡 **Observações** (se houver)
- 💰 **Formas de Pagamento** (apenas fatura)

### Rodapé
- Data/hora de geração
- Mensagem específica do tipo de documento
- Área de assinatura (OS concluída)

---

## Cores e Badges

### Status
- **Aprovado / Pago / Concluída**: Verde (`#d1fae5` / `#065f46`)
- **Enviado / Aberta**: Azul (`#dbeafe` / `#1e40af`)
- **Pendente**: Amarelo (`#fef3c7` / `#92400e`)
- **Vencido / Atrasado**: Vermelho (`#fee2e2` / `#991b1b`)

### Tipos de Item
- **Serviço**: Azul claro
- **Produto**: Verde claro

---

## Fluxo de Impressão

### Fluxo Padrão (Orçamento/OS/Conta Individual)

1. Usuário clica no botão "Imprimir"
2. Função `gerarImpressaoProfissional()` é chamada
3. Nova janela é aberta com o documento formatado
4. Sistema aguarda carregamento das imagens (logo)
5. Janela de impressão do navegador é aberta automaticamente
6. Usuário pode escolher imprimir ou salvar como PDF

### Fluxo de Emissão de Fatura Consolidada

1. Acesse: `/dashboard/financeiro/contas-receber/emitir-fatura`
2. **Passo 1**: Selecione o cliente
   - Busca por nome ou CPF/CNPJ
   - Clique no cliente desejado
3. **Passo 2**: Selecione as contas
   - Sistema mostra contas abertas e vencidas do cliente
   - Marque as contas que deseja incluir na fatura
   - Ou use "Selecionar todas"
4. **Passo 3**: Gerar fatura
   - Revise o resumo (cliente, quantidade de contas, total)
   - Clique em "Gerar PDF da Fatura"
   - Impressão profissional abre automaticamente

---

## Compatibilidade

- ✅ Chrome/Edge (recomendado)
- ✅ Firefox
- ✅ Safari
- ⚠️ Requer pop-ups habilitados

---

## Personalização

### Alterar cores
Edite a função `getEstilosProfissionais()` em `ImpressaoProfissional.tsx`

### Alterar layout
Modifique as funções `gerarCabecalho()`, `gerarTabelaItens()`, etc.

### Adicionar novos tipos de documento
1. Adicione o tipo no union type da função principal
2. Crie funções específicas de formatação
3. Adicione lógica condicional em `gerarHTMLImpressao()`

---

## Exemplo Completo - Implementação em Nova Página

```typescript
'use client';

import { gerarImpressaoProfissional } from '@/components/ImpressaoProfissional';

export default function MinhaPagina() {
  const handleImprimir = () => {
    const dados = {
      numero: 'DOC-000123',
      tipo_display: 'Meu Documento',
      status: 'APROVADO',
      status_display: 'Aprovado',
      cliente_nome: 'João Silva',
      data_emissao: '2026-02-24',
      valor_total: 1500.00,
      // ... outros campos necessários
    };

    gerarImpressaoProfissional('orcamento', dados);
  };

  return (
    <button onClick={handleImprimir}>
      🖨️ Imprimir Documento
    </button>
  );
}
```

---

## Suporte

Para dúvidas ou problemas:
1. Verifique se `empresa.ts` está configurado corretamente
2. Verifique se o logo existe em `/public/logo.png`
3. Verifique se pop-ups estão habilitados no navegador
4. Verifique os dados sendo passados para a função

---

**Última atualização:** 24/02/2026
**Versão:** 1.0
