'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { financeiroApi, type ContaReceber } from '@/lib/api';

export default function ContasReceberPage() {
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
  });
  const [resumo, setResumo] = useState({
    total: 0,
    abertas: 0,
    pagas: 0,
    vencidas: 0,
    valor_aberto: 0,
    valor_recebido: 0,
  });

  useEffect(() => {
    loadContas();
    loadResumo();
  }, [filters]);

  async function loadContas() {
    try {
      setLoading(true);
      const data = await financeiroApi.contasReceber.list(filters);
      setContas(data.results || []);
    } catch (error) {
      console.error('Erro ao carregar contas a receber:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadResumo() {
    try {
      const data = await financeiroApi.contasReceber.resumo();
      setResumo(data);
    } catch (error) {
      console.error('Erro ao carregar resumo:', error);
    }
  }

  function getStatusBadge(status: string) {
    const colors: Record<string, string> = {
      ABERTA: 'bg-blue-100 text-blue-800',
      PAGA: 'bg-green-100 text-green-800',
      VENCIDA: 'bg-red-100 text-red-800',
      CANCELADA: 'bg-gray-100 text-gray-500',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Contas a Receber</h1>
        <Link
          href="/dashboard/financeiro/contas-receber/nova"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Nova Conta
        </Link>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-900">Total</p>
          <p className="text-2xl font-bold text-gray-900">{resumo.total}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-900">Abertas</p>
          <p className="text-2xl font-bold text-blue-900">{resumo.abertas}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-900">Pagas</p>
          <p className="text-2xl font-bold text-green-900">{resumo.pagas}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-900">Vencidas</p>
          <p className="text-2xl font-bold text-red-900">{resumo.vencidas}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-900">Valor Aberto</p>
          <p className="text-xl font-bold text-gray-900">R$ {Number(resumo.valor_aberto || 0).toFixed(2)}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Buscar
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Número, cliente, descrição..."
              className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border rounded text-black bg-white"
            >
              <option value="" className="text-black bg-white">Todos</option>
              <option value="ABERTA" className="text-black bg-white">Aberta</option>
              <option value="PAGA" className="text-black bg-white">Paga</option>
              <option value="VENCIDA" className="text-black bg-white">Vencida</option>
              <option value="CANCELADA" className="text-black bg-white">Cancelada</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-900">Carregando...</div>
        ) : contas.length === 0 ? (
          <div className="p-8 text-center text-gray-900">Nenhuma conta a receber encontrada</div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Número
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Origem
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Vencimento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {contas.map((conta) => (
                <tr key={conta.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {conta.numero}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {conta.tipo_display}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {conta.cliente_nome}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {conta.orcamento_numero || conta.ordem_servico_numero || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(conta.data_vencimento).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    R$ {Number(conta.valor_final || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusBadge(conta.status)}`}>
                      {conta.status_display}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link
                      href={`/dashboard/financeiro/contas-receber/${conta.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
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
