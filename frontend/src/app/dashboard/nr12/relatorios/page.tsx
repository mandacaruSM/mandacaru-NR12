// frontend/src/app/dashboard/nr12/relatorios/page.tsx
"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Calendar,
} from "lucide-react";
import { nr12Api } from "@/lib/api";

interface Estatisticas {
  total: number;
  concluidos: number;
  em_andamento: number;
  cancelados: number;
  aprovados: number;
  aprovados_restricao: number;
  reprovados: number;
  por_equipamento: Array<{
    equipamento__codigo: string;
    equipamento__descricao: string;
    total: number;
  }>;
  por_modelo: Array<{
    modelo__nome: string;
    total: number;
  }>;
}

export default function RelatoriosPage() {
  const [stats, setStats] = useState<Estatisticas | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState("30"); // dias

  useEffect(() => {
    carregarEstatisticas();
  }, [periodo]);

  const carregarEstatisticas = async () => {
    try {
      setLoading(true);
      
      // Calcular datas
      const dataFim = new Date();
      const dataInicio = new Date();
      dataInicio.setDate(dataInicio.getDate() - Number(periodo));

      const params = {
        data_inicio: dataInicio.toISOString(),
        data_fim: dataFim.toISOString(),
      };

      const data = await nr12Api.checklists.estatisticas(params);
      setStats(data);
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    } finally {
      setLoading(false);
    }
  };

  const calcularPercentual = (valor: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((valor / total) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-900">Carregando estatísticas...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Erro ao carregar estatísticas
        </h2>
        <button
          onClick={carregarEstatisticas}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  const taxaConformidade = stats.total > 0
    ? calcularPercentual(stats.aprovados, stats.total)
    : 0;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios NR12</h1>
          <p className="text-gray-900 mt-1">Indicadores e estatísticas dos checklists</p>
        </div>

        {/* Filtro de Período */}
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-gray-400" />
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="px-4 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7">Últimos 7 dias</option>
            <option value="15">Últimos 15 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="60">Últimos 60 dias</option>
            <option value="90">Últimos 90 dias</option>
          </select>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total de Checklists */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-900">Total de Checklists</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Taxa de Conformidade */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-900">Taxa de Conformidade</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{taxaConformidade}%</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.aprovados} aprovados
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Não Conformidades */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-900">Com Restrições</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">
                {stats.aprovados_restricao}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {calcularPercentual(stats.aprovados_restricao, stats.total)}% do total
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Reprovados */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-900">Reprovados</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.reprovados}</p>
              <p className="text-xs text-gray-500 mt-1">
                {calcularPercentual(stats.reprovados, stats.total)}% do total
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Status dos Checklists */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Status dos Checklists</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Concluídos */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-800">Concluídos</span>
              <span className="text-2xl font-bold text-green-600">{stats.concluidos}</span>
            </div>
            <div className="w-full bg-green-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{
                  width: `${calcularPercentual(stats.concluidos, stats.total)}%`,
                }}
              />
            </div>
            <p className="text-xs text-green-700 mt-1">
              {calcularPercentual(stats.concluidos, stats.total)}% do total
            </p>
          </div>

          {/* Em Andamento */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-800">Em Andamento</span>
              <span className="text-2xl font-bold text-blue-600">{stats.em_andamento}</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{
                  width: `${calcularPercentual(stats.em_andamento, stats.total)}%`,
                }}
              />
            </div>
            <p className="text-xs text-blue-700 mt-1">
              {calcularPercentual(stats.em_andamento, stats.total)}% do total
            </p>
          </div>

          {/* Cancelados */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-800">Cancelados</span>
              <span className="text-2xl font-bold text-gray-900">{stats.cancelados}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gray-600 h-2 rounded-full"
                style={{
                  width: `${calcularPercentual(stats.cancelados, stats.total)}%`,
                }}
              />
            </div>
            <p className="text-xs text-gray-700 mt-1">
              {calcularPercentual(stats.cancelados, stats.total)}% do total
            </p>
          </div>
        </div>
      </div>

      {/* Resultados dos Checklists */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Distribuição de Resultados
        </h2>
        <div className="space-y-4">
          {/* Aprovados */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Aprovados</span>
              </div>
              <span className="text-sm font-bold text-gray-900">
                {stats.aprovados} ({calcularPercentual(stats.aprovados, stats.total)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-600 h-3 rounded-full transition-all duration-300"
                style={{
                  width: `${calcularPercentual(stats.aprovados, stats.total)}%`,
                }}
              />
            </div>
          </div>

          {/* Aprovados com Restrição */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium text-gray-700">
                  Aprovados com Restrição
                </span>
              </div>
              <span className="text-sm font-bold text-gray-900">
                {stats.aprovados_restricao} (
                {calcularPercentual(stats.aprovados_restricao, stats.total)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-yellow-600 h-3 rounded-full transition-all duration-300"
                style={{
                  width: `${calcularPercentual(stats.aprovados_restricao, stats.total)}%`,
                }}
              />
            </div>
          </div>

          {/* Reprovados */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="text-sm font-medium text-gray-700">Reprovados</span>
              </div>
              <span className="text-sm font-bold text-gray-900">
                {stats.reprovados} ({calcularPercentual(stats.reprovados, stats.total)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-red-600 h-3 rounded-full transition-all duration-300"
                style={{
                  width: `${calcularPercentual(stats.reprovados, stats.total)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Top Equipamentos e Modelos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Equipamentos */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Top 10 Equipamentos
            </h2>
          </div>
          <div className="space-y-3">
            {stats.por_equipamento.slice(0, 10).map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {item.equipamento__codigo}
                  </p>
                  <p className="text-xs text-gray-500">{item.equipamento__descricao}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${calcularPercentual(
                          item.total,
                          stats.por_equipamento[0].total
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-900 w-8 text-right">
                    {item.total}
                  </span>
                </div>
              </div>
            ))}
            {stats.por_equipamento.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                Nenhum dado disponível
              </p>
            )}
          </div>
        </div>

        {/* Top Modelos */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Top 10 Modelos de Checklist
            </h2>
          </div>
          <div className="space-y-3">
            {stats.por_modelo.slice(0, 10).map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{item.modelo__nome}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{
                        width: `${calcularPercentual(
                          item.total,
                          stats.por_modelo[0].total
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-900 w-8 text-right">
                    {item.total}
                  </span>
                </div>
              </div>
            ))}
            {stats.por_modelo.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                Nenhum dado disponível
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}