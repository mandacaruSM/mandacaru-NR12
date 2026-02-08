'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { orcamentosApi, type Orcamento } from '@/lib/api';

export default function OrcamentosPage() {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    tipo: '',
    status: '',
    search: '',
  });
  const [resumo, setResumo] = useState({
    total: 0,
    rascunhos: 0,
    enviados: 0,
    aprovados: 0,
    rejeitados: 0,
  });

  useEffect(() => {
    loadOrcamentos();
    loadResumo();
  }, [filters]);

  async function loadOrcamentos() {
    try {
      setLoading(true);
      const data = await orcamentosApi.list(filters);
      setOrcamentos(data.results || []);
    } catch (error) {
      console.error('Erro ao carregar orçamentos:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadResumo() {
    try {
      const data = await orcamentosApi.resumo();
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
      REJEITADO: 'bg-red-100 text-red-800',
      CANCELADO: 'bg-gray-100 text-gray-500',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }

  function getTipoBadge(tipo: string) {
    const colors: Record<string, string> = {
      MANUTENCAO_CORRETIVA: 'bg-red-100 text-red-800',
      MANUTENCAO_PREVENTIVA: 'bg-blue-100 text-blue-800',
      PRODUTO: 'bg-purple-100 text-purple-800',
    };
    return colors[tipo] || 'bg-gray-100 text-gray-800';
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orçamentos</h1>
        <Link
          href="/dashboard/orcamentos/novo"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Novo Orçamento
        </Link>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-900">Total</p>
          <p className="text-2xl font-bold text-gray-900">{resumo.total}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-900">Rascunhos</p>
          <p className="text-2xl font-bold text-gray-900">{resumo.rascunhos}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-900">Enviados</p>
          <p className="text-2xl font-bold text-blue-900">{resumo.enviados}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-900">Aprovados</p>
          <p className="text-2xl font-bold text-green-900">{resumo.aprovados}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-900">Rejeitados</p>
          <p className="text-2xl font-bold text-red-900">{resumo.rejeitados}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-3 gap-4">
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
              Tipo
            </label>
            <select
              value={filters.tipo}
              onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
              className="w-full px-3 py-2 border rounded text-black bg-white"
            >
              <option value="" className="text-black bg-white">Todos</option>
              <option value="MANUTENCAO_CORRETIVA" className="text-black bg-white">Manutenção Corretiva</option>
              <option value="MANUTENCAO_PREVENTIVA" className="text-black bg-white">Manutenção Preventiva</option>
              <option value="PRODUTO" className="text-black bg-white">Produto</option>
            </select>
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
              <option value="RASCUNHO" className="text-black bg-white">Rascunho</option>
              <option value="ENVIADO" className="text-black bg-white">Enviado</option>
              <option value="APROVADO" className="text-black bg-white">Aprovado</option>
              <option value="REJEITADO" className="text-black bg-white">Rejeitado</option>
              <option value="CANCELADO" className="text-black bg-white">Cancelado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-900">Carregando...</div>
        ) : orcamentos.length === 0 ? (
          <div className="p-8 text-center text-gray-900">Nenhum orçamento encontrado</div>
        ) : (
          <table className="min-w-full table-auto">
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
                  Equipamento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Data Emissão
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orcamentos.map((orc) => (
                <tr key={orc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {orc.numero}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${getTipoBadge(orc.tipo)}`}>
                      {orc.tipo_display}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {orc.cliente_nome}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {orc.equipamento_codigo || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    R$ {Number(orc.valor_total || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusBadge(orc.status)}`}>
                      {orc.status_display}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(orc.data_emissao!).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link
                      href={`/dashboard/orcamentos/${orc.id}`}
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
