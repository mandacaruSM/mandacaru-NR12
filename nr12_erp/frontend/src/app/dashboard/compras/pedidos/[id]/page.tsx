'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { pedidosCompraApi, almoxarifadoApi, type PedidoCompra, type LocalEstoque } from '@/lib/api';

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
    if (locaisEstoque.length === 0) {
      try {
        const res = await almoxarifadoApi.locais.list();
        setLocaisEstoque(res.results || []);
      } catch {}
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
          <span className="text-sm text-gray-500">{pedido.itens?.length || 0} item(ns)</span>
        </div>

        {!pedido.itens || pedido.itens.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">Nenhum item neste pedido</div>
        ) : (
          <>
            {/* Mobile: Cards de itens */}
            <div className="divide-y divide-gray-100 lg:hidden">
              {pedido.itens.map((item) => (
                <div key={item.id} className="p-4">
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
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">
                      {item.quantidade} {item.unidade} x R$ {Number(item.valor_unitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="font-bold text-gray-900">
                      R$ {Number(item.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))}
              {/* Total mobile */}
              <div className="p-4 bg-gray-50 flex justify-between items-center">
                <span className="font-bold text-gray-900">TOTAL</span>
                <span className="text-lg font-bold text-gray-900">
                  R$ {Number(pedido.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                  {pedido.itens.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-3 text-sm text-gray-900">
                        {item.descricao}
                        {item.produto_nome && (
                          <span className="block text-xs text-gray-500">Produto: {item.produto_nome}</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500">{item.codigo_fornecedor || '-'}</td>
                      <td className="px-6 py-3 text-sm text-gray-900 text-right">{item.quantidade}</td>
                      <td className="px-6 py-3 text-sm text-gray-500">{item.unidade}</td>
                      <td className="px-6 py-3 text-sm text-gray-900 text-right">
                        R$ {Number(item.valor_unitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-900 text-right font-medium">
                        R$ {Number(item.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                      R$ {Number(pedido.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
