'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { pedidosCompraApi, almoxarifadoApi, type PedidoCompra, type ItemPedidoCompra, type LocalEstoque } from '@/lib/api';

function formatCurrency(value: number): string {
  return 'R$ ' + Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR');
}

export default function DetalhePedidoPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [pedido, setPedido] = useState<PedidoCompra | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Para recebimento
  const [showReceber, setShowReceber] = useState(false);
  const [receberForm, setReceberForm] = useState({ numero_nf: '', local_estoque: '' });
  const [locaisEstoque, setLocaisEstoque] = useState<LocalEstoque[]>([]);
  const [loadingLocais, setLoadingLocais] = useState(false);
  const [locaisError, setLocaisError] = useState('');

  // Para edicao de itens
  const [editingItens, setEditingItens] = useState(false);
  const [editedItens, setEditedItens] = useState<ItemPedidoCompra[]>([]);

  useEffect(() => {
    loadPedido();
  }, [id]);

  async function loadPedido() {
    try {
      setLoading(true);
      const data = await pedidosCompraApi.get(id);
      setPedido(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar pedido');
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(action: string) {
    try {
      setActionLoading(action);
      setError('');
      setSuccessMsg('');
      let result: PedidoCompra;

      switch (action) {
        case 'enviar':
          result = await pedidosCompraApi.enviar(id);
          setSuccessMsg('Pedido enviado ao fornecedor!');
          break;
        case 'aprovar':
          result = await pedidosCompraApi.aprovar(id);
          setSuccessMsg('Pedido aprovado!');
          break;
        case 'cancelar':
          if (!confirm('Deseja realmente cancelar este pedido?')) return;
          result = await pedidosCompraApi.cancelar(id);
          setSuccessMsg('Pedido cancelado.');
          break;
        default:
          return;
      }

      setPedido(result);
    } catch (err: any) {
      setError(err.message || 'Erro ao executar acao');
    } finally {
      setActionLoading('');
    }
  }

  async function openReceber() {
    setShowReceber(true);
    setError('');
    setSuccessMsg('');
    setLocaisError('');

    if (locaisEstoque.length === 0) {
      try {
        setLoadingLocais(true);
        const res = await almoxarifadoApi.locais.list();
        const locais = res.results || [];
        setLocaisEstoque(locais);
        if (locais.length === 0) {
          setLocaisError('Nenhum local de estoque cadastrado. Cadastre um local primeiro.');
        }
      } catch (err: any) {
        console.error('Erro ao carregar locais de estoque:', err);
        setLocaisError(err.message || 'Erro ao carregar locais de estoque');
      } finally {
        setLoadingLocais(false);
      }
    }
    if (pedido?.numero_nf) {
      setReceberForm(prev => ({ ...prev, numero_nf: pedido.numero_nf || '' }));
    }
    if (pedido?.local_estoque) {
      setReceberForm(prev => ({ ...prev, local_estoque: String(pedido.local_estoque) }));
    }
  }

  async function handleReceber(e: React.FormEvent) {
    e.preventDefault();
    try {
      setActionLoading('receber');
      setError('');
      const payload: any = {};
      if (receberForm.numero_nf) payload.numero_nf = receberForm.numero_nf;
      if (receberForm.local_estoque) payload.local_estoque = Number(receberForm.local_estoque);
      const result = await pedidosCompraApi.receber(id, payload);
      setPedido(result);
      setShowReceber(false);
      setSuccessMsg('Recebimento confirmado! Estoque atualizado automaticamente.');
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar recebimento');
    } finally {
      setActionLoading('');
    }
  }

  async function handleDelete() {
    if (!confirm('Deseja realmente excluir este pedido?')) return;
    try {
      await pedidosCompraApi.delete(id);
      router.push('/dashboard/compras');
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir');
    }
  }

  // --- PDF Generation ---
  function handleGerarPDF() {
    if (!pedido) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('PEDIDO DE COMPRA', pageWidth / 2, y, { align: 'center' });
    y += 8;

    doc.setFontSize(14);
    doc.text(`PC-${pedido.numero}`, pageWidth / 2, y, { align: 'center' });
    y += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const dataPedido = pedido.data_pedido ? formatDate(pedido.data_pedido) : '-';
    doc.text(`Data: ${dataPedido}`, pageWidth / 2, y, { align: 'center' });
    y += 4;

    doc.setFontSize(9);
    doc.text(`Status: ${pedido.status_display || pedido.status}`, pageWidth / 2, y, { align: 'center' });
    y += 10;

    // Fornecedor
    doc.setDrawColor(200, 200, 200);
    doc.line(14, y, pageWidth - 14, y);
    y += 6;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('FORNECEDOR', 14, y);
    y += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (pedido.fornecedor_nome) { doc.text(`Nome: ${pedido.fornecedor_nome}`, 14, y); y += 5; }
    if (pedido.fornecedor_cnpj) { doc.text(`CNPJ: ${pedido.fornecedor_cnpj}`, 14, y); y += 5; }
    if (pedido.fornecedor_contato) { doc.text(`Contato: ${pedido.fornecedor_contato}`, 14, y); y += 5; }
    if (pedido.fornecedor_telefone) { doc.text(`Telefone: ${pedido.fornecedor_telefone}`, 14, y); y += 5; }
    if (pedido.fornecedor_email) { doc.text(`Email: ${pedido.fornecedor_email}`, 14, y); y += 5; }
    y += 4;

    // Destino
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DESTINO', 14, y);
    y += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (pedido.destino === 'PROPRIO') {
      doc.text('Uso Proprio', 14, y);
    } else {
      doc.text(`Cliente: ${pedido.cliente_nome || '-'}`, 14, y);
    }
    y += 8;

    // Items table
    const itens = pedido.itens || [];
    const tableBody = itens.map((item) => [
      item.descricao,
      item.codigo_fornecedor || '-',
      String(item.quantidade),
      item.unidade,
      formatCurrency(Number(item.valor_unitario || 0)),
      formatCurrency(Number(item.valor_total || 0)),
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Descricao', 'Cod. Forn.', 'Qtd', 'Un', 'Vlr Unit.', 'Subtotal']],
      body: tableBody,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 55 },
        2: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
      },
      theme: 'striped',
    });

    // Total
    const finalY = (doc as any).lastAutoTable?.finalY || y + 20;
    let ty = finalY + 8;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL GERAL: ${formatCurrency(Number(pedido.valor_total || 0))}`, pageWidth - 14, ty, { align: 'right' });
    ty += 10;

    // Observacoes
    if (pedido.observacoes) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('OBSERVACOES', 14, ty);
      ty += 5;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(pedido.observacoes, pageWidth - 28);
      doc.text(lines, 14, ty);
      ty += lines.length * 4 + 6;
    }

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);
    const emitido = `Emitido em ${new Date().toLocaleDateString('pt-BR')} as ${new Date().toLocaleTimeString('pt-BR')}`;
    doc.text(emitido, 14, pageHeight - 10);
    doc.text('Mandacaru NR12 ERP', pageWidth - 14, pageHeight - 10, { align: 'right' });

    doc.save(`PC-${pedido.numero}.pdf`);
  }

  // --- Item Editing ---
  function toggleEditItens() {
    if (!editingItens && pedido?.itens) {
      setEditedItens(pedido.itens.map(item => ({ ...item })));
    }
    setEditingItens(!editingItens);
  }

  function handleItemChange(index: number, field: 'valor_unitario' | 'quantidade', value: string) {
    setEditedItens(prev => {
      const updated = [...prev];
      const numValue = parseFloat(value) || 0;
      updated[index] = {
        ...updated[index],
        [field]: numValue,
        valor_total: field === 'quantidade'
          ? numValue * Number(updated[index].valor_unitario || 0)
          : Number(updated[index].quantidade || 0) * numValue,
      };
      return updated;
    });
  }

  async function handleSaveItens() {
    try {
      setActionLoading('save_itens');
      setError('');
      setSuccessMsg('');
      const itens_data = editedItens.map(item => ({
        id: item.id,
        produto: item.produto,
        descricao: item.descricao,
        codigo_fornecedor: item.codigo_fornecedor,
        quantidade: item.quantidade,
        unidade: item.unidade,
        valor_unitario: item.valor_unitario,
      }));
      const result = await pedidosCompraApi.update(id, { itens_data });
      setPedido(result);
      setEditingItens(false);
      setSuccessMsg('Itens atualizados com sucesso!');
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar itens');
    } finally {
      setActionLoading('');
    }
  }

  function getStatusColor(status: string) {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      RASCUNHO: { bg: 'bg-gray-50', text: 'text-gray-800', border: 'border-gray-300' },
      ENVIADO: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300' },
      APROVADO: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-300' },
      PARCIAL: { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-300' },
      ENTREGUE: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300' },
      CANCELADO: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-300' },
    };
    return colors[status] || colors.RASCUNHO;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-sm text-gray-500">Carregando pedido...</p>
        </div>
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 mb-3">{error || 'Pedido nao encontrado'}</p>
        <Link href="/dashboard/compras" className="text-blue-600 hover:underline">Voltar para Compras</Link>
      </div>
    );
  }

  const statusColor = getStatusColor(pedido.status);
  const canEditItens = pedido.status === 'RASCUNHO' || pedido.status === 'ENVIADO';
  const canGeneratePDF = pedido.status !== 'RASCUNHO';
  const displayItens = editingItens ? editedItens : (pedido.itens || []);
  const editedTotal = editingItens
    ? editedItens.reduce((sum, item) => sum + Number(item.valor_total || 0), 0)
    : Number(pedido.valor_total || 0);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div>
        <Link href="/dashboard/compras" className="text-sm text-gray-500 hover:text-blue-600 inline-flex items-center gap-1 mb-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar para Compras
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Pedido PC-{pedido.numero}</h1>
          <div className={`self-start px-3 py-1.5 rounded-lg border text-sm font-medium ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}>
            {pedido.status_display}
          </div>
        </div>
      </div>

      {/* Mensagens */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-sm">{error}</div>
      )}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-lg text-sm">{successMsg}</div>
      )}

      {/* Modal Receber - fullscreen no mobile */}
      {showReceber && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-md sm:rounded-lg rounded-t-2xl p-6 sm:mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Confirmar Recebimento</h3>
            <p className="text-sm text-gray-500 mb-4">
              Os itens serao automaticamente adicionados ao estoque.
            </p>
            <form onSubmit={handleReceber} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numero da Nota Fiscal</label>
                <input
                  type="text"
                  value={receberForm.numero_nf}
                  onChange={(e) => setReceberForm(prev => ({ ...prev, numero_nf: e.target.value }))}
                  placeholder="Ex: 123456"
                  className="w-full px-4 py-3 border rounded-lg text-gray-900 bg-white text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Local de Estoque</label>
                {loadingLocais ? (
                  <div className="w-full px-4 py-3 border rounded-lg text-gray-500 bg-gray-50 text-base flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    Carregando locais...
                  </div>
                ) : locaisError ? (
                  <div className="w-full px-4 py-3 border border-yellow-300 rounded-lg text-yellow-800 bg-yellow-50 text-sm">
                    {locaisError}
                    <Link href="/dashboard/almoxarifado/locais" className="block mt-1 text-blue-600 underline">
                      Ir para cadastro de locais
                    </Link>
                  </div>
                ) : (
                  <select
                    value={receberForm.local_estoque}
                    onChange={(e) => setReceberForm(prev => ({ ...prev, local_estoque: e.target.value }))}
                    className="w-full px-4 py-3 border rounded-lg text-gray-900 bg-white text-base"
                  >
                    <option value="">Selecione o local...</option>
                    {locaisEstoque.map(l => (
                      <option key={l.id} value={l.id}>{l.nome}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="submit"
                  disabled={!!actionLoading}
                  className="w-full py-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-bold text-base transition-colors"
                >
                  {actionLoading === 'receber' ? 'Processando...' : 'Confirmar Recebimento'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReceber(false)}
                  className="w-full py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Botoes de Acao - grandes e touch-friendly */}
      <div className="flex flex-col sm:flex-row gap-2">
        {pedido.status === 'RASCUNHO' && (
          <>
            <button
              onClick={() => handleAction('enviar')}
              disabled={!!actionLoading}
              className="flex-1 py-3.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm transition-colors"
            >
              {actionLoading === 'enviar' ? 'Enviando...' : 'Enviar ao Fornecedor'}
            </button>
            <button
              onClick={handleDelete}
              className="py-3.5 px-6 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-medium text-sm transition-colors"
            >
              Excluir
            </button>
          </>
        )}
        {pedido.status === 'ENVIADO' && (
          <>
            <button
              onClick={() => handleAction('aprovar')}
              disabled={!!actionLoading}
              className="flex-1 py-3.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium text-sm transition-colors"
            >
              {actionLoading === 'aprovar' ? 'Aprovando...' : 'Aprovar Pedido'}
            </button>
            <button
              onClick={openReceber}
              className="flex-1 py-3.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold text-base transition-colors"
            >
              Confirmar Recebimento
            </button>
          </>
        )}
        {pedido.status === 'APROVADO' && (
          <button
            onClick={openReceber}
            className="w-full py-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold text-lg transition-colors shadow-lg"
          >
            Confirmar Recebimento
          </button>
        )}
        {!['ENTREGUE', 'CANCELADO'].includes(pedido.status) && pedido.status !== 'RASCUNHO' && (
          <button
            onClick={() => handleAction('cancelar')}
            disabled={!!actionLoading}
            className="py-3.5 px-6 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm transition-colors"
          >
            {actionLoading === 'cancelar' ? 'Cancelando...' : 'Cancelar Pedido'}
          </button>
        )}

        {/* Gerar PDF */}
        {canGeneratePDF && (
          <button
            onClick={handleGerarPDF}
            className="py-3.5 px-6 bg-green-700 text-white rounded-lg hover:bg-green-800 font-medium text-sm transition-colors inline-flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Gerar PDF
          </button>
        )}

        {/* Editar Itens */}
        {canEditItens && !editingItens && (
          <button
            onClick={toggleEditItens}
            className="py-3.5 px-6 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 font-medium text-sm transition-colors inline-flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar Itens
          </button>
        )}
      </div>

      {/* Dados do Pedido */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 sm:px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Dados do Pedido</h2>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoItem label="Fornecedor" value={pedido.fornecedor_nome} />
            <InfoItem label="Destino">
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                pedido.destino === 'PROPRIO' ? 'bg-indigo-100 text-indigo-800' : 'bg-orange-100 text-orange-800'
              }`}>
                {pedido.destino_display}
              </span>
            </InfoItem>
            {pedido.cliente_nome && <InfoItem label="Cliente" value={pedido.cliente_nome} />}
            {pedido.equipamento_codigo && <InfoItem label="Equipamento" value={pedido.equipamento_codigo} />}
            {pedido.orcamento_numero && <InfoItem label="Orcamento" value={`#${pedido.orcamento_numero}`} />}
            {pedido.ordem_servico_numero && <InfoItem label="Ordem de Servico" value={`OS-${pedido.ordem_servico_numero}`} />}
            {pedido.local_estoque_nome && <InfoItem label="Local de Estoque" value={pedido.local_estoque_nome} />}
            <InfoItem
              label="Data do Pedido"
              value={pedido.data_pedido ? new Date(pedido.data_pedido).toLocaleDateString('pt-BR') : '-'}
            />
            {pedido.data_previsao && (
              <InfoItem
                label="Previsao de Entrega"
                value={new Date(pedido.data_previsao).toLocaleDateString('pt-BR')}
              />
            )}
            {pedido.data_entrega && (
              <InfoItem label="Data de Entrega">
                <span className="text-emerald-700 font-bold">
                  {new Date(pedido.data_entrega).toLocaleDateString('pt-BR')}
                </span>
              </InfoItem>
            )}
            {pedido.numero_nf && <InfoItem label="Nota Fiscal" value={pedido.numero_nf} />}
            <InfoItem label="Criado por" value={pedido.criado_por_nome || '-'} />
          </div>
          {pedido.observacoes && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-gray-500 mb-1">Observacoes</p>
              <p className="text-sm text-gray-900">{pedido.observacoes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Itens - cards no mobile, tabela no desktop */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 sm:px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Itens</h2>
          <div className="flex items-center gap-3">
            {editingItens && (
              <>
                <button
                  onClick={handleSaveItens}
                  disabled={actionLoading === 'save_itens'}
                  className="px-4 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium text-sm transition-colors"
                >
                  {actionLoading === 'save_itens' ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  onClick={toggleEditItens}
                  className="px-4 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 text-sm transition-colors"
                >
                  Cancelar
                </button>
              </>
            )}
            <span className="text-sm text-gray-500">{pedido.itens?.length || 0} item(ns)</span>
          </div>
        </div>

        {!pedido.itens || pedido.itens.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">Nenhum item neste pedido</div>
        ) : (
          <>
            {/* Mobile: Cards de itens */}
            <div className="divide-y divide-gray-100 lg:hidden">
              {displayItens.map((item, idx) => (
                <div key={item.id || idx} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.descricao}</p>
                      {item.produto_nome && (
                        <p className="text-xs text-gray-500">Produto: {item.produto_nome}</p>
                      )}
                      {item.codigo_fornecedor && (
                        <p className="text-xs text-gray-400">Cod: {item.codigo_fornecedor}</p>
                      )}
                    </div>
                    {item.entregue && (
                      <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium flex-shrink-0">
                        Entregue
                      </span>
                    )}
                  </div>

                  {editingItens ? (
                    <div className="space-y-2 mt-2">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-0.5">Quantidade</label>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={item.quantidade}
                            onChange={(e) => handleItemChange(idx, 'quantidade', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm text-gray-900 bg-white"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-0.5">Vlr Unitario</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.valor_unitario}
                            onChange={(e) => handleItemChange(idx, 'valor_unitario', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm text-gray-900 bg-white"
                          />
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Subtotal:</span>
                        <span className="font-bold text-gray-900">
                          {formatCurrency(Number(item.valor_total || 0))}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">
                        {item.quantidade} {item.unidade} x {formatCurrency(Number(item.valor_unitario || 0))}
                      </span>
                      <span className="font-bold text-gray-900">
                        {formatCurrency(Number(item.valor_total || 0))}
                      </span>
                    </div>
                  )}
                </div>
              ))}
              {/* Total mobile */}
              <div className="p-4 bg-gray-50 flex justify-between items-center">
                <span className="font-bold text-gray-900">TOTAL</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatCurrency(editedTotal)}
                </span>
              </div>
            </div>

            {/* Desktop: Tabela */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descricao</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cod. Forn.</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qtd</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Un</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Vlr Unit.</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Entregue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {displayItens.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="px-6 py-3 text-sm text-gray-900">
                        {item.descricao}
                        {item.produto_nome && (
                          <span className="block text-xs text-gray-500">Produto: {item.produto_nome}</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500">{item.codigo_fornecedor || '-'}</td>
                      <td className="px-6 py-3 text-sm text-gray-900 text-right">
                        {editingItens ? (
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={item.quantidade}
                            onChange={(e) => handleItemChange(idx, 'quantidade', e.target.value)}
                            className="w-20 px-2 py-1 border rounded text-sm text-right text-gray-900 bg-white"
                          />
                        ) : (
                          item.quantidade
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500">{item.unidade}</td>
                      <td className="px-6 py-3 text-sm text-gray-900 text-right">
                        {editingItens ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.valor_unitario}
                            onChange={(e) => handleItemChange(idx, 'valor_unitario', e.target.value)}
                            className="w-28 px-2 py-1 border rounded text-sm text-right text-gray-900 bg-white"
                          />
                        ) : (
                          formatCurrency(Number(item.valor_unitario || 0))
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-900 text-right font-medium">
                        {formatCurrency(Number(item.valor_total || 0))}
                      </td>
                      <td className="px-6 py-3 text-center">
                        {item.entregue ? (
                          <span className="text-emerald-600 font-medium text-sm">Sim</span>
                        ) : (
                          <span className="text-gray-400 text-sm">Nao</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50">
                    <td colSpan={5} className="px-6 py-3 text-sm font-bold text-gray-900 text-right">TOTAL:</td>
                    <td className="px-6 py-3 text-sm font-bold text-gray-900 text-right">
                      {formatCurrency(editedTotal)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function InfoItem({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      {children || <p className="text-sm font-medium text-gray-900">{value}</p>}
    </div>
  );
}
