/**
 * Componente para impressão profissional de documentos (Orçamentos e OS)
 * Layout limpo, moderno e profissional para impressão em A4
 */

export function gerarImpressaoProfissional(
  tipo: 'orcamento' | 'ordem_servico',
  dados: any
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Bloqueador de pop-ups ativo. Permita pop-ups para imprimir.');
    return null;
  }

  const html = gerarHTMLImpressao(tipo, dados);
  printWindow.document.write(html);
  printWindow.document.close();

  // Aguardar imagens carregarem
  const images = printWindow.document.querySelectorAll('img');
  let loadedImages = 0;
  const totalImages = images.length;

  if (totalImages === 0) {
    setTimeout(() => printWindow.print(), 300);
  } else {
    images.forEach((img) => {
      const handleLoad = () => {
        loadedImages++;
        if (loadedImages === totalImages) {
          setTimeout(() => printWindow.print(), 300);
        }
      };

      if (img.complete) {
        handleLoad();
      } else {
        img.onload = handleLoad;
        img.onerror = handleLoad;
      }
    });
  }

  return printWindow;
}

function gerarHTMLImpressao(tipo: 'orcamento' | 'ordem_servico', dados: any) {
  const titulo = tipo === 'orcamento' ? 'ORÇAMENTO' : 'ORDEM DE SERVIÇO';
  const numero = dados.numero;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titulo} ${numero}</title>
  <style>${getEstilosProfissionais()}</style>
</head>
<body>
  ${gerarCabecalho(titulo, dados)}
  ${gerarInformacoesCliente(dados)}
  ${gerarInformacoesDocumento(tipo, dados)}
  ${dados.descricao ? gerarDescricao(dados.descricao) : ''}
  ${gerarTabelaItens(dados.itens || [])}
  ${gerarResumoValores(dados)}
  ${dados.observacoes ? gerarObservacoes(dados.observacoes) : ''}
  ${gerarRodape(tipo, dados)}
</body>
</html>
  `;
}

function getEstilosProfissionais() {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @page {
      size: A4;
      margin: 12mm;
    }

    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 9pt;
      line-height: 1.3;
      color: #1a1a1a;
      background: white;
    }

    /* Cabeçalho */
    .cabecalho {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 8px;
      border-bottom: 2px solid #2563eb;
      margin-bottom: 12px;
    }

    .logo-empresa {
      max-width: 140px;
      max-height: 45px;
      object-fit: contain;
    }

    .info-empresa {
      text-align: right;
      font-size: 7.5pt;
      line-height: 1.3;
      color: #4b5563;
    }

    .info-empresa strong {
      color: #1a1a1a;
      font-size: 10pt;
    }

    /* Título do documento */
    .titulo-documento {
      background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
      color: white;
      padding: 8px 15px;
      margin: 12px 0;
      border-radius: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .titulo-documento h1 {
      font-size: 13pt;
      font-weight: 600;
      letter-spacing: 0.3px;
    }

    .titulo-documento .numero {
      font-size: 12pt;
      font-weight: 700;
      background: rgba(255, 255, 255, 0.2);
      padding: 4px 12px;
      border-radius: 3px;
    }

    /* Seções */
    .secao {
      margin-bottom: 12px;
      page-break-inside: avoid;
    }

    .secao-titulo {
      font-size: 9pt;
      font-weight: 600;
      color: #2563eb;
      margin-bottom: 6px;
      padding-bottom: 3px;
      border-bottom: 1px solid #e5e7eb;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    /* Grid de informações */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-bottom: 8px;
    }

    .info-box {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      padding: 8px;
    }

    .info-item {
      margin-bottom: 5px;
    }

    .info-item:last-child {
      margin-bottom: 0;
    }

    .info-label {
      font-size: 7pt;
      color: #6b7280;
      margin-bottom: 1px;
      text-transform: uppercase;
      font-weight: 500;
      letter-spacing: 0.2px;
    }

    .info-value {
      font-size: 8.5pt;
      color: #1a1a1a;
      font-weight: 500;
    }

    /* Tabela */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0;
      font-size: 8pt;
    }

    thead {
      background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
      color: white;
    }

    th {
      padding: 6px 5px;
      text-align: left;
      font-weight: 600;
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    th.text-right {
      text-align: right;
    }

    tbody tr {
      border-bottom: 1px solid #e5e7eb;
    }

    tbody tr:nth-child(even) {
      background: #f9fafb;
    }

    tbody tr:hover {
      background: #f3f4f6;
    }

    td {
      padding: 6px 5px;
      color: #1a1a1a;
    }

    td.text-right {
      text-align: right;
    }

    td.text-center {
      text-align: center;
    }

    .item-tipo {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 2px;
      font-size: 6.5pt;
      font-weight: 600;
      text-transform: uppercase;
    }

    .item-tipo.servico {
      background: #dbeafe;
      color: #1e40af;
    }

    .item-tipo.produto {
      background: #d1fae5;
      color: #065f46;
    }

    /* Resumo de valores */
    .resumo-valores {
      margin-top: 12px;
      border-top: 1px solid #e5e7eb;
      padding-top: 8px;
    }

    .valor-linha {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 9pt;
    }

    .valor-linha.subtotal {
      color: #6b7280;
      border-bottom: 1px dashed #d1d5db;
    }

    .valor-linha.total {
      font-size: 11pt;
      font-weight: 700;
      color: #2563eb;
      background: #eff6ff;
      padding: 8px 12px;
      margin-top: 6px;
      border-radius: 4px;
      border: 2px solid #2563eb;
    }

    .valor-linha.desconto {
      color: #dc2626;
    }

    /* Descrição e Observações */
    .descricao, .observacoes {
      background: #fffbeb;
      border-left: 3px solid #f59e0b;
      padding: 8px 10px;
      margin: 10px 0;
      border-radius: 3px;
      font-size: 8pt;
      line-height: 1.4;
      color: #78350f;
    }

    /* Rodapé */
    .rodape {
      margin-top: 15px;
      padding-top: 8px;
      border-top: 1px solid #e5e7eb;
      font-size: 7pt;
      color: #6b7280;
      text-align: center;
    }

    .assinatura-box {
      margin-top: 25px;
      padding-top: 40px;
      text-align: center;
      border-top: 1px solid #1a1a1a;
      max-width: 350px;
      margin-left: auto;
      margin-right: auto;
    }

    /* Impressão */
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }

      .page-break {
        page-break-before: always;
      }

      .no-break {
        page-break-inside: avoid;
      }
    }

    /* Badge de status */
    .status-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 15px;
      font-size: 7.5pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .status-badge.aprovado {
      background: #d1fae5;
      color: #065f46;
    }

    .status-badge.enviado {
      background: #dbeafe;
      color: #1e40af;
    }

    .status-badge.aberta {
      background: #fef3c7;
      color: #92400e;
    }

    .status-badge.concluida {
      background: #d1fae5;
      color: #065f46;
    }
  `;
}

function gerarCabecalho(titulo: string, dados: any) {
  return `
    <div class="cabecalho">
      <div>
        <img src="/logo.png" alt="Logo" class="logo-empresa" onerror="this.style.display='none'" />
      </div>
      <div class="info-empresa">
        <strong>MANDACARU S M</strong><br>
        CNPJ: XX.XXX.XXX/XXXX-XX<br>
        Endereço: Sua Rua, 123<br>
        Telefone: (XX) XXXXX-XXXX<br>
        Email: contato@mandacaru.com
      </div>
    </div>

    <div class="titulo-documento">
      <h1>${titulo}</h1>
      <div class="numero">#${dados.numero}</div>
    </div>
  `;
}

function gerarInformacoesCliente(dados: any) {
  return `
    <div class="secao">
      <h2 class="secao-titulo">📋 Informações do Cliente</h2>
      <div class="info-grid">
        <div class="info-box">
          <div class="info-item">
            <div class="info-label">Cliente</div>
            <div class="info-value">${dados.cliente_nome || '-'}</div>
          </div>
          ${dados.empreendimento_nome ? `
          <div class="info-item">
            <div class="info-label">Empreendimento</div>
            <div class="info-value">${dados.empreendimento_nome}</div>
          </div>
          ` : ''}
        </div>
        ${dados.equipamento_codigo ? `
        <div class="info-box">
          <div class="info-item">
            <div class="info-label">Equipamento</div>
            <div class="info-value">${dados.equipamento_codigo} - ${dados.equipamento_descricao || ''}</div>
          </div>
        </div>
        ` : ''}
      </div>
    </div>
  `;
}

