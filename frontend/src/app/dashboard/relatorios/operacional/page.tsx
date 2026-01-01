'use client';

import { useState, useEffect } from 'react';

interface RelatorioData {
  periodo: {
    data_inicio: string;
    data_fim: string;
  };
  orcamentos: {
    total: number;
    aprovados: number;
    rejeitados: number;
    valor_total: number;
    taxa_aprovacao: number;
  };
  ordens_servico: {
    total: number;
    abertas: number;
    em_execucao: number;
    concluidas: number;
    canceladas: number;
    valor_total: number;
    valor_medio: number;
    tempo_medio_execucao_dias: number | null;
  };
  manutencoes: {
    total: number;
    preventivas: number;
    corretivas: number;
    percentual_preventivas: number;
  };
  equipamentos: {
    atendidos: number;
    top_5_manutencoes: Array<{
      equipamento__id: number;
      equipamento__codigo: string;
      equipamento__descricao: string;
      total_manutencoes: number;
    }>;
  };
  tecnicos: {
    top_5_ativos: Array<{
      tecnico_responsavel__id: number;
      tecnico_responsavel__nome: string;
      total_os: number;
    }>;
  };
  graficos: {
    manutencoes_por_mes: Array<{
      mes: string;
      total: number;
    }>;
  };
  recentes: {
    ordens_servico: Array<any>;
    manutencoes: Array<any>;
  };
}

