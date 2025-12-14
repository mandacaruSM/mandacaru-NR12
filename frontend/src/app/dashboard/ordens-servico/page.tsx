'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ordensServicoApi, type OrdemServico } from '@/lib/api';

export default function OrdensServicoPage() {
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
  });
  const [resumo, setResumo] = useState({
    total: 0,
    abertas: 0,
    em_execucao: 0,
    concluidas: 0,
    canceladas: 0,
  });

  useEffect(() => {
    loadOrdens();
    loadResumo();
  }, [filters]);

  async function loadOrdens() {
    try {
      setLoading(true);
      const data = await ordensServicoApi.list(filters);
      setOrdens(data.results || []);
    } catch (error) {
      console.error('Erro ao carregar ordens de serviço:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadResumo() {
    try {
      const data = await ordensServicoApi.resumo();
      setResumo(data);
    } catch (error) {
      console.error('Erro ao carregar resumo:', error);
    }
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ordens de Serviço</h1>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Total</p>
          <p className="text-2xl font-bold text-gray-900">{resumo.total}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Abertas</p>
          <p className="text-2xl font-bold text-blue-900">{resumo.abertas}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Em Execução</p>
          <p className="text-2xl font-bold text-yellow-900">{resumo.em_execucao}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Concluídas</p>
          <p className="text-2xl font-bold text-green-900">{resumo.concluidas}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Canceladas</p>
          <p className="text-2xl font-bold text-gray-900">{resumo.canceladas}</p>
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
              placeholder="Número, cliente, orçamento..."
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
              <option value="EM_EXECUCAO" className="text-black bg-white">Em Execução</option>
              <option value="CONCLUIDA" className="text-black bg-white">Concluída</option>
              <option value="CANCELADA" className="text-black bg-white">Cancelada</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-900">Carregando...</div>
        ) : ordens.length === 0 ? (
          <div className="p-8 text-center text-gray-900">Nenhuma ordem de serviço encontrada</div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Número
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Orçamento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Equipamento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Técnico
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Data Prevista
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {ordens.map((os) => (
                <tr key={os.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {os.numero}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {os.orcamento_numero}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {os.cliente_nome}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {os.equipamento_codigo || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {os.tecnico_nome || 'Não atribuído'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    R$ {Number(os.valor_final || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusBadge(os.status)}`}>
                      {os.status_display}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(os.data_prevista).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link
                      href={`/dashboard/ordens-servico/${os.id}`}
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