function gerarInformacoesDocumento(tipo: string, dados: any) {
  const dataEmissao = dados.data_emissao || dados.data_abertura;
  const dataValidade = dados.data_validade || dados.data_prevista;

  return `
    <div class="secao">
      <h2 class="secao-titulo">📅 Informações do Documento</h2>
      <div class="info-grid">
        <div class="info-box">
          <div class="info-item">
            <div class="info-label">Tipo</div>
            <div class="info-value">${dados.tipo_display || '-'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Status</div>
            <div class="info-value">
              <span class="status-badge ${dados.status.toLowerCase()}">${dados.status_display}</span>
            </div>
          </div>
        </div>
        <div class="info-box">
          <div class="info-item">
            <div class="info-label">Data de ${tipo === 'orcamento' ? 'Emissão' : 'Abertura'}</div>
            <div class="info-value">${new Date(dataEmissao).toLocaleDateString('pt-BR')}</div>
          </div>
          <div class="info-item">
            <div class="info-label">${tipo === 'orcamento' ? 'Validade' : 'Data Prevista'}</div>
            <div class="info-value">${new Date(dataValidade).toLocaleDateString('pt-BR')}</div>
          </div>
          ${dados.prazo_execucao_dias ? `
          <div class="info-item">
            <div class="info-label">Prazo de Execução</div>
            <div class="info-value">${dados.prazo_execucao_dias} dias</div>
          </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

function gerarDescricao(descricao: string) {
  return `
    <div class="secao">
      <h2 class="secao-titulo">📝 Descrição</h2>
      <div class="descricao">${descricao}</div>
    </div>
  `;
}

function gerarTabelaItens(itens: any[]) {
  if (!itens || itens.length === 0) {
    return `
      <div class="secao">
        <h2 class="secao-titulo">🛠️ Itens</h2>
        <p style="text-align: center; color: #6b7280; padding: 20px;">Nenhum item adicionado</p>
      </div>
    `;
  }

  const linhasItens = itens.map((item, index) => `
    <tr>
      <td class="text-center">${index + 1}</td>
      <td>
        <span class="item-tipo ${item.tipo?.toLowerCase() || 'servico'}">
          ${item.tipo_display || item.tipo}
        </span>
      </td>
      <td>
        ${item.descricao}
        ${item.produto_codigo ? `<br><small style="color: #6b7280;">(${item.produto_codigo})</small>` : ''}
      </td>
      <td class="text-center">${Number(item.quantidade || 0).toFixed(2)}</td>
      <td class="text-right">R$ ${Number(item.valor_unitario || 0).toFixed(2)}</td>
      <td class="text-right"><strong>R$ ${Number(item.valor_total || 0).toFixed(2)}</strong></td>
    </tr>
  `).join('');

  return `
    <div class="secao no-break">
      <h2 class="secao-titulo">🛠️ Itens do Serviço</h2>
      <table>
        <thead>
          <tr>
            <th style="width: 40px">#</th>
            <th style="width: 100px">Tipo</th>
            <th>Descrição</th>
            <th class="text-right" style="width: 80px">Qtd</th>
            <th class="text-right" style="width: 100px">Vlr Unit.</th>
            <th class="text-right" style="width: 120px">Total</th>
          </tr>
        </thead>
        <tbody>
          ${linhasItens}
        </tbody>
      </table>
    </div>
  `;
}

function gerarResumoValores(dados: any) {
  const valorServicos = Number(dados.valor_servicos || 0);
  const valorProdutos = Number(dados.valor_produtos || 0);
  const valorDeslocamento = Number(dados.valor_deslocamento || 0);
  const valorDesconto = Number(dados.valor_desconto || 0);
  const valorAdicional = Number(dados.valor_adicional || 0);
  const valorTotal = Number(dados.valor_total || dados.valor_final || 0);

  return `
    <div class="secao">
      <h2 class="secao-titulo">💰 Resumo de Valores</h2>
      <div class="resumo-valores">
        ${valorServicos > 0 ? `
        <div class="valor-linha subtotal">
          <span>Valor dos Serviços:</span>
          <span>R$ ${valorServicos.toFixed(2)}</span>
        </div>
        ` : ''}
        ${valorProdutos > 0 ? `
        <div class="valor-linha subtotal">
          <span>Valor dos Produtos:</span>
          <span>R$ ${valorProdutos.toFixed(2)}</span>
        </div>
        ` : ''}
        ${valorDeslocamento > 0 ? `
        <div class="valor-linha subtotal">
          <span>Valor do Deslocamento:</span>
          <span>R$ ${valorDeslocamento.toFixed(2)}</span>
        </div>
        ` : ''}
        ${valorAdicional > 0 ? `
        <div class="valor-linha subtotal">
          <span>Valor Adicional:</span>
          <span>R$ ${valorAdicional.toFixed(2)}</span>
        </div>
        ` : ''}
        ${valorDesconto > 0 ? `
        <div class="valor-linha desconto">
          <span>Desconto:</span>
          <span>- R$ ${valorDesconto.toFixed(2)}</span>
        </div>
        ` : ''}
        <div class="valor-linha total">
          <span>VALOR TOTAL:</span>
          <span>R$ ${valorTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  `;
}

function gerarObservacoes(observacoes: string) {
  return `
    <div class="secao">
      <h2 class="secao-titulo">💡 Observações</h2>
      <div class="observacoes">${observacoes}</div>
    </div>
  `;
}

function gerarRodape(tipo: string, dados: any) {
  return `
    <div class="rodape">
      <p>
        Este documento foi gerado eletronicamente em ${new Date().toLocaleString('pt-BR')}<br>
        ${tipo === 'orcamento' ? 'Proposta válida conforme prazo especificado acima' : 'Documento vinculado ao orçamento aprovado'}
      </p>

      ${tipo === 'ordem_servico' && dados.status === 'CONCLUIDA' ? `
      <div class="assinatura-box">
        <div class="info-label">Assinatura do Cliente</div>
        <div style="margin-top: 5px; color: #1a1a1a;">Nome: _________________________________</div>
        <div style="color: #1a1a1a;">CPF: _________________________________</div>
      </div>
      ` : ''}
    </div>
  `;
}
