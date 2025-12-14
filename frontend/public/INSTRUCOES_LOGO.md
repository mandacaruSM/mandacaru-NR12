# Logotipo da Empresa - Mandacaru ERP NR12

## Status Atual

✅ **Logotipo implementado e funcionando!**

O logotipo `logo.svg` foi criado e está sendo exibido em:
- ✓ Orçamentos (impressão e visualização)
- ✓ Ordens de Serviço (impressão e visualização)
- ✓ Relatórios (impressão):
  - Relatório por Empreendimento
  - Relatório de Estoque
  - Relatório de Faturamento
  - Relatório de Ordens de Serviço

## Como Personalizar o Logotipo

### Opção 1: Substituir o arquivo SVG atual

1. Substitua o arquivo `logo.svg` nesta pasta por seu próprio logotipo
2. Mantenha o nome do arquivo como `logo.svg`
3. Tamanho recomendado: 400x200 pixels (largura x altura)

### Opção 2: Usar PNG ou JPG

1. Salve seu logotipo como `logo.png` ou `logo.jpg` nesta pasta
2. Atualize as referências nos arquivos:
   - `frontend/src/app/dashboard/orcamentos/[id]/page.tsx` (linha ~321)
   - `frontend/src/app/dashboard/ordens-servico/[id]/page.tsx` (linha ~341)
   - `frontend/src/app/dashboard/relatorios/empreendimentos/page.tsx` (linha ~246)
   - `frontend/src/app/dashboard/relatorios/estoque/page.tsx` (linha ~88)
   - `frontend/src/app/dashboard/relatorios/faturamento/page.tsx` (linha ~109)
   - `frontend/src/app/dashboard/relatorios/ordens-servico/page.tsx` (linha ~68)

   Altere `src="/logo.svg"` para `src="/logo.png"` (ou `.jpg`)

## Formatos de Imagem Suportados

- **SVG** (vetorial) - ✅ Atualmente em uso - Melhor qualidade para impressão
- **PNG** (com fundo transparente) - Recomendado
- **JPG** - Aceito, mas menos recomendado

## Características do Logotipo Atual

O logotipo placeholder atual (logo.svg) contém:
- Ícone de máquina/equipamento estilizado
- Texto "MANDACARU"
- Subtítulo "ERP NR12"
- Tagline "Gestão de Equipamentos e Segurança"
- Cores: azul (#2563eb e #1e40af) com detalhes em cinza

## Comportamento na Impressão

- O logotipo aparece automaticamente no cabeçalho quando você imprime ou gera PDF
- Nas telas de relatórios, o logo só aparece na impressão (usa classe `print:block`)
- Nos orçamentos e OS, o logo aparece tanto na tela quanto na impressão

## Arquivos Modificados

Os seguintes arquivos foram atualizados para incluir o logotipo:

1. **Orçamentos:**
   - `frontend/src/app/dashboard/orcamentos/[id]/page.tsx`

2. **Ordens de Serviço:**
   - `frontend/src/app/dashboard/ordens-servico/[id]/page.tsx`

3. **Relatórios:**
   - `frontend/src/app/dashboard/relatorios/empreendimentos/page.tsx`
   - `frontend/src/app/dashboard/relatorios/estoque/page.tsx`
   - `frontend/src/app/dashboard/relatorios/faturamento/page.tsx`
   - `frontend/src/app/dashboard/relatorios/ordens-servico/page.tsx`
