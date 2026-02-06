'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { financeiroApi, ContaReceber } from '@/lib/api';

export default function RelatorioInadimplenciaPage() {
  const [contasVencidas, setContasVencidas] = useState<ContaReceber[]>([]);
  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState({
    total_vencido: 0,
    total_contas: 0,
    clientes_inadimplentes: 0,
    media_dias_atraso: 0,
  });

  // Agrupamento por cliente
  const [porCliente, setPorCliente] = useState<
    { cliente: string; cliente_id: number; total: number; contas: number; dias_max: number }[]
  >([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const res = await financeiroApi.contasReceber.list({ status: 'VENCIDA' });
      const contas = res.results || [];
      setContasVencidas(contas);

      // Calcular dias de atraso e agrupar por cliente
      const hoje = new Date();
      const clientesMap = new Map<number, { cliente: string; total: number; contas: number; dias_max: number }>();
      let totalDiasAtraso = 0;

      contas.forEach((c) => {
        const vencimento = new Date(c.data_vencimento);
        const diasAtraso = Math.floor((hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24));
        totalDiasAtraso += diasAtraso;

        const clienteId = c.cliente;
        if (!clientesMap.has(clienteId)) {
          clientesMap.set(clienteId, {
            cliente: c.cliente_nome || 'N/A',
            total: 0,
            contas: 0,
            dias_max: 0,
          });
        }
        const clienteData = clientesMap.get(clienteId)!;
        clienteData.total += Number(c.valor_final || c.valor_original || 0);
        clienteData.contas += 1;
        clienteData.dias_max = Math.max(clienteData.dias_max, diasAtraso);
      });

      const clientesArray = Array.from(clientesMap.entries()).map(([id, data]) => ({
        cliente_id: id,
        ...data,
      }));
      clientesArray.sort((a, b) => b.total - a.total);
      setPorCliente(clientesArray);

      // Resumo
      setResumo({
        total_vencido: contas.reduce((acc, c) => acc + Number(c.valor_final || c.valor_original || 0), 0),
        total_contas: contas.length,
        clientes_inadimplentes: clientesMap.size,
        media_dias_atraso: contas.length > 0 ? Math.round(totalDiasAtraso / contas.length) : 0,
      });
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  function getDiasAtrasoBadge(dias: number) {
    if (dias > 90) return 'bg-red-600 text-white';
    if (dias > 60) return 'bg-red-100 text-red-800';
    if (dias > 30) return 'bg-orange-100 text-orange-800';
    return 'bg-yellow-100 text-yellow-800';
  }

  async function handleExportCSV() {
    let csv = 'Cliente;Total em Atraso;Qtd Contas;Maior Atraso (dias)\n';
    porCliente.forEach((c) => {
      csv += `${c.cliente};${c.total.toFixed(2)};${c.contas};${c.dias_max}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inadimplencia-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatorio de Inadimplencia</h1>
          <p className="text-sm text-gray-500 mt-1">
            Analise de contas em atraso por cliente
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
          <p className="text-sm font-medium text-gray-500">Total em Atraso</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            R$ {resumo.total_vencido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-500">Contas Vencidas</p>
          <p className="text-2xl font-bold text-orange-600 mt-1">{resumo.total_contas}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-500">Clientes Inadimplentes</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{resumo.clientes_inadimplentes}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm font-medium text-gray-500">Media Dias Atraso</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{resumo.media_dias_atraso} dias</p>
        </div>
      </div>

      {/* Tabela por Cliente */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Inadimplencia por Cliente</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total em Atraso</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qtd Contas</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Maior Atraso</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acao</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {porCliente.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      Nenhum cliente inadimplente encontrado
                    </td>
                  </tr>
                ) : (
                  porCliente.map((item) => (
                    <tr key={item.cliente_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.cliente}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-red-600">
                        R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-700">{item.contas}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getDiasAtrasoBadge(item.dias_max)}`}>
                          {item.dias_max} dias
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/dashboard/clientes/${item.cliente_id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Ver cliente
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

      {/* Lista de Contas Vencidas */}
      {!loading && contasVencidas.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Detalhamento das Contas Vencidas</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Numero</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimento</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Dias Atraso</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {contasVencidas.slice(0, 20).map((conta) => {
                  const diasAtraso = Math.floor(
                    (new Date().getTime() - new Date(conta.data_vencimento).getTime()) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <tr key={conta.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{conta.numero}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{conta.cliente_nome}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {new Date(conta.data_vencimento).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getDiasAtrasoBadge(diasAtraso)}`}>
                          {diasAtraso} dias
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-red-600">
                        R$ {Number(conta.valor_final || conta.valor_original).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
