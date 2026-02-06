'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { financeiroApi, clientesApi, ContaReceber, Cliente } from '@/lib/api';

export default function RelatorioContasReceberPage() {
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState({
    total: 0,
    abertas: 0,
    pagas: 0,
    vencidas: 0,
    total_aberto: 0,
    total_vencido: 0,
    total_recebido: 0,
  });

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');

  useEffect(() => {
    loadData();
  }, [filtroStatus, filtroCliente]);

  async function loadData() {
    try {
      setLoading(true);
      const [contasRes, clientesRes, resumoRes] = await Promise.all([
        financeiroApi.contasReceber.list({
          status: filtroStatus || undefined,
          cliente: filtroCliente ? Number(filtroCliente) : undefined,
        }),
        clientesApi.list({ page_size: 100 }),
        financeiroApi.contasReceber.resumo(),
      ]);
      setContas(contasRes.results || []);
      setClientes(clientesRes.results || []);
      setResumo(resumoRes);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'PAGA':
        return 'bg-green-100 text-green-800';
      case 'ABERTA':
        return 'bg-blue-100 text-blue-800';
      case 'VENCIDA':
        return 'bg-red-100 text-red-800';
      case 'CANCELADA':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  async function handleExportCSV() {
    let csv = 'Numero;Cliente;Tipo;Status;Vencimento;Valor Original;Valor Pago;Valor Final\n';
    contas.forEach((c) => {
      csv += `${c.numero};${c.cliente_nome};${c.tipo_display || c.tipo};${c.status_display || c.status};`;
      csv += `${c.data_vencimento};${c.valor_original};${c.valor_pago};${c.valor_final || 0}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contas-receber-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatorio de Contas a Receber</h1>
          <p className="text-sm text-gray-500 mt-1">
            Analise de recebimentos e inadimplencia
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
        >
          Exportar CSV
        </button>
      </div>

      {/* Cards Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-500">Total em Aberto</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            R$ {resumo.total_aberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-400 mt-1">{resumo.abertas} contas</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-500">Total Vencido</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            R$ {resumo.total_vencido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-400 mt-1">{resumo.vencidas} contas</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-500">Total Recebido</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            R$ {resumo.total_recebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-400 mt-1">{resumo.pagas} contas</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-500">Total de Contas</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{resumo.total}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="ABERTA">Aberta</option>
              <option value="VENCIDA">Vencida</option>
              <option value="PAGA">Paga</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <select
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome_razao}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Numero</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimento</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acao</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {contas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      Nenhuma conta encontrada
                    </td>
                  </tr>
                ) : (
                  contas.map((conta) => (
                    <tr key={conta.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{conta.numero}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{conta.cliente_nome}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{conta.tipo_display || conta.tipo}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(conta.status)}`}>
                          {conta.status_display || conta.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {new Date(conta.data_vencimento).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                        R$ {Number(conta.valor_final || conta.valor_original).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/dashboard/financeiro/contas-receber/${conta.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
