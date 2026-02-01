'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { pedidosCompraApi, type PedidoCompra } from '@/lib/api';

export default function ComprasPage() {
  const [pedidos, setPedidos] = useState<PedidoCompra[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', destino: '', search: '' });
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Compras</h1>
        <div className="flex gap-3">
          <Link
            href="/dashboard/compras/fornecedores"
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Fornecedores
          </Link>
          <Link
            href="/dashboard/compras/pedidos/novo"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Novo Pedido
          </Link>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Total</p>
          <p className="text-2xl font-bold text-gray-900">{resumo.total}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Rascunhos</p>
          <p className="text-2xl font-bold text-gray-500">{resumo.rascunhos}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Enviados</p>
          <p className="text-2xl font-bold text-blue-600">{resumo.enviados}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Aprovados</p>
          <p className="text-2xl font-bold text-green-600">{resumo.aprovados}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Entregues</p>
          <p className="text-2xl font-bold text-emerald-600">{resumo.entregues}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Cancelados</p>
          <p className="text-2xl font-bold text-red-500">{resumo.cancelados}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Valor Pendente</p>
          <p className="text-lg font-bold text-orange-600">R$ {Number(resumo.valor_total_pendente || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Buscar</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Numero, fornecedor, NF..."
              className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border rounded text-black bg-white"
            >
              <option value="">Todos</option>
              <option value="RASCUNHO">Rascunho</option>
              <option value="ENVIADO">Enviado</option>
              <option value="APROVADO">Aprovado</option>
              <option value="ENTREGUE">Entregue</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Destino</label>
            <select
              value={filters.destino}
              onChange={(e) => setFilters({ ...filters, destino: e.target.value })}
              className="w-full px-3 py-2 border rounded text-black bg-white"
            >
              <option value="">Todos</option>
              <option value="PROPRIO">Compra Propria</option>
              <option value="CLIENTE">Encaminhar p/ Cliente</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-900">Carregando...</div>
        ) : pedidos.length === 0 ? (
          <div className="p-8 text-center text-gray-900">Nenhum pedido de compra encontrado</div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Numero</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Fornecedor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Destino</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Valor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pedidos.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    PC-{p.numero}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{p.fornecedor_nome}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <span className={`px-2 py-1 rounded text-xs ${p.destino === 'PROPRIO' ? 'bg-indigo-100 text-indigo-800' : 'bg-orange-100 text-orange-800'}`}>
                      {p.destino_display}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{p.cliente_nome || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    R$ {Number(p.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusBadge(p.status)}`}>
                      {p.status_display}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {p.data_pedido ? new Date(p.data_pedido).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link href={`/dashboard/compras/pedidos/${p.id}`} className="text-blue-600 hover:text-blue-900">
                      Ver Detalhes
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
