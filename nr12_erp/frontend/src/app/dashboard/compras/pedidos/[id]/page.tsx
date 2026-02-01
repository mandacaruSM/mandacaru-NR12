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
      let result: PedidoCompra;

      switch (action) {
        case 'enviar':
          result = await pedidosCompraApi.enviar(id);
          break;
        case 'aprovar':
          result = await pedidosCompraApi.aprovar(id);
          break;
        case 'cancelar':
          if (!confirm('Deseja realmente cancelar este pedido?')) return;
          result = await pedidosCompraApi.cancelar(id);
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

  function getStatusBadge(status: string) {
    const colors: Record<string, string> = {
      RASCUNHO: 'bg-gray-100 text-gray-800',
      ENVIADO: 'bg-blue-100 text-blue-800',
      APROVADO: 'bg-green-100 text-green-800',
      PARCIAL: 'bg-yellow-100 text-yellow-800',
      ENTREGUE: 'bg-emerald-100 text-emerald-800',
      CANCELADO: 'bg-red-100 text-red-500',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }

  if (loading) return <div className="p-6 text-center text-gray-900">Carregando...</div>;
  if (!pedido) return <div className="p-6 text-center text-red-600">{error || 'Pedido nao encontrado'}</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedido PC-{pedido.numero}</h1>
          <Link href="/dashboard/compras" className="text-sm text-blue-600 hover:underline">
            &larr; Voltar para Compras
          </Link>
        </div>
        <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusBadge(pedido.status)}`}>
          {pedido.status_display}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded mb-4">{error}</div>
      )}

      {/* Acoes */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-3 flex-wrap">
        {pedido.status === 'RASCUNHO' && (
          <>
            <button onClick={() => handleAction('enviar')} disabled={!!actionLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm">
              {actionLoading === 'enviar' ? 'Enviando...' : 'Enviar ao Fornecedor'}
            </button>
            <button onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
              Excluir Pedido
            </button>
          </>
        )}
        {pedido.status === 'ENVIADO' && (
          <>
            <button onClick={() => handleAction('aprovar')} disabled={!!actionLoading}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm">
              {actionLoading === 'aprovar' ? 'Aprovando...' : 'Aprovar'}
            </button>
            <button onClick={openReceber}
              className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-sm">
              Registrar Recebimento
            </button>
          </>
        )}
        {pedido.status === 'APROVADO' && (
          <button onClick={openReceber}
            className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-sm">
            Registrar Recebimento
          </button>
        )}
        {!['ENTREGUE', 'CANCELADO'].includes(pedido.status) && (
          <button onClick={() => handleAction('cancelar')} disabled={!!actionLoading}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 text-sm">
            {actionLoading === 'cancelar' ? 'Cancelando...' : 'Cancelar Pedido'}
          </button>
        )}
      </div>

      {/* Modal Receber */}
      {showReceber && (
        <div className="bg-white rounded-lg shadow p-6 mb-6 border-2 border-emerald-300">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Registrar Recebimento</h3>
          <form onSubmit={handleReceber} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Numero da NF</label>
                <input type="text" value={receberForm.numero_nf}
                  onChange={(e) => setReceberForm(prev => ({ ...prev, numero_nf: e.target.value }))}
                  className="w-full px-3 py-2 border rounded text-gray-900 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Local de Estoque</label>
                <select value={receberForm.local_estoque}
                  onChange={(e) => setReceberForm(prev => ({ ...prev, local_estoque: e.target.value }))}
                  className="w-full px-3 py-2 border rounded text-black bg-white">
                  <option value="">Selecione...</option>
                  {locaisEstoque.map(l => (
                    <option key={l.id} value={l.id}>{l.nome}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={!!actionLoading}
                className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 text-sm">
                {actionLoading === 'receber' ? 'Processando...' : 'Confirmar Recebimento'}
              </button>
              <button type="button" onClick={() => setShowReceber(false)}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 text-sm">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Dados do Pedido */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Dados do Pedido</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-500">Fornecedor</p>
            <p className="text-sm font-medium text-gray-900">{pedido.fornecedor_nome}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Destino</p>
            <p className="text-sm font-medium text-gray-900">
              <span className={`px-2 py-0.5 rounded text-xs ${pedido.destino === 'PROPRIO' ? 'bg-indigo-100 text-indigo-800' : 'bg-orange-100 text-orange-800'}`}>
                {pedido.destino_display}
              </span>
            </p>
          </div>
          {pedido.cliente_nome && (
            <div>
              <p className="text-xs text-gray-500">Cliente</p>
              <p className="text-sm font-medium text-gray-900">{pedido.cliente_nome}</p>
            </div>
          )}
          {pedido.equipamento_codigo && (
            <div>
              <p className="text-xs text-gray-500">Equipamento</p>
              <p className="text-sm font-medium text-gray-900">{pedido.equipamento_codigo}</p>
            </div>
          )}
          {pedido.orcamento_numero && (
            <div>
              <p className="text-xs text-gray-500">Orcamento</p>
              <p className="text-sm font-medium text-gray-900">#{pedido.orcamento_numero}</p>
            </div>
          )}
          {pedido.local_estoque_nome && (
            <div>
              <p className="text-xs text-gray-500">Local de Estoque</p>
              <p className="text-sm font-medium text-gray-900">{pedido.local_estoque_nome}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500">Data do Pedido</p>
            <p className="text-sm font-medium text-gray-900">
              {pedido.data_pedido ? new Date(pedido.data_pedido).toLocaleDateString('pt-BR') : '-'}
            </p>
          </div>
          {pedido.data_previsao && (
            <div>
              <p className="text-xs text-gray-500">Previsao de Entrega</p>
              <p className="text-sm font-medium text-gray-900">
                {new Date(pedido.data_previsao).toLocaleDateString('pt-BR')}
              </p>
            </div>
          )}
          {pedido.data_entrega && (
            <div>
              <p className="text-xs text-gray-500">Data de Entrega</p>
              <p className="text-sm font-medium text-emerald-700 font-bold">
                {new Date(pedido.data_entrega).toLocaleDateString('pt-BR')}
              </p>
            </div>
          )}
          {pedido.numero_nf && (
            <div>
              <p className="text-xs text-gray-500">Nota Fiscal</p>
              <p className="text-sm font-medium text-gray-900">{pedido.numero_nf}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500">Criado por</p>
            <p className="text-sm font-medium text-gray-900">{pedido.criado_por_nome || '-'}</p>
          </div>
        </div>
        {pedido.observacoes && (
          <div className="mt-4">
            <p className="text-xs text-gray-500">Observacoes</p>
            <p className="text-sm text-gray-900">{pedido.observacoes}</p>
          </div>
        )}
      </div>

      {/* Itens */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Itens ({pedido.itens?.length || 0})</h2>
        </div>
        {!pedido.itens || pedido.itens.length === 0 ? (
          <div className="p-6 text-center text-gray-500">Nenhum item</div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Descricao</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Cod. Forn.</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Qtd</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Un</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Vlr Unit.</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Subtotal</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Entregue</th>
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
                  <td className="px-6 py-3 text-sm text-gray-900">{item.codigo_fornecedor || '-'}</td>
                  <td className="px-6 py-3 text-sm text-gray-900 text-right">{item.quantidade}</td>
                  <td className="px-6 py-3 text-sm text-gray-900">{item.unidade}</td>
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
        )}
      </div>
    </div>
  );
}
