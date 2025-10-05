// frontend/src/app/dashboard/nr12/relatorios/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { nr12Api, equipamentosApi, type Equipamento } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';

export default function RelatoriosPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  useEffect(() => {
    // Define período padrão (últimos 30 dias)
    const hoje = new Date();
    const trintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    setDataFim(hoje.toISOString().split('T')[0]);
    setDataInicio(trintaDiasAtras.toISOString().split('T')[0]);
    
    loadEquipamentos();
  }, []);

  useEffect(() => {
    if (dataInicio && dataFim) {
      loadStats();
    }
  }, [dataInicio, dataFim]);

  const loadEquipamentos = async () => {
    try {
      const response = await equipamentosApi.list();
      setEquipamentos(response.results);
    } catch (err: any) {
      console.error('Erro ao carregar equipamentos:', err);
    }
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await nr12Api.checklists.estatisticas({
        data_inicio: dataInicio,
        data_fim: dataFim,
      });
      setStats(data);
    } catch (err: any) {
      toast.error('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  const handleExportar = () => {
    toast.info('Funcionalidade de exportação em desenvolvimento');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando relatório...</p>
        </div>
      </div>
    );
  }

  const calcularPercentual = (valor: number, total: number) => {
    return total > 0 ? Math.round((valor / total) * 100) : 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Link href="/dashboard/nr12" className="hover:text-blue-600">
                NR12
              </Link>
              <span>/</span>
              <span>Relatórios</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Relatórios e Análises</h1>
            <p className="text-gray-600 mt-1">
              Visualize métricas e indicadores de segurança
            </p>
          </div>
          <button
            onClick={handleExportar}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            📊 Exportar PDF
          </button>
        </div>

        {/* Filtros de Período */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Início
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Fim
            </label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={loadStats}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Atualizar
            </button>
          </div>
        </div>
      </div>

      {/* Resumo Geral */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total de Checklists</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.total || 0}</p>
            </div>
            <div className="text-4xl">📋</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Taxa de Aprovação</p>
              <p className="text-3xl font-bold text-green-600">
                {calcularPercentual(stats?.aprovados || 0, stats?.total || 0)}%
              </p>
            </div>
            <div className="text-4xl">✅</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Não Conformidades</p>
              <p className="text-3xl font-bold text-red-600">
                {stats?.total_nao_conformidades || 0}
              </p>
            </div>
            <div className="text-4xl">⚠️</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Média por Dia</p>
              <p className="text-3xl font-bold text-blue-600">
                {stats?.media_por_dia ? stats.media_por_dia.toFixed(1) : '0.0'}
              </p>
            </div>
            <div className="text-4xl">📈</div>
          </div>
        </div>
      </div>

      {/* Distribuição por Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Distribuição por Status
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Concluídos</span>
                <span className="text-sm text-gray-600">
                  {stats?.concluidos || 0} ({calcularPercentual(stats?.concluidos || 0, stats?.total || 0)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-600 h-3 rounded-full"
                  style={{ width: `${calcularPercentual(stats?.concluidos || 0, stats?.total || 0)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Em Andamento</span>
                <span className="text-sm text-gray-600">
                  {stats?.em_andamento || 0} ({calcularPercentual(stats?.em_andamento || 0, stats?.total || 0)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full"
                  style={{ width: `${calcularPercentual(stats?.em_andamento || 0, stats?.total || 0)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Cancelados</span>
                <span className="text-sm text-gray-600">
                  {stats?.cancelados || 0} ({calcularPercentual(stats?.cancelados || 0, stats?.total || 0)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gray-600 h-3 rounded-full"
                  style={{ width: `${calcularPercentual(stats?.cancelados || 0, stats?.total || 0)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Distribuição por Resultado */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Distribuição por Resultado
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Aprovados</span>
                <span className="text-sm text-gray-600">
                  {stats?.aprovados || 0} ({calcularPercentual(stats?.aprovados || 0, stats?.concluidos || 0)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-600 h-3 rounded-full"
                  style={{ width: `${calcularPercentual(stats?.aprovados || 0, stats?.concluidos || 0)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Aprovados c/ Restrição</span>
                <span className="text-sm text-gray-600">
                  {stats?.aprovados_restricao || 0} ({calcularPercentual(stats?.aprovados_restricao || 0, stats?.concluidos || 0)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-yellow-600 h-3 rounded-full"
                  style={{ width: `${calcularPercentual(stats?.aprovados_restricao || 0, stats?.concluidos || 0)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Reprovados</span>
                <span className="text-sm text-gray-600">
                  {stats?.reprovados || 0} ({calcularPercentual(stats?.reprovados || 0, stats?.concluidos || 0)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-red-600 h-3 rounded-full"
                  style={{ width: `${calcularPercentual(stats?.reprovados || 0, stats?.concluidos || 0)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Equipamentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Top 10 Equipamentos</h2>
            <p className="text-sm text-gray-600">Equipamentos mais inspecionados</p>
          </div>
          <div className="p-6">
            {stats?.por_equipamento && stats.por_equipamento.length > 0 ? (
              <ul className="space-y-3">
                {stats.por_equipamento.slice(0, 10).map((item: any, index: number) => (
                  <li key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📊'}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {item.equipamento__codigo}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.equipamento__descricao}
                        </p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-blue-600">{item.total}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-gray-500 py-8">Nenhum dado disponível</p>
            )}
          </div>
        </div>

        {/* Top Modelos */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Top 10 Modelos</h2>
            <p className="text-sm text-gray-600">Modelos mais utilizados</p>
          </div>
          <div className="p-6">
            {stats?.por_modelo && stats.por_modelo.length > 0 ? (
              <ul className="space-y-3">
                {stats.por_modelo.slice(0, 10).map((item: any, index: number) => (
                  <li key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📝</span>
                      <p className="text-sm font-medium text-gray-900">
                        {item.modelo__nome}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-purple-600">{item.total}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-gray-500 py-8">Nenhum dado disponível</p>
            )}
          </div>
        </div>
      </div>

      {/* Indicadores de Segurança */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-400 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          💡 Indicadores de Segurança
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Índice de Conformidade</p>
            <p className="text-2xl font-bold text-green-600">
              {stats?.total > 0 
                ? Math.round((1 - (stats.total_nao_conformidades / (stats.total * 10))) * 100)
                : 0}%
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Baseado em {stats?.total || 0} checklists
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Taxa de Conclusão</p>
            <p className="text-2xl font-bold text-blue-600">
              {calcularPercentual(stats?.concluidos || 0, stats?.total || 0)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {stats?.concluidos || 0} de {stats?.total || 0} finalizados
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Equipamentos Ativos</p>
            <p className="text-2xl font-bold text-purple-600">
              {stats?.equipamentos_unicos || 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Equipamentos com pelo menos 1 checklist
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}