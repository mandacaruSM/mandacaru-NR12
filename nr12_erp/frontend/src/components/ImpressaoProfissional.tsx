/**
 * Componente para impressão profissional de documentos (Orçamentos, OS e Faturas)
 * Layout limpo, moderno e profissional para impressão em A4
 */

import { DADOS_EMPRESA, LOGO_PATH } from '@/config/empresa';

export function gerarImpressaoChecklist(checklist: any) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Bloqueador de pop-ups ativo. Permita pop-ups para imprimir.');
    return null;
  }

  const html = gerarHTMLChecklist(checklist);
  printWindow.document.write(html);
  printWindow.document.close();

  const images = printWindow.document.querySelectorAll('img');
  let loadedImages = 0;
  const totalImages = images.length;

  if (totalImages === 0) {
    setTimeout(() => printWindow.print(), 300);
  } else {
    images.forEach((img) => {
      const handleLoad = () => {
        loadedImages++;
        if (loadedImages === totalImages) setTimeout(() => printWindow.print(), 300);
      };
      if (img.complete) handleLoad();
      else { img.onload = handleLoad; img.onerror = handleLoad; }
    });
  }

  return printWindow;
}

function gerarHTMLChecklist(cl: any) {
  const resultadoMap: Record<string, { label: string; cor: string; bg: string }> = {
    APROVADO:          { label: 'APROVADO',                cor: '#065f46', bg: '#d1fae5' },
    APROVADO_RESTRICAO:{ label: 'APROVADO C/ RESTRIÇÃO',   cor: '#92400e', bg: '#fef3c7' },
    REPROVADO:         { label: 'REPROVADO',               cor: '#991b1b', bg: '#fee2e2' },
  };
  const resultado = cl.resultado_geral ? resultadoMap[cl.resultado_geral] : null;

  const categoriaLabel: Record<string, string> = {
    SEGURANCA: 'Segurança', FUNCIONAL: 'Funcional', VISUAL: 'Visual',
    MEDICAO: 'Medição', LIMPEZA: 'Limpeza', LUBRIFICACAO: 'Lubrificação',
    DOCUMENTACAO: 'Documentação', OUTROS: 'Outros',
  };

  const respostaLabel: Record<string, string> = {
    CONFORME: 'CONFORME', NAO_CONFORME: 'NÃO CONFORME',
    SIM: 'SIM', NAO: 'NÃO', NA: 'N/A',
  };
  const respostaCor: Record<string, string> = {
    CONFORME: '#065f46', NAO_CONFORME: '#991b1b',
    SIM: '#065f46', NAO: '#991b1b', NA: '#6b7280',
  };
  const respostaBg: Record<string, string> = {
    CONFORME: '#d1fae5', NAO_CONFORME: '#fee2e2',
    SIM: '#d1fae5', NAO: '#fee2e2', NA: '#f3f4f6',
  };

  const respostas: any[] = cl.respostas || [];
  const totalConformes = respostas.filter(r => ['CONFORME', 'SIM'].includes(r.resposta)).length;
  const totalNaoConformes = respostas.filter(r => ['NAO_CONFORME', 'NAO'].includes(r.resposta)).length;

  const linhasRespostas = respostas.map((r: any, i: number) => {
    const resp = r.resposta || 'NA';
    const cor = respostaCor[resp] || '#6b7280';
    const bg = respostaBg[resp] || '#f3f4f6';
    return `
      <tr>
        <td class="text-center" style="color:#6b7280">${i + 1}</td>
        <td><span class="badge-cat">${categoriaLabel[r.item_categoria] || r.item_categoria}</span></td>
        <td>${r.item_pergunta || '-'}${r.observacao ? `<br><small style="color:#78350f"><em>Obs: ${r.observacao}</em></small>` : ''}</td>
        <td class="text-center">
          <span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:7pt;font-weight:700;background:${bg};color:${cor}">
            ${respostaLabel[resp] || resp}
          </span>
        </td>
        ${r.foto ? `<td class="text-center"><img src="${r.foto}" style="width:50px;height:50px;object-fit:cover;border-radius:4px;border:1px solid #e5e7eb" /></td>` : '<td class="text-center" style="color:#d1d5db">—</td>'}
      </tr>
    `;
  }).join('');

  const dataInicio = cl.data_hora_inicio ? new Date(cl.data_hora_inicio).toLocaleString('pt-BR') : '-';
  const dataFim = cl.data_hora_fim ? new Date(cl.data_hora_fim).toLocaleString('pt-BR') : '-';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Checklist NR12 #${cl.id}</title>
  <style>
    ${getEstilosProfissionais()}
    .badge-cat {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 10px;
      font-size: 6.5pt;
      font-weight: 600;
      background: #ede9fe;
      color: #5b21b6;
    }
    .resultado-box {
      padding: 10px 16px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12pt;
      font-weight: 700;
      margin-bottom: 12px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    .stat-box {
      text-align: center;
      padding: 10px;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
    }
    .stat-num { font-size: 20pt; font-weight: 700; }
    .stat-label { font-size: 7.5pt; color: #6b7280; margin-top: 2px; }
  </style>
</head>
<body>
  ${gerarCabecalho('CHECKLIST NR12', { numero: String(cl.id) })}

  <div class="secao">
    <h2 class="secao-titulo">Informações do Checklist</h2>
    <div class="info-grid">
      <div class="info-box">
        <div class="info-item">
          <div class="info-label">Modelo</div>
          <div class="info-value">${cl.modelo_nome || '-'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Equipamento</div>
          <div class="info-value">${cl.equipamento_codigo || '-'} — ${cl.equipamento_descricao || ''}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Operador</div>
          <div class="info-value">${cl.operador_nome_display || cl.operador_nome || 'Não informado'}</div>
        </div>
      </div>
      <div class="info-box">
        <div class="info-item">
          <div class="info-label">Início</div>
          <div class="info-value">${dataInicio}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Fim</div>
          <div class="info-value">${dataFim}</div>
        </div>
        ${cl.leitura_equipamento ? `
        <div class="info-item">
          <div class="info-label">Leitura do Equipamento</div>
          <div class="info-value">${cl.leitura_equipamento}</div>
        </div>` : ''}
        <div class="info-item">
          <div class="info-label">Origem</div>
          <div class="info-value">${cl.origem}</div>
        </div>
      </div>
    </div>
  </div>

  ${resultado ? `
  <div class="resultado-box" style="background:${resultado.bg};color:${resultado.cor}">
    <span style="font-size:16pt">&#9654;</span>
    <span>Resultado: ${resultado.label}</span>
  </div>` : ''}

  <div class="stats-grid">
    <div class="stat-box">
      <div class="stat-num" style="color:#1e40af">${respostas.length}</div>
      <div class="stat-label">Total de Itens</div>
    </div>
    <div class="stat-box">
      <div class="stat-num" style="color:#065f46">${totalConformes}</div>
      <div class="stat-label">Conformes</div>
    </div>
    <div class="stat-box">
      <div class="stat-num" style="color:#991b1b">${totalNaoConformes}</div>
      <div class="stat-label">Não Conformidades</div>
    </div>
  </div>

  <div class="secao">
    <h2 class="secao-titulo">Itens Verificados</h2>
    <table>
      <thead>
        <tr>
          <th style="width:30px">#</th>
          <th style="width:90px">Categoria</th>
          <th>Pergunta / Observação</th>
          <th style="width:110px" class="text-center">Resposta</th>
          <th style="width:65px" class="text-center">Foto</th>
        </tr>
      </thead>
      <tbody>${linhasRespostas}</tbody>
    </table>
  </div>

  ${cl.observacoes_gerais ? gerarObservacoes(cl.observacoes_gerais) : ''}

  <div class="rodape">
    <p>Checklist NR12 gerado em ${new Date().toLocaleString('pt-BR')}</p>
    <div class="assinatura-box">
      <div class="info-label">Assinatura do Responsável pelo Checklist</div>
      <div style="margin-top:5px;color:#1a1a1a">Nome: _________________________________</div>
      <div style="color:#1a1a1a">Cargo: _________________________________</div>
    </div>
  </div>
</body>
</html>`;
}

export function gerarImpressaoProfissional(
  tipo: 'orcamento' | 'ordem_servico' | 'fatura',
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

function gerarHTMLImpressao(tipo: 'orcamento' | 'ordem_servico' | 'fatura', dados: any) {
  const titulos = {
    orcamento: 'ORÇAMENTO',
    ordem_servico: 'ORDEM DE SERVIÇO',
    fatura: 'FATURA / NOTA DE COBRANÇA'
  };
  const titulo = titulos[tipo];
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
  ${tipo === 'fatura' ? gerarInformacoesFatura(dados) : gerarInformacoesDocumento(tipo, dados)}
  ${dados.descricao ? gerarDescricao(dados.descricao) : ''}
  ${tipo === 'fatura' ? gerarTabelaDocumentosVinculados(dados) : gerarTabelaItens(dados.itens || [])}
  ${gerarResumoValores(dados)}
  ${tipo === 'fatura' ? gerarInformacoesPagamento() : ''}
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

    .status-badge.pendente {
      background: #fef3c7;
      color: #92400e;
    }

    .status-badge.pago,
    .status-badge.recebido {
      background: #d1fae5;
      color: #065f46;
    }

    .status-badge.vencido,
    .status-badge.atrasado {
      background: #fee2e2;
      color: #991b1b;
    }
  `;
}

function gerarCabecalho(titulo: string, dados: any) {
  return `
    <div class="cabecalho">
      <div>
        <img src="${LOGO_PATH}" alt="Logo" class="logo-empresa" onerror="this.style.display='none'" />
      </div>
      <div class="info-empresa">
        <strong>${DADOS_EMPRESA.nome}</strong><br>
        CNPJ: ${DADOS_EMPRESA.cnpj}<br>
        ${DADOS_EMPRESA.endereco}<br>
        ${DADOS_EMPRESA.cidade} - CEP: ${DADOS_EMPRESA.cep}<br>
        ${DADOS_EMPRESA.celular} | ${DADOS_EMPRESA.email}
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

function gerarInformacoesFatura(dados: any) {
  const dataEmissao = dados.data_emissao || dados.created_at;
  const dataVencimento = dados.data_vencimento;

  return `
    <div class="secao">
      <h2 class="secao-titulo">💳 Informações da Fatura</h2>
      <div class="info-grid">
        <div class="info-box">
          <div class="info-item">
            <div class="info-label">Tipo da Cobrança</div>
            <div class="info-value">${dados.tipo_display || '-'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Status</div>
            <div class="info-value">
              <span class="status-badge ${dados.status?.toLowerCase() || 'pendente'}">${dados.status_display || 'Pendente'}</span>
            </div>
          </div>
        </div>
        <div class="info-box">
          <div class="info-item">
            <div class="info-label">Data de Emissão</div>
            <div class="info-value">${new Date(dataEmissao).toLocaleDateString('pt-BR')}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Data de Vencimento</div>
            <div class="info-value" style="color: #dc2626; font-weight: 700;">${new Date(dataVencimento).toLocaleDateString('pt-BR')}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function gerarTabelaDocumentosVinculados(dados: any) {
  // Se for fatura consolidada com múltiplas contas
  if (dados.contas_incluidas && dados.contas_incluidas.length > 0) {
    const linhasContas = dados.contas_incluidas.map((conta: any) => `
      <tr>
        <td><span class="item-tipo ${conta.status === 'VENCIDA' ? 'produto' : 'servico'}">${conta.numero}</span></td>
        <td>${conta.tipo}</td>
        <td>${conta.descricao}</td>
        <td class="text-center">${new Date(conta.data_vencimento).toLocaleDateString('pt-BR')}</td>
        <td class="text-right"><strong>R$ ${Number(conta.valor || 0).toFixed(2)}</strong></td>
      </tr>
    `).join('');

    return `
      <div class="secao no-break">
        <h2 class="secao-titulo">📑 Contas Incluídas nesta Fatura</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 100px">Nº Conta</th>
              <th style="width: 120px">Origem</th>
              <th>Descrição</th>
              <th class="text-center" style="width: 90px">Vencimento</th>
              <th class="text-right" style="width: 100px">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${linhasContas}
          </tbody>
        </table>
      </div>
    `;
  }

  // Se for fatura individual com documentos vinculados
  return `
    <div class="secao no-break">
      <h2 class="secao-titulo">📑 Documentos Vinculados</h2>
      <table>
        <thead>
          <tr>
            <th>Tipo de Documento</th>
            <th>Número</th>
            <th>Data</th>
            <th class="text-right">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${dados.orcamento_numero ? `
          <tr>
            <td><span class="item-tipo servico">ORÇAMENTO</span></td>
            <td><strong>${dados.orcamento_numero}</strong></td>
            <td>${dados.orcamento_data ? new Date(dados.orcamento_data).toLocaleDateString('pt-BR') : '-'}</td>
            <td class="text-right">R$ ${Number(dados.orcamento_valor || 0).toFixed(2)}</td>
          </tr>
          ` : ''}
          ${dados.ordem_servico_numero ? `
          <tr>
            <td><span class="item-tipo produto">ORDEM DE SERVIÇO</span></td>
            <td><strong>${dados.ordem_servico_numero}</strong></td>
            <td>${dados.ordem_servico_data ? new Date(dados.ordem_servico_data).toLocaleDateString('pt-BR') : '-'}</td>
            <td class="text-right">R$ ${Number(dados.ordem_servico_valor || 0).toFixed(2)}</td>
          </tr>
          ` : ''}
          <tr style="background: #eff6ff; font-weight: 700;">
            <td colspan="3"><span style="color: #2563eb;">CONTA A RECEBER</span></td>
            <td class="text-right" style="color: #2563eb;">${dados.numero}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function gerarInformacoesPagamento() {
  return `
    <div class="secao">
      <h2 class="secao-titulo">💰 Formas de Pagamento</h2>
      <div class="info-grid">
        <div class="info-box">
          <div class="info-item">
            <div class="info-label">Banco</div>
            <div class="info-value">${DADOS_EMPRESA.banco}</div>
          </div>
          ${DADOS_EMPRESA.agencia ? `
          <div class="info-item">
            <div class="info-label">Agência</div>
            <div class="info-value">${DADOS_EMPRESA.agencia}</div>
          </div>
          ` : ''}
          ${DADOS_EMPRESA.conta ? `
          <div class="info-item">
            <div class="info-label">Conta</div>
            <div class="info-value">${DADOS_EMPRESA.conta}</div>
          </div>
          ` : ''}
        </div>
        <div class="info-box">
          <div class="info-item">
            <div class="info-label">PIX (CNPJ)</div>
            <div class="info-value" style="font-family: monospace; font-size: 10pt; color: #2563eb; font-weight: 700;">
              ${DADOS_EMPRESA.pix}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function gerarRodape(tipo: string, dados: any) {
  const mensagens = {
    orcamento: 'Proposta válida conforme prazo especificado acima',
    ordem_servico: 'Documento vinculado ao orçamento aprovado',
    fatura: 'Pagamento até a data de vencimento. Após o vencimento, sujeito a multa e juros.'
  };

  return `
    <div class="rodape">
      <p>
        Este documento foi gerado eletronicamente em ${new Date().toLocaleString('pt-BR')}<br>
        ${mensagens[tipo as keyof typeof mensagens] || ''}
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
