'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ordensServicoApi, tecnicosApi, type OrdemServico } from '@/lib/api';

export default function OrdemServicoDetalhesPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [os, setOs] = useState<OrdemServico | null>(null);
  const [loading, setLoading] = useState(true);
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [tecnicoSelecionado, setTecnicoSelecionado] = useState<number | undefined>();
  const [valorAdicional, setValorAdicional] = useState(0);
  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {
    loadOrdemServico();
    loadTecnicos();
  }, [id]);

  async function loadOrdemServico() {
    try {
      setLoading(true);
      const data = await ordensServicoApi.get(Number(id));
      setOs(data);
      setTecnicoSelecionado(data.tecnico_responsavel);
      setValorAdicional(data.valor_adicional);
      setObservacoes(data.observacoes || '');
    } catch (error) {
      console.error('Erro ao carregar ordem de serviço:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadTecnicos() {
    try {
      const data = await tecnicosApi.list();
      setTecnicos(data.results || []);
    } catch (error) {
      console.error('Erro ao carregar técnicos:', error);
    }
  }

  async function handleSalvar() {
    try {
      await ordensServicoApi.update(Number(id), {
        tecnico_responsavel: tecnicoSelecionado,
        valor_adicional: valorAdicional,
        observacoes: observacoes,
      } as any);
      loadOrdemServico();
      alert('Ordem de serviço atualizada!');
    } catch (error) {
      console.error('Erro ao atualizar ordem de serviço:', error);
      alert('Erro ao atualizar ordem de serviço');
    }
  }

  async function handleIniciar() {
    if (!confirm('Deseja iniciar a execução desta ordem de serviço?')) return;
    try {
      await ordensServicoApi.iniciar(Number(id));
      loadOrdemServico();
      alert('Ordem de serviço iniciada!');
    } catch (error) {
      console.error('Erro ao iniciar ordem de serviço:', error);
      alert('Erro ao iniciar ordem de serviço');
    }
  }

  async function handleConcluir() {
    if (!confirm('Deseja concluir esta ordem de serviço? Uma conta a receber será criada automaticamente.')) return;
    try {
      await ordensServicoApi.concluir(Number(id));
      loadOrdemServico();
      alert('Ordem de serviço concluída! Uma conta a receber foi criada automaticamente.');
    } catch (error) {
      console.error('Erro ao concluir ordem de serviço:', error);
      alert('Erro ao concluir ordem de serviço');
    }
  }

  async function handleCancelar() {
    if (!confirm('Deseja cancelar esta ordem de serviço?')) return;
    try {
      await ordensServicoApi.cancelar(Number(id));
      loadOrdemServico();
      alert('Ordem de serviço cancelada!');
    } catch (error) {
      console.error('Erro ao cancelar ordem de serviço:', error);
      alert('Erro ao cancelar ordem de serviço');
    }
  }

  function handleImprimir() {
    window.print();
  }

  async function handleGerarPDF() {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Bloqueador de pop-ups ativo. Permita pop-ups para gerar PDF.');
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Ordem de Serviço ${os?.numero}</title>
            <style>${getImpressaoStyles()}</style>
          </head>
          <body>
            ${document.querySelector('.os-print')?.innerHTML || ''}
          </body>
        </html>
      `);
      printWindow.document.close();

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
      ABERTA: 'bg-blue-100 text-blue-800',
      EM_EXECUCAO: 'bg-yellow-100 text-yellow-800',
      CONCLUIDA: 'bg-green-100 text-green-800',
      CANCELADA: 'bg-gray-100 text-gray-500',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }

  if (loading) {
    return <div className="p-6 text-gray-900">Carregando...</div>;
  }

  if (!os) {
    return <div className="p-6 text-gray-900">Ordem de serviço não encontrada</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6 no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Ordem de Serviço {os.numero}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Orçamento: {os.orcamento_numero} - {os.orcamento_tipo_display}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleImprimir}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 flex items-center gap-2"
            title="Imprimir ordem de serviço"
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
          {os.status === 'ABERTA' && (
            <button
              onClick={handleIniciar}
              className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
            >
              Iniciar Execução
            </button>
          )}
          {(os.status === 'ABERTA' || os.status === 'EM_EXECUCAO') && (
            <>
              <button
                onClick={handleConcluir}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Concluir
              </button>
              <button
                onClick={handleCancelar}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Cancelar
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

      <div className="os-print">
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
              <h2 className="text-base font-bold">ORDEM DE SERVIÇO</h2>
              <p className="text-sm font-semibold text-blue-600">{os.numero}</p>
            </div>
          </div>
          <div className="text-right text-gray-900">
            <p className="text-xs"><span className="font-semibold">Abertura:</span> {new Date(os.data_abertura!).toLocaleDateString('pt-BR')}</p>
            <p className="text-xs"><span className="font-semibold">Prevista:</span> {new Date(os.data_prevista).toLocaleDateString('pt-BR')}</p>
            <p className="text-xs"><span className="font-semibold">Status:</span> {os.status_display}</p>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="mb-6 no-print">
        <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusBadge(os.status)}`}>
          {os.status_display}
        </span>
      </div>

      {/* Informações Principais */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Dados da OS</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Cliente</p>
              <p className="text-gray-900 font-medium">{os.cliente_nome}</p>
            </div>
            {os.empreendimento_nome && (
              <div>
                <p className="text-sm text-gray-600">Empreendimento</p>
                <p className="text-gray-900 font-medium">{os.empreendimento_nome}</p>
              </div>
            )}
            {os.equipamento_codigo && (
              <div>
                <p className="text-sm text-gray-600">Equipamento</p>
                <p className="text-gray-900 font-medium">
                  {os.equipamento_codigo} - {os.equipamento_descricao}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Datas</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Data de Abertura</p>
              <p className="text-gray-900 font-medium">
                {new Date(os.data_abertura!).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Data Prevista</p>
              <p className="text-gray-900 font-medium">
                {new Date(os.data_prevista).toLocaleDateString('pt-BR')}
              </p>
            </div>
            {os.data_inicio && (
              <div>
                <p className="text-sm text-gray-600">Data de Início</p>
                <p className="text-gray-900 font-medium">
                  {new Date(os.data_inicio).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}
            {os.data_conclusao && (
              <div>
                <p className="text-sm text-gray-600">Data de Conclusão</p>
                <p className="text-gray-900 font-medium">
                  {new Date(os.data_conclusao).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Atribuição e Valores Adicionais */}
      {os.status !== 'CONCLUIDA' && os.status !== 'CANCELADA' && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Execução</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Técnico Responsável
              </label>
              <select
                value={tecnicoSelecionado || ''}
                onChange={(e) => setTecnicoSelecionado(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
              >
                <option value="" className="text-gray-900 bg-white">Selecione...</option>
                {tecnicos.map((tec) => (
                  <option key={tec.id} value={tec.id} className="text-gray-900 bg-white">
                    {tec.nome_completo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Valor Adicional
              </label>
              <input
                type="number"
                value={valorAdicional}
                onChange={(e) => setValorAdicional(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Observações
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
            />
          </div>

          <button
            onClick={handleSalvar}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Salvar Alterações
          </button>
        </div>
      )}

      {/* Descrição */}
      {os.descricao && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Descrição</h2>
          <p className="text-gray-900">{os.descricao}</p>
        </div>
      )}

      {/* Itens */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Itens</h2>
        {os.itens && os.itens.length > 0 ? (
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Tipo
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Descrição
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-900 uppercase">
                  Quantidade
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-900 uppercase">
                  Valor Unitário
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-900 uppercase">
                  Total
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-900 uppercase">
                  Executado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {os.itens.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {item.tipo_display}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {item.descricao}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    {item.quantidade}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    R$ {Number(item.valor_unitario || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                    R$ {Number(item.valor_total || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-center">
                    {item.executado ? '✓' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-900">Nenhum item</p>
        )}
      </div>

      {/* Valores */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Valores</h2>
        <div className="space-y-2">
          <div className="flex justify-between text-gray-900">
            <span>Valor dos Serviços:</span>
            <span>R$ {Number(os.valor_servicos || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-900">
            <span>Valor dos Produtos:</span>
            <span>R$ {Number(os.valor_produtos || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-900">
            <span>Valor de Deslocamento:</span>
            <span>R$ {Number(os.valor_deslocamento || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-900">
            <span>Desconto:</span>
            <span>- R$ {Number(os.valor_desconto || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-900 font-medium">
            <span>Subtotal:</span>
            <span>R$ {Number(os.valor_total || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-900">
            <span>Valor Adicional:</span>
            <span>R$ {Number(os.valor_adicional || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t">
            <span>TOTAL FINAL:</span>
            <span>R$ {Number(os.valor_final || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Informações de Controle */}
      <div className="bg-white p-6 rounded-lg shadow no-print">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações de Controle</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Aberta por</p>
            <p className="text-gray-900">{os.aberto_por_nome || '-'}</p>
          </div>
          {os.tecnico_nome && (
            <div>
              <p className="text-sm text-gray-600">Técnico Responsável</p>
              <p className="text-gray-900">{os.tecnico_nome}</p>
            </div>
          )}
          {os.concluido_por_nome && (
            <div>
              <p className="text-sm text-gray-600">Concluída por</p>
              <p className="text-gray-900">{os.concluido_por_nome}</p>
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
          .os-print {
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
