'use client';

import { useState, useEffect } from 'react';
import { ordensServicoApi, type OrdemServico } from '@/lib/api';

export default function RelatorioOrdensServicoPage() {
  const [loading, setLoading] = useState(true);
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [filtros, setFiltros] = useState<any>({
    data_inicio: '',
    data_fim: '',
    status: '',
    cliente: '',
  });
  const [resumo, setResumo] = useState({
    total: 0,
    abertas: 0,
    em_execucao: 0,
    concluidas: 0,
    canceladas: 0,
    valor_total: 0,
  });

  useEffect(() => {
    loadRelatorio();
  }, [filtros]);

  async function loadRelatorio() {
    try {
      setLoading(true);
      const data = await ordensServicoApi.list(filtros);
      setOrdens(data.results || []);

      // Calcular resumo
      const total = data.results?.length || 0;
      const abertas = data.results?.filter(os => os.status === 'ABERTA').length || 0;
      const em_execucao = data.results?.filter(os => os.status === 'EM_EXECUCAO').length || 0;
      const concluidas = data.results?.filter(os => os.status === 'CONCLUIDA').length || 0;
      const canceladas = data.results?.filter(os => os.status === 'CANCELADA').length || 0;
      const valor_total = data.results?.reduce((sum, os) => sum + Number(os.valor_final || 0), 0) || 0;

      setResumo({
        total,
        abertas,
        em_execucao,
        concluidas,
        canceladas,
        valor_total,
      });
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleImprimir() {
    window.print();
  }

  return (
    <div className="p-6">
      {/* Cabeçalho com Logo - visível apenas na impressão */}
      <div className="hidden print:block mb-6">
        <div className="flex justify-between items-start border-b-2 border-blue-600 pb-4 mb-6">
          <div>
            <img
              src="/logo.png"
              alt="Logo da Empresa"
              className="w-48 h-auto max-h-20 object-contain"
            />
          </div>
          <div className="text-right">
            <h1 className="text-xl font-bold text-gray-900">Relatório de Ordens de Serviço</h1>
            <p className="text-sm text-gray-900 mt-1">Análise completa de ordens de serviço</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6 no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatório de Ordens de Serviço</h1>
          <p className="text-sm text-gray-900 mt-1">Análise completa de ordens de serviço</p>
        </div>
        <button
          onClick={handleImprimir}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimir
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 no-print">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filtros</h2>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Data Início
            </label>
            <input
              type="date"
              value={filtros.data_inicio}
              onChange={(e) => setFiltros({ ...filtros, data_inicio: e.target.value })}
              className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Data Fim
            </label>
            <input
              type="date"
              value={filtros.data_fim}
              onChange={(e) => setFiltros({ ...filtros, data_fim: e.target.value })}
              className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Status
            </label>
            <select
              value={filtros.status}
              onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
              className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
            >
              <option value="">Todos</option>
              <option value="ABERTA">Aberta</option>
              <option value="EM_EXECUCAO">Em Execução</option>
              <option value="CONCLUIDA">Concluída</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Cliente
            </label>
            <input
              type="text"
              value={filtros.cliente}
              onChange={(e) => setFiltros({ ...filtros, cliente: e.target.value })}
              placeholder="Buscar cliente..."
              className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-6 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-900">Total</p>
          <p className="text-2xl font-bold text-gray-900">{resumo.total}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-900">Abertas</p>
          <p className="text-2xl font-bold text-blue-900">{resumo.abertas}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-900">Em Execução</p>
          <p className="text-2xl font-bold text-yellow-900">{resumo.em_execucao}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-900">Concluídas</p>
          <p className="text-2xl font-bold text-green-900">{resumo.concluidas}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-900">Canceladas</p>
          <p className="text-2xl font-bold text-red-900">{resumo.canceladas}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-900">Valor Total</p>
          <p className="text-xl font-bold text-gray-900">R$ {Number(resumo.valor_total).toFixed(2)}</p>
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
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Equipamento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Data Abertura
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Valor
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {ordens.map((os) => (
                <tr key={os.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {os.numero}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {os.cliente_nome}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {os.equipamento_codigo || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {os.data_abertura ? new Date(os.data_abertura).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {os.status_display}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    R$ {Number(os.valor_final || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          @page {
            margin: 2cm;
            size: A4 landscape;
          }
        }
      `}</style>
    </div>
  );
}
