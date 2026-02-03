'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { pedidosCompraApi, type PedidoCompra } from '@/lib/api';

export default function ComprasPage() {
  const [pedidos, setPedidos] = useState<PedidoCompra[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', destino: '', search: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [resumo, setResumo] = useState({
    total: 0, rascunhos: 0, enviados: 0, aprovados: 0, entregues: 0, cancelados: 0, valor_total_pendente: 0,
  });

  useEffect(() => {
    loadPedidos();
    loadResumo();
  }, [filters]);

  async function loadPedidos() {
    try {
      setLoading(true);
      const data = await pedidosCompraApi.list(filters);
      setPedidos(data.results || []);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadResumo() {
    try {
      const data = await pedidosCompraApi.resumo();
      setResumo(data);
    } catch (error) {
      console.error('Erro ao carregar resumo:', error);
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

  const activeFilterCount = [filters.status, filters.destino, filters.search].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Compras</h1>
        <div className="flex gap-2">
          <Link
            href="/dashboard/compras/fornecedores"
            className="flex-1 sm:flex-none text-center bg-gray-600 text-white px-4 py-3 sm:py-2 rounded-lg hover:bg-gray-700 text-sm font-medium"
          >
            Fornecedores
          </Link>
          <Link
            href="/dashboard/compras/pedidos/novo"
            className="flex-1 sm:flex-none text-center bg-blue-600 text-white px-4 py-3 sm:py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            Novo Pedido
          </Link>
        </div>
      </div>

      {/* Cards de Resumo - scroll horizontal no mobile */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-4 xl:grid-cols-7">
        <div className="min-w-[120px] bg-white p-3 rounded-lg shadow flex-shrink-0">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-xl font-bold text-gray-900">{resumo.total}</p>
        </div>
        <div className="min-w-[120px] bg-white p-3 rounded-lg shadow flex-shrink-0">
          <p className="text-xs text-gray-500">Rascunhos</p>
          <p className="text-xl font-bold text-gray-500">{resumo.rascunhos}</p>
        </div>
        <div className="min-w-[120px] bg-white p-3 rounded-lg shadow flex-shrink-0">
          <p className="text-xs text-gray-500">Enviados</p>
          <p className="text-xl font-bold text-blue-600">{resumo.enviados}</p>
        </div>
        <div className="min-w-[120px] bg-white p-3 rounded-lg shadow flex-shrink-0">
          <p className="text-xs text-gray-500">Aprovados</p>
          <p className="text-xl font-bold text-green-600">{resumo.aprovados}</p>
        </div>
        <div className="min-w-[120px] bg-white p-3 rounded-lg shadow flex-shrink-0">
          <p className="text-xs text-gray-500">Entregues</p>
          <p className="text-xl font-bold text-emerald-600">{resumo.entregues}</p>
        </div>
        <div className="min-w-[120px] bg-white p-3 rounded-lg shadow flex-shrink-0">
          <p className="text-xs text-gray-500">Cancelados</p>
          <p className="text-xl font-bold text-red-500">{resumo.cancelados}</p>
        </div>
        <div className="min-w-[140px] bg-white p-3 rounded-lg shadow flex-shrink-0">
          <p className="text-xs text-gray-500">Valor Pendente</p>
          <p className="text-lg font-bold text-orange-600">
            R$ {Number(resumo.valor_total_pendente || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Busca + toggle filtros */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Buscar por numero, fornecedor, NF..."
              className="flex-1 px-3 py-3 border rounded-lg text-gray-900 bg-white text-sm"
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-3 border rounded-lg text-sm font-medium transition-colors ${
                activeFilterCount > 0 ? 'bg-blue-50 border-blue-300 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              {activeFilterCount > 0 && (
                <span className="ml-1 text-xs bg-blue-600 text-white rounded-full w-4 h-4 inline-flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-lg text-gray-900 bg-white text-sm"
                >
                  <option value="">Todos os status</option>
                  <option value="RASCUNHO">Rascunho</option>
                  <option value="ENVIADO">Enviado</option>
                  <option value="APROVADO">Aprovado</option>
                  <option value="ENTREGUE">Entregue</option>
                  <option value="CANCELADO">Cancelado</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Destino</label>
                <select
                  value={filters.destino}
                  onChange={(e) => setFilters({ ...filters, destino: e.target.value })}
                  className="w-full px-3 py-2.5 border rounded-lg text-gray-900 bg-white text-sm"
                >
                  <option value="">Todos os destinos</option>
                  <option value="PROPRIO">Compra Propria</option>
                  <option value="CLIENTE">Encaminhar p/ Cliente</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lista de Pedidos - Cards no mobile, tabela no desktop */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-sm text-gray-500">Carregando pedidos...</p>
        </div>
      ) : pedidos.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">Nenhum pedido de compra encontrado</p>
          <Link href="/dashboard/compras/pedidos/novo" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
            Criar primeiro pedido
          </Link>
        </div>
      ) : (
        <>
          {/* Mobile: Cards */}
          <div className="space-y-3 lg:hidden">
            {pedidos.map((p) => (
              <Link
                key={p.id}
                href={`/dashboard/compras/pedidos/${p.id}`}
                className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow active:bg-gray-50"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-sm font-bold text-gray-900">PC-{p.numero}</span>
                    <p className="text-sm text-gray-600">{p.fornecedor_nome}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(p.status)}`}>
                    {p.status_display}
                  </span>
                </div>
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs ${p.destino === 'PROPRIO' ? 'bg-indigo-100 text-indigo-800' : 'bg-orange-100 text-orange-800'}`}>
                      {p.destino_display}
                    </span>
                    {p.cliente_nome && (
                      <p className="text-xs text-gray-500">{p.cliente_nome}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">
                      R$ {Number(p.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {p.data_pedido ? new Date(p.data_pedido).toLocaleDateString('pt-BR') : ''}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop: Tabela */}
          <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Numero</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fornecedor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destino</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pedidos.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">PC-{p.numero}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{p.fornecedor_nome}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${p.destino === 'PROPRIO' ? 'bg-indigo-100 text-indigo-800' : 'bg-orange-100 text-orange-800'}`}>
                        {p.destino_display}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{p.cliente_nome || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">
                      R$ {Number(p.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(p.status)}`}>
                        {p.status_display}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {p.data_pedido ? new Date(p.data_pedido).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Link href={`/dashboard/compras/pedidos/${p.id}`} className="text-blue-600 hover:text-blue-800">
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
