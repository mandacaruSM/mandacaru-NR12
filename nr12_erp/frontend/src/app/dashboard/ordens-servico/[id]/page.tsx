'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ordensServicoApi, tecnicosApi, itensOrdemServicoApi, produtosApi, type OrdemServico, type ItemOrdemServico, type Produto } from '@/lib/api';

export default function OrdemServicoDetalhesPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [os, setOs] = useState<OrdemServico | null>(null);
  const [loading, setLoading] = useState(true);
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [tecnicoSelecionado, setTecnicoSelecionado] = useState<number | undefined>();
  const [valorAdicional, setValorAdicional] = useState(0);
  const [observacoes, setObservacoes] = useState('');
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemOrdemServico | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [itemForm, setItemForm] = useState<Partial<ItemOrdemServico>>({
    tipo: 'SERVICO',
    descricao: '',
    quantidade: 1,
    valor_unitario: 0,
    executado: false,
  });

  useEffect(() => {
    loadOrdemServico();
    loadTecnicos();
    loadProdutos();
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
      setTecnicos(Array.isArray(data) ? data : (data as any).results || []);
    } catch (error) {
      console.error('Erro ao carregar técnicos:', error);
    }
  }

  async function loadProdutos() {
    try {
      const data = await produtosApi.list();
      setProdutos(Array.isArray(data) ? data : (data as any).results || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  }

  function handleNovoItem() {
    setEditingItem(null);
    setItemForm({
      tipo: 'SERVICO',
      descricao: '',
      quantidade: 1,
      valor_unitario: 0,
      executado: false,
    });
    setShowItemModal(true);
  }

  function handleEditarItem(item: ItemOrdemServico) {
    setEditingItem(item);
    setItemForm({
      tipo: item.tipo,
      descricao: item.descricao,
      quantidade: item.quantidade,
      valor_unitario: item.valor_unitario,
      produto: item.produto,
      observacao: item.observacao,
      executado: item.executado,
    });
    setShowItemModal(true);
  }

  async function handleSalvarItem() {
    try {
      // Montar dados removendo campos undefined/null
      const data: Record<string, unknown> = {
        tipo: itemForm.tipo,
        descricao: itemForm.descricao,
        quantidade: itemForm.quantidade,
        valor_unitario: itemForm.valor_unitario,
        executado: itemForm.executado,
      };

      // Adicionar produto apenas se definido
      if (itemForm.produto) {
        data.produto = itemForm.produto;
      }

      // Adicionar observação apenas se definida
      if (itemForm.observacao) {
        data.observacao = itemForm.observacao;
      }

      if (editingItem) {
        await itensOrdemServicoApi.update(editingItem.id!, data as Partial<ItemOrdemServico>);
        alert('Item atualizado com sucesso!');
      } else {
        // Para criação, ordem_servico é obrigatório
        data.ordem_servico = Number(id);
        await itensOrdemServicoApi.create(data as Partial<ItemOrdemServico>);
        alert('Item adicionado com sucesso!');
      }

      setShowItemModal(false);
      loadOrdemServico();
    } catch (error) {
      console.error('Erro ao salvar item:', error);
      alert('Erro ao salvar item');
    }
  }

  async function handleDeletarItem(item: ItemOrdemServico) {
    if (!confirm(`Deseja realmente excluir o item "${item.descricao}"?`)) return;

    try {
      await itensOrdemServicoApi.delete(item.id!);
      alert('Item excluído com sucesso!');
      loadOrdemServico();
    } catch (error) {
      console.error('Erro ao deletar item:', error);
      alert('Erro ao deletar item');
    }
  }

  async function handleToggleExecutado(item: ItemOrdemServico) {
    try {
      console.log('Alterando executado:', item.id, 'de', item.executado, 'para', !item.executado);
      const resultado = await itensOrdemServicoApi.update(item.id!, {
        executado: !item.executado,
      });
      console.log('Resultado do update:', resultado);
      await loadOrdemServico();
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      alert('Erro ao atualizar item: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
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
      .text-gray-900 {
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
          <p className="text-sm text-gray-900 mt-1">
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
              <p className="text-sm text-gray-900">Cliente</p>
              <p className="text-gray-900 font-medium">{os.cliente_nome}</p>
            </div>
            {os.empreendimento_nome && (
              <div>
                <p className="text-sm text-gray-900">Empreendimento</p>
                <p className="text-gray-900 font-medium">{os.empreendimento_nome}</p>
              </div>
            )}
            {os.equipamento_codigo && (
              <div>
                <p className="text-sm text-gray-900">Equipamento</p>
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
              <p className="text-sm text-gray-900">Data de Abertura</p>
              <p className="text-gray-900 font-medium">
                {new Date(os.data_abertura!).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-900">Data Prevista</p>
              <p className="text-gray-900 font-medium">
                {new Date(os.data_prevista).toLocaleDateString('pt-BR')}
              </p>
            </div>
            {os.data_inicio && (
              <div>
                <p className="text-sm text-gray-900">Data de Início</p>
                <p className="text-gray-900 font-medium">
                  {new Date(os.data_inicio).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}
            {os.data_conclusao && (
              <div>
                <p className="text-sm text-gray-900">Data de Conclusão</p>
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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Itens</h2>
          {(os.status === 'ABERTA' || os.status === 'EM_EXECUCAO') && (
            <button
              onClick={handleNovoItem}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2 no-print"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Adicionar Item
            </button>
          )}
        </div>
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
                {(os.status === 'ABERTA' || os.status === 'EM_EXECUCAO') && (
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-900 uppercase no-print">
                    Ações
                  </th>
                )}
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
                    {item.observacao && (
                      <div className="text-xs text-gray-500 mt-1">{item.observacao}</div>
                    )}
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
                    <button
                      onClick={() => handleToggleExecutado(item)}
                      className={`px-3 py-1 rounded text-xs ${
                        item.executado
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                      disabled={os.status === 'CONCLUIDA' || os.status === 'CANCELADA'}
                    >
                      {item.executado ? '✓ Executado' : '○ Pendente'}
                    </button>
                  </td>
                  {(os.status === 'ABERTA' || os.status === 'EM_EXECUCAO') && (
                    <td className="px-4 py-3 text-sm text-center no-print">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEditarItem(item)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Editar"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeletarItem(item)}
                          className="text-red-600 hover:text-red-800"
                          title="Excluir"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-900">Nenhum item adicionado</p>
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
            <p className="text-sm text-gray-900">Aberta por</p>
            <p className="text-gray-900">{os.aberto_por_nome || '-'}</p>
          </div>
          {os.tecnico_nome && (
            <div>
              <p className="text-sm text-gray-900">Técnico Responsável</p>
              <p className="text-gray-900">{os.tecnico_nome}</p>
            </div>
          )}
          {os.concluido_por_nome && (
            <div>
              <p className="text-sm text-gray-900">Concluída por</p>
              <p className="text-gray-900">{os.concluido_por_nome}</p>
            </div>
          )}
        </div>
      </div>

      {/* Rodapé */}
      <div className="mt-6 pt-4 border-t border-gray-300 text-center">
        <p className="text-xs text-gray-900">
          Criado por <span className="font-semibold text-gray-900">Mandacaru Soluções em Mineração</span>
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {new Date().getFullYear()} - Todos os direitos reservados
        </p>
      </div>
      </div>

      {/* Modal de Adicionar/Editar Item */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingItem ? 'Editar Item' : 'Adicionar Item'}
              </h2>

              <div className="space-y-4">
                {/* Tipo */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Tipo *
                  </label>
                  <select
                    value={itemForm.tipo}
                    onChange={(e) => setItemForm({ ...itemForm, tipo: e.target.value as 'SERVICO' | 'PRODUTO' })}
                    className="w-full px-3 py-2 border rounded text-gray-900"
                  >
                    <option value="SERVICO">Serviço</option>
                    <option value="PRODUTO">Produto</option>
                  </select>
                </div>

                {/* Produto (se tipo = PRODUTO) */}
                {itemForm.tipo === 'PRODUTO' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Produto
                    </label>
                    <select
                      value={itemForm.produto || ''}
                      onChange={(e) => {
                        const produtoId = Number(e.target.value);
                        const produto = produtos.find((p) => p.id === produtoId);
                        setItemForm({
                          ...itemForm,
                          produto: produtoId || undefined,
                          descricao: produto?.nome || itemForm.descricao,
                          valor_unitario: produto?.preco_venda || itemForm.valor_unitario,
                        });
                      }}
                      className="w-full px-3 py-2 border rounded text-gray-900"
                    >
                      <option value="">Selecione um produto (opcional)</option>
                      {produtos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.codigo} - {p.nome} (R$ {Number(p.preco_venda || 0).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Descrição */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Descrição *
                  </label>
                  <input
                    type="text"
                    value={itemForm.descricao}
                    onChange={(e) => setItemForm({ ...itemForm, descricao: e.target.value })}
                    className="w-full px-3 py-2 border rounded text-gray-900"
                    required
                  />
                </div>

                {/* Quantidade e Valor Unitário */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Quantidade *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={itemForm.quantidade}
                      onChange={(e) => setItemForm({ ...itemForm, quantidade: Number(e.target.value) })}
                      className="w-full px-3 py-2 border rounded text-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Valor Unitário *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={itemForm.valor_unitario}
                      onChange={(e) => setItemForm({ ...itemForm, valor_unitario: Number(e.target.value) })}
                      className="w-full px-3 py-2 border rounded text-gray-900"
                      required
                    />
                  </div>
                </div>

                {/* Valor Total (calculado) */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Valor Total
                  </label>
                  <input
                    type="text"
                    value={`R$ ${((itemForm.quantidade || 0) * (itemForm.valor_unitario || 0)).toFixed(2)}`}
                    disabled
                    className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-900"
                  />
                </div>

                {/* Observação */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Observação
                  </label>
                  <textarea
                    value={itemForm.observacao || ''}
                    onChange={(e) => setItemForm({ ...itemForm, observacao: e.target.value })}
                    className="w-full px-3 py-2 border rounded text-gray-900"
                    rows={3}
                  />
                </div>

                {/* Executado */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={itemForm.executado}
                    onChange={(e) => setItemForm({ ...itemForm, executado: e.target.checked })}
                    className="mr-2"
                  />
                  <label className="text-sm text-gray-900">
                    Marcar como executado
                  </label>
                </div>
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-900 rounded hover:bg-gray-400"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvarItem}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  disabled={!itemForm.descricao || !itemForm.quantidade || itemForm.valor_unitario === undefined}
                >
                  {editingItem ? 'Atualizar' : 'Adicionar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
