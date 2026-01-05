'use client';

import { useState, useEffect } from 'react';
import { ordensServicoApi, orcamentosApi, type OrdemServico, type Orcamento } from '@/lib/api';

export default function RelatorioFaturamentoPage() {
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState({
    data_inicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    data_fim: new Date().toISOString().split('T')[0],
  });
  const [dadosFaturamento, setDadosFaturamento] = useState({
    orcamentos_aprovados: 0,
    valor_orcamentos: 0,
    ordens_concluidas: 0,
    valor_ordens: 0,
    faturamento_total: 0,
  });
  const [detalhamento, setDetalhamento] = useState<{
    mes: string;
    orcamentos: number;
    ordens: number;
    total: number;
  }[]>([]);

  useEffect(() => {
    loadRelatorio();
  }, [periodo]);

  async function loadRelatorio() {
    try {
      setLoading(true);

      // Buscar orçamentos aprovados
      const orcamentos = await orcamentosApi.list({
        status: 'APROVADO',
        data_inicio: periodo.data_inicio,
        data_fim: periodo.data_fim,
      } as any);

      // Buscar ordens concluídas
      const ordens = await ordensServicoApi.list({
        status: 'CONCLUIDA',
        data_inicio: periodo.data_inicio,
        data_fim: periodo.data_fim,
      } as any);

      const orcamentosList = orcamentos.results || [];
      const ordensList = ordens.results || [];

      const valor_orcamentos = orcamentosList.reduce((sum, o) => sum + Number(o.valor_total || 0), 0);
      const valor_ordens = ordensList.reduce((sum, o) => sum + Number(o.valor_final || 0), 0);

      setDadosFaturamento({
        orcamentos_aprovados: orcamentosList.length,
        valor_orcamentos,
        ordens_concluidas: ordensList.length,
        valor_ordens,
        faturamento_total: valor_orcamentos + valor_ordens,
      });

      // Gerar detalhamento por mês
      const mesesMap = new Map<string, { orcamentos: number; ordens: number }>();

      orcamentosList.forEach(orc => {
        if (orc.data_emissao) {
          const mes = new Date(orc.data_emissao).toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit' });
          const atual = mesesMap.get(mes) || { orcamentos: 0, ordens: 0 };
          atual.orcamentos += Number(orc.valor_total || 0);
          mesesMap.set(mes, atual);
        }
      });

      ordensList.forEach(os => {
        if (os.data_conclusao) {
          const mes = new Date(os.data_conclusao).toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit' });
          const atual = mesesMap.get(mes) || { orcamentos: 0, ordens: 0 };
          atual.ordens += Number(os.valor_final || 0);
          mesesMap.set(mes, atual);
        }
      });

      const detalhamentoArray = Array.from(mesesMap.entries()).map(([mes, valores]) => ({
        mes,
        orcamentos: valores.orcamentos,
        ordens: valores.ordens,
        total: valores.orcamentos + valores.ordens,
      })).sort((a, b) => a.mes.localeCompare(b.mes));

      setDetalhamento(detalhamentoArray);
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
            <h1 className="text-xl font-bold text-gray-900">Relatório de Faturamento</h1>
            <p className="text-sm text-gray-900 mt-1">Análise de faturamento por período</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6 no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatório de Faturamento</h1>
          <p className="text-sm text-gray-900 mt-1">Análise de faturamento por período</p>
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

      {/* Filtro de Período */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 no-print">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Período</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Data Início
            </label>
            <input
              type="date"
              value={periodo.data_inicio}
              onChange={(e) => setPeriodo({ ...periodo, data_inicio: e.target.value })}
              className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Data Fim
            </label>
            <input
              type="date"
              value={periodo.data_fim}
              onChange={(e) => setPeriodo({ ...periodo, data_fim: e.target.value })}
              className="w-full px-3 py-2 border rounded text-gray-900 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Resumo Geral */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-900">Orçamentos Aprovados</p>
          <p className="text-2xl font-bold text-gray-900">{dadosFaturamento.orcamentos_aprovados}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-900">Valor Orçamentos</p>
          <p className="text-xl font-bold text-blue-900">R$ {Number(dadosFaturamento.valor_orcamentos).toFixed(2)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-900">OS Concluídas</p>
          <p className="text-2xl font-bold text-gray-900">{dadosFaturamento.ordens_concluidas}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-900">Valor OS</p>
          <p className="text-xl font-bold text-green-900">R$ {Number(dadosFaturamento.valor_ordens).toFixed(2)}</p>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-lg shadow">
          <p className="text-sm text-white">Faturamento Total</p>
          <p className="text-2xl font-bold text-white">R$ {Number(dadosFaturamento.faturamento_total).toFixed(2)}</p>
        </div>
      </div>

      {/* Detalhamento por Mês */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="p-4 bg-gray-50 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Detalhamento por Mês</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-900">Carregando...</div>
        ) : detalhamento.length === 0 ? (
          <div className="p-8 text-center text-gray-900">Nenhum dado encontrado para o período</div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Mês/Ano
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Orçamentos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Ordens de Serviço
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {detalhamento.map((item) => (
                <tr key={item.mes}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.mes}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-900">
                    R$ {Number(item.orcamentos).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-900">
                    R$ {Number(item.ordens).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    R$ {Number(item.total).toFixed(2)}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-bold">
                <td className="px-6 py-4 text-sm text-gray-900">TOTAL</td>
                <td className="px-6 py-4 text-sm text-blue-900">
                  R$ {Number(dadosFaturamento.valor_orcamentos).toFixed(2)}
                </td>
                <td className="px-6 py-4 text-sm text-green-900">
                  R$ {Number(dadosFaturamento.valor_ordens).toFixed(2)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  R$ {Number(dadosFaturamento.faturamento_total).toFixed(2)}
                </td>
              </tr>
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
            size: A4;
          }
        }
      `}</style>
    </div>
  );
}
