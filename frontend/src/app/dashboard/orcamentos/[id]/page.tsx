'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { orcamentosApi, type Orcamento } from '@/lib/api';

export default function OrcamentoDetalhesPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [orcamento, setOrcamento] = useState<Orcamento | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrcamento();
  }, [id]);

  async function loadOrcamento() {
    try {
      setLoading(true);
      const data = await orcamentosApi.get(Number(id));
      setOrcamento(data);
    } catch (error) {
      console.error('Erro ao carregar orçamento:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleEnviar() {
    if (!confirm('Deseja enviar este orçamento ao cliente?')) return;
    try {
      await orcamentosApi.enviar(Number(id));
      loadOrcamento();
      alert('Orçamento enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao enviar orçamento:', error);
      alert('Erro ao enviar orçamento');
    }
  }

  async function handleAprovar() {
    if (!confirm('Deseja aprovar este orçamento?')) return;
    try {
      await orcamentosApi.aprovar(Number(id));
      loadOrcamento();
      alert('Orçamento aprovado! Uma Ordem de Serviço ou Conta a Receber foi criada automaticamente.');
    } catch (error) {
      console.error('Erro ao aprovar orçamento:', error);
      alert('Erro ao aprovar orçamento');
    }
  }

  async function handleRejeitar() {
    if (!confirm('Deseja rejeitar este orçamento?')) return;
    try {
      await orcamentosApi.rejeitar(Number(id));
      loadOrcamento();
      alert('Orçamento rejeitado!');
    } catch (error) {
      console.error('Erro ao rejeitar orçamento:', error);
      alert('Erro ao rejeitar orçamento');
    }
  }

  function handleImprimir() {
    window.print();
  }

  async function handleGerarPDF() {
    try {
      // Usar a funcionalidade nativa do navegador para salvar como PDF
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Bloqueador de pop-ups ativo. Permita pop-ups para gerar PDF.');
        return;
      }

      // Copiar o conteúdo atual com estilos
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Orçamento ${orcamento?.numero}</title>
            <style>
              ${getImpressaoStyles()}
            </style>
          </head>
          <body>
            ${document.querySelector('.orcamento-print')?.innerHTML || ''}
          </body>
        </html>
      `);
      printWindow.document.close();

      // Aguardar um momento para o conteúdo carregar
      setTimeout(() => {
        printWindow.print();
        setTimeout(() => printWindow.close(), 500);
      }, 250);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Use o botão Imprimir e selecione "Salvar como PDF".');
    }
  }

  function getImpressaoStyles() {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: Arial, sans-serif;
        padding: 10mm;
        color: #000;
        font-size: 10px;
      }
      h1 {
        font-size: 16px;
        margin-bottom: 5px;
      }
      h2 {
        font-size: 12px;
        margin-top: 10px;
        margin-bottom: 8px;
        border-bottom: 1px solid #000;
        padding-bottom: 3px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 8px 0;
      }
      th, td {
        border: 1px solid #000;
        padding: 4px;
        text-align: left;
        font-size: 9px;
      }
      th {
        background-color: #f0f0f0;
        font-weight: bold;
      }
      .bg-white {
        background: white;
        padding: 10px;
        margin-bottom: 10px;
        border: 1px solid #ddd;
      }
      .shadow {
        box-shadow: none !important;
      }
      .rounded-lg {
        border-radius: 0;
      }
      .grid {
        display: grid;
      }
      .grid-cols-2 {
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      .space-y-2 > * + * {
        margin-top: 6px;
      }
      .space-y-1 > * + * {
        margin-top: 3px;
      }
      .text-xs {
        font-size: 9px;
      }
      .text-sm {
        font-size: 10px;
      }
      .text-base {
        font-size: 12px;
      }
      .font-semibold {
        font-weight: 600;
      }
      .font-bold {
        font-weight: 700;
      }
      .no-print {
        display: none !important;
      }
      .text-blue-600 {
        color: #2563eb !important;
      }
      .text-gray-600 {
        color: #4b5563;
      }
      .text-gray-900 {
        color: #111827;
      }
      .border-t {
        border-top: 1px solid #d1d5db;
        padding-top: 8px;
        margin-top: 8px;
      }
      .text-center {
        text-align: center;
      }
      .text-right {
        text-align: right;
      }
      .flex {
        display: flex;
      }
      .justify-between {
        justify-content: space-between;
      }
      @media print {
        body {
          padding: 8mm;
        }
        .no-print {
          display: none !important;
        }
        @page {
          margin: 12mm;
          size: A4;
        }
      }
    `;
  }

  function getStatusBadge(status: string) {
    const colors: Record<string, string> = {
      RASCUNHO: 'bg-gray-100 text-gray-800',
      ENVIADO: 'bg-blue-100 text-blue-800',
      APROVADO: 'bg-green-100 text-green-800',
      REJEITADO: 'bg-red-100 text-red-800',
      CANCELADO: 'bg-gray-100 text-gray-500',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }

  if (loading) {
    return <div className="p-6 text-gray-900">Carregando...</div>;
  }

  if (!orcamento) {
    return <div className="p-6 text-gray-900">Orçamento não encontrado</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6 no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Orçamento {orcamento.numero}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Criado em {new Date(orcamento.created_at!).toLocaleString('pt-BR')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleImprimir}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 flex items-center gap-2"
            title="Imprimir orçamento"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir
          </button>
          <button
            onClick={handleGerarPDF}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 flex items-center gap-2"
            title="Salvar como PDF"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Salvar PDF
          </button>
          {orcamento.status === 'RASCUNHO' && (
            <button
              onClick={handleEnviar}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Enviar ao Cliente
            </button>
          )}
          {(orcamento.status === 'RASCUNHO' || orcamento.status === 'ENVIADO') && (
            <>
              <button
                onClick={handleAprovar}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Aprovar
              </button>
              <button
                onClick={handleRejeitar}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Rejeitar
              </button>
            </>
          )}
          <button
            onClick={() => router.back()}
            className="bg-gray-300 text-gray-900 px-4 py-2 rounded hover:bg-gray-400"
          >
            Voltar
          </button>
        </div>
      </div>

      <div className="orcamento-print">
      {/* Cabeçalho com Logo */}
      <div className="bg-white p-4 rounded-lg shadow mb-4 print:shadow-none">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {/* Logotipo da empresa */}
            <div className="mb-3">
              <img
                src="/logo.png"
                alt="Logo da Empresa"
                className="w-48 h-auto max-h-24 object-contain"
              />
            </div>
            <div className="text-gray-900">
              <h2 className="text-base font-bold">ORÇAMENTO</h2>
              <p className="text-sm font-semibold text-blue-600">{orcamento.numero}</p>
            </div>
          </div>
          <div className="text-right text-gray-900">
            <p className="text-xs"><span className="font-semibold">Emissão:</span> {new Date(orcamento.data_emissao!).toLocaleDateString('pt-BR')}</p>
            <p className="text-xs"><span className="font-semibold">Validade:</span> {new Date(orcamento.data_validade).toLocaleDateString('pt-BR')}</p>
            <p className="text-xs"><span className="font-semibold">Prazo:</span> {orcamento.prazo_execucao_dias} dias</p>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="mb-6 no-print">
        <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusBadge(orcamento.status)}`}>
          {orcamento.status_display}
        </span>
      </div>

      {/* Informações Principais */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Dados do Orçamento</h2>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-600">Tipo</p>
              <p className="text-sm text-gray-900 font-medium">{orcamento.tipo_display}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Cliente</p>
              <p className="text-sm text-gray-900 font-medium">{orcamento.cliente_nome}</p>
            </div>
            {orcamento.empreendimento_nome && (
              <div>
                <p className="text-xs text-gray-600">Empreendimento</p>
                <p className="text-sm text-gray-900 font-medium">{orcamento.empreendimento_nome}</p>
              </div>
            )}
            {orcamento.equipamento_codigo && (
              <div>
                <p className="text-xs text-gray-600">Equipamento</p>
                <p className="text-sm text-gray-900 font-medium">
                  {orcamento.equipamento_codigo} - {orcamento.equipamento_descricao}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Datas e Prazos</h2>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-600">Data de Emissão</p>
              <p className="text-sm text-gray-900 font-medium">
                {new Date(orcamento.data_emissao!).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Validade</p>
              <p className="text-sm text-gray-900 font-medium">
                {new Date(orcamento.data_validade).toLocaleDateString('pt-BR')}
              </p>
            </div>
            {orcamento.data_aprovacao && (
              <div>
                <p className="text-xs text-gray-600">Data de Aprovação</p>
                <p className="text-sm text-gray-900 font-medium">
                  {new Date(orcamento.data_aprovacao).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-600">Prazo de Execução</p>
              <p className="text-sm text-gray-900 font-medium">{orcamento.prazo_execucao_dias} dias</p>
            </div>
          </div>
        </div>
      </div>

      {/* Descrição */}
      {orcamento.descricao && (
        <div className="bg-white p-4 rounded-lg shadow mb-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Descrição</h2>
          <p className="text-xs text-gray-900">{orcamento.descricao}</p>
        </div>
      )}

      {/* Itens */}
      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Itens</h2>
        {orcamento.itens && orcamento.itens.length > 0 ? (
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-900 uppercase">
                  Tipo
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-900 uppercase">
                  Descrição
                </th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-900 uppercase">
                  Qtd
                </th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-900 uppercase">
                  Vlr Unit.
                </th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-900 uppercase">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orcamento.itens.map((item) => (
                <tr key={item.id}>
                  <td className="px-2 py-2 text-xs text-gray-900">
                    {item.tipo_display}
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900">
                    {item.descricao}
                    {item.produto_codigo && (
                      <span className="text-gray-600 ml-1">({item.produto_codigo})</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 text-right">
                    {item.quantidade}
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 text-right">
                    R$ {Number(item.valor_unitario || 0).toFixed(2)}
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-900 text-right font-medium">
                    R$ {Number(item.valor_total || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-xs text-gray-900">Nenhum item adicionado</p>
        )}
      </div>

      {/* Valores */}
      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Valores</h2>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-900">
            <span>Valor dos Serviços:</span>
            <span>R$ {Number(orcamento.valor_servicos || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-900">
            <span>Valor dos Produtos:</span>
            <span>R$ {Number(orcamento.valor_produtos || 0).toFixed(2)}</span>
          </div>
          {(Number(orcamento.km_deslocado || 0) > 0 || Number(orcamento.valor_deslocamento || 0) > 0) && (
            <>
              <div className="flex justify-between text-xs text-gray-600">
                <span>KM Deslocado:</span>
                <span>{Number(orcamento.km_deslocado || 0).toFixed(2)} km</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>Valor do KM:</span>
                <span>R$ {Number(orcamento.valor_km || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-900">
                <span>Valor de Deslocamento:</span>
                <span>R$ {Number(orcamento.valor_deslocamento || 0).toFixed(2)}</span>
              </div>
            </>
          )}
          {Number(orcamento.valor_desconto || 0) > 0 && (
            <div className="flex justify-between text-xs text-gray-900">
              <span>Desconto:</span>
              <span>- R$ {Number(orcamento.valor_desconto || 0).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t">
            <span>TOTAL:</span>
            <span>R$ {Number(orcamento.valor_total || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Observações */}
      {orcamento.observacoes && (
        <div className="bg-white p-4 rounded-lg shadow mb-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Observações</h2>
          <p className="text-xs text-gray-900">{orcamento.observacoes}</p>
        </div>
      )}

      {/* Informações de Controle */}
      <div className="bg-white p-6 rounded-lg shadow no-print">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações de Controle</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Criado por</p>
            <p className="text-gray-900">{orcamento.criado_por_nome || '-'}</p>
          </div>
          {orcamento.aprovado_por_nome && (
            <div>
              <p className="text-sm text-gray-600">Aprovado por</p>
              <p className="text-gray-900">{orcamento.aprovado_por_nome}</p>
            </div>
          )}
        </div>
      </div>

      {/* Rodapé */}
      <div className="mt-6 pt-4 border-t border-gray-300 text-center">
        <p className="text-xs text-gray-600">
          Criado por <span className="font-semibold text-gray-900">Mandacaru Soluções em Mineração</span>
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {new Date().getFullYear()} - Todos os direitos reservados
        </p>
      </div>
      </div>

      <style jsx global>{`
        @media print {
          * {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100%;
            height: 100%;
          }
          body > div {
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .orcamento-print {
            padding: 10mm !important;
            max-width: 100%;
            margin: 0 auto;
          }
          .bg-white {
            box-shadow: none !important;
            border: 1px solid #ddd;
            page-break-inside: avoid;
          }
          h1, h2 {
            page-break-after: avoid;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
          .shadow {
            box-shadow: none !important;
          }
          .rounded-lg {
            border-radius: 0 !important;
          }
          @page {
            margin: 12mm;
            size: A4;
          }
        }
      `}</style>
    </div>
  );
}