export default function RelatorioOperacionalPage() {
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState<RelatorioData | null>(null);
  const [filtros, setFiltros] = useState({
    data_inicio: '',
    data_fim: '',
  });

  useEffect(() => {
    loadRelatorio();
  }, []);

  async function loadRelatorio() {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (filtros.data_inicio) params.append('data_inicio', filtros.data_inicio);
      if (filtros.data_fim) params.append('data_fim', filtros.data_fim);

      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`/api/proxy/relatorios/operacional/${query}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar relatório');
      }

      const data = await response.json();
      setDados(data);
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleFiltrar() {
    loadRelatorio();
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-900">Carregando relatório...</div>
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="p-6">
        <div className="text-gray-900">Erro ao carregar relatório</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatório Operacional</h1>
        <p className="text-gray-900 mt-1">
          Período: {new Date(dados.periodo.data_inicio).toLocaleDateString('pt-BR')} até{' '}
          {new Date(dados.periodo.data_fim).toLocaleDateString('pt-BR')}
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Data Início
            </label>
            <input
              type="date"
              value={filtros.data_inicio}
              onChange={(e) => setFiltros({ ...filtros, data_inicio: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleFiltrar}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Filtrar
            </button>
          </div>
        </div>
      </div>

      {/* Cards de Orçamentos */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Orçamentos</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-900">Total</div>
            <div className="text-2xl font-bold text-gray-900">{dados.orcamentos.total}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-900">Aprovados</div>
            <div className="text-2xl font-bold text-green-600">{dados.orcamentos.aprovados}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-900">Rejeitados</div>
            <div className="text-2xl font-bold text-red-600">{dados.orcamentos.rejeitados}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-900">Valor Total</div>
            <div className="text-2xl font-bold text-gray-900">
              {dados.orcamentos.valor_total.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-900">Taxa Aprovação</div>
            <div className="text-2xl font-bold text-blue-600">{dados.orcamentos.taxa_aprovacao}%</div>
          </div>
        </div>
      </div>

      {/* Cards de Ordens de Serviço */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Ordens de Serviço</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-900">Total</div>
            <div className="text-2xl font-bold text-gray-900">{dados.ordens_servico.total}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-900">Abertas</div>
            <div className="text-2xl font-bold text-yellow-600">{dados.ordens_servico.abertas}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-900">Em Execução</div>
            <div className="text-2xl font-bold text-blue-600">{dados.ordens_servico.em_execucao}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-900">Concluídas</div>
            <div className="text-2xl font-bold text-green-600">{dados.ordens_servico.concluidas}</div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-900">Canceladas</div>
            <div className="text-2xl font-bold text-red-600">{dados.ordens_servico.canceladas}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-900">Valor Total</div>
            <div className="text-2xl font-bold text-gray-900">
              {dados.ordens_servico.valor_total.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-900">Valor Médio</div>
            <div className="text-2xl font-bold text-gray-900">
              {dados.ordens_servico.valor_medio.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-900">Tempo Médio (dias)</div>
            <div className="text-2xl font-bold text-gray-900">
              {dados.ordens_servico.tempo_medio_execucao_dias ?? '-'}
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Manutenções */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Manutenções</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-900">Total</div>
            <div className="text-2xl font-bold text-gray-900">{dados.manutencoes.total}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-900">Preventivas</div>
            <div className="text-2xl font-bold text-blue-600">{dados.manutencoes.preventivas}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-900">Corretivas</div>
            <div className="text-2xl font-bold text-orange-600">{dados.manutencoes.corretivas}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm text-gray-900">% Preventivas</div>
            <div className="text-2xl font-bold text-green-600">{dados.manutencoes.percentual_preventivas}%</div>
          </div>
        </div>
      </div>

      {/* Top 5 Equipamentos e Técnicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Equipamentos */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Top 5 Equipamentos (Manutenções)</h3>
          <div className="space-y-2">
            {dados.equipamentos.top_5_manutencoes.map((eq) => (
              <div key={eq.equipamento__id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div>
                  <div className="font-medium text-gray-900">{eq.equipamento__codigo}</div>
                  <div className="text-sm text-gray-900">{eq.equipamento__descricao}</div>
                </div>
                <div className="text-lg font-bold text-blue-600">{eq.total_manutencoes}</div>
              </div>
            ))}
            {dados.equipamentos.top_5_manutencoes.length === 0 && (
              <div className="text-gray-900 text-center py-4">Nenhum equipamento encontrado</div>
            )}
          </div>
        </div>

        {/* Top Técnicos */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Top 5 Técnicos (OS)</h3>
          <div className="space-y-2">
            {dados.tecnicos.top_5_ativos.map((tec) => (
              <div key={tec.tecnico_responsavel__id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div className="font-medium text-gray-900">{tec.tecnico_responsavel__nome}</div>
                <div className="text-lg font-bold text-green-600">{tec.total_os}</div>
              </div>
            ))}
            {dados.tecnicos.top_5_ativos.length === 0 && (
              <div className="text-gray-900 text-center py-4">Nenhum técnico encontrado</div>
            )}
          </div>
        </div>
      </div>

      {/* Gráfico de Manutenções por Mês */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Manutenções por Mês</h3>
        <div className="flex items-end gap-2 h-64">
          {dados.graficos.manutencoes_por_mes.map((item) => {
            const maxValue = Math.max(...dados.graficos.manutencoes_por_mes.map(d => d.total), 1);
            const heightPercentage = (item.total / maxValue) * 100;

            return (
              <div key={item.mes} className="flex-1 flex flex-col items-center">
                <div className="text-sm font-bold text-gray-900 mb-1">{item.total}</div>
                <div
                  className="w-full bg-blue-500 rounded-t"
                  style={{ height: `${heightPercentage}%` }}
                ></div>
                <div className="text-xs text-gray-900 mt-2">{item.mes}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabelas de Recentes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* OS Recentes */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Ordens de Serviço Recentes</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left text-xs font-medium text-gray-900 pb-2">Número</th>
                  <th className="text-left text-xs font-medium text-gray-900 pb-2">Cliente</th>
                  <th className="text-left text-xs font-medium text-gray-900 pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {dados.recentes.ordens_servico.map((os) => (
                  <tr key={os.id} className="border-b">
                    <td className="py-2 text-sm text-gray-900">{os.numero}</td>
                    <td className="py-2 text-sm text-gray-900">{os.cliente__nome_razao}</td>
                    <td className="py-2 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        os.status === 'CONCLUIDA' ? 'bg-green-100 text-green-800' :
                        os.status === 'EM_EXECUCAO' ? 'bg-blue-100 text-blue-800' :
                        os.status === 'ABERTA' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {os.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Manutenções Recentes */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Manutenções Recentes</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left text-xs font-medium text-gray-900 pb-2">Equipamento</th>
                  <th className="text-left text-xs font-medium text-gray-900 pb-2">Tipo</th>
                  <th className="text-left text-xs font-medium text-gray-900 pb-2">Data</th>
                </tr>
              </thead>
              <tbody>
                {dados.recentes.manutencoes.map((man, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="py-2 text-sm text-gray-900">{man.equipamento__codigo}</td>
                    <td className="py-2 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        man.tipo === 'preventiva' ? 'bg-blue-100 text-blue-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {man.tipo}
                      </span>
                    </td>
                    <td className="py-2 text-sm text-gray-900">
                      {new Date(man.data).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
