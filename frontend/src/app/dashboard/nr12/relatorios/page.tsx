// frontend/src/app/dashboard/nr12/relatorios/page.tsx
"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Download,
  Filter,
} from "lucide-react";

interface EstatisticasGerais {
  total_checklists: number;
  total_conformes: number;
  total_nao_conformes: number;
  percentual_conformidade: number;
  checklists_por_periodo: { periodo: string; total: number }[];
}

interface VeiculoEstatistica {
  veiculo: string;
  total_checklists: number;
  nao_conformidades: number;
  percentual: number;
}

export default function RelatoriosPage() {
  const [estatisticas, setEstatisticas] = useState<EstatisticasGerais | null>(
    null
  );
  const [veiculosTop, setVeiculosTop] = useState<VeiculoEstatistica[]>([]);
  const [periodo, setPeriodo] = useState("7"); // dias
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarEstatisticas();
  }, [periodo]);

  const carregarEstatisticas = async () => {
    setLoading(true);
    try {
      const [resGerais, resVeiculos] = await Promise.all([
        fetch(`/api/nr12/relatorios/estatisticas/?periodo=${periodo}`, {
          credentials: "include",
        }),
        fetch(`/api/nr12/relatorios/veiculos-top/?periodo=${periodo}&limit=5`, {
          credentials: "include",
        }),
      ]);

      if (resGerais.ok) {
        const data = await resGerais.json();
        setEstatisticas(data);
      }

      if (resVeiculos.ok) {
        const data = await resVeiculos.json();
        setVeiculosTop(data);
      }
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportar = async () => {
    try {
      const res = await fetch(
        `/api/nr12/relatorios/exportar/?periodo=${periodo}`,
        {
          credentials: "include",
        }
      );
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `relatorio_nr12_${periodo}dias.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Erro ao exportar:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Carregando relatórios...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Relatórios NR12
          </h1>
          <p className="text-gray-600 mt-1">
            Análise e estatísticas dos checklists
          </p>
        </div>
        <button
          onClick={handleExportar}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          <Download className="w-5 h-5" />
          Exportar Excel
        </button>
      </div>

      {/* Filtro de Período */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Período:</span>
          <div className="flex gap-2">
            {["7", "30", "90", "365"].map((dias) => (
              <button
                key={dias}
                onClick={() => setPeriodo(dias)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  periodo === dias
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {dias === "7"
                  ? "7 dias"
                  : dias === "30"
                  ? "30 dias"
                  : dias === "90"
                  ? "90 dias"
                  : "1 ano"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {/* Total Checklists */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {estatisticas?.total_checklists || 0}
          </p>
          <p className="text-sm text-gray-600 mt-1">Total de Checklists</p>
        </div>

        {/* Conformes */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-600">
            {estatisticas?.total_conformes || 0}
          </p>
          <p className="text-sm text-gray-600 mt-1">Itens Conformes</p>
        </div>

        {/* Não Conformes */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-red-600">
            {estatisticas?.total_nao_conformes || 0}
          </p>
          <p className="text-sm text-gray-600 mt-1">Não Conformidades</p>
        </div>

        {/* Percentual Conformidade */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-purple-600">
            {estatisticas?.percentual_conformidade.toFixed(1) || 0}%
          </p>
          <p className="text-sm text-gray-600 mt-1">Taxa de Conformidade</p>
        </div>
      </div>

      {/* Gráfico de Evolução */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Evolução de Checklists
        </h2>
        {estatisticas?.checklists_por_periodo &&
        estatisticas.checklists_por_periodo.length > 0 ? (
          <div className="space-y-3">
            {estatisticas.checklists_por_periodo.map((item, index) => {
              const maxTotal = Math.max(
                ...estatisticas.checklists_por_periodo.map((i) => i.total)
              );
              const largura = (item.total / maxTotal) * 100;

              return (
                <div key={index} className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700 w-32">
                    {item.periodo}
                  </span>
                  <div className="flex-1 bg-gray-200 rounded-full h-8 relative">
                    <div
                      className="bg-blue-600 h-8 rounded-full flex items-center justify-end pr-3 transition-all"
                      style={{ width: `${largura}%` }}
                    >
                      <span className="text-sm font-semibold text-white">
                        {item.total}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            Nenhum dado disponível para o período selecionado
          </p>
        )}
      </div>

      {/* Top Veículos com Não Conformidades */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Veículos com Mais Não Conformidades
        </h2>
        {veiculosTop.length > 0 ? (
          <div className="space-y-4">
            {veiculosTop.map((veiculo, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {veiculo.veiculo}
                      </p>
                      <p className="text-sm text-gray-500">
                        {veiculo.total_checklists} checklist(s) realizados
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-red-600">
                      {veiculo.nao_conformidades}
                    </p>
                    <p className="text-xs text-gray-500">não conformidades</p>
                  </div>
                </div>

                {/* Barra de Progresso */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full transition-all"
                    style={{ width: `${veiculo.percentual}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 text-right">
                  {veiculo.percentual.toFixed(1)}% de não conformidade
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            Nenhum dado disponível para o período selecionado
          </p>
        )}
      </div>

      {/* Indicadores de Alerta */}
      {estatisticas && estatisticas.percentual_conformidade < 80 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6 flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-yellow-800 mb-1">
              Atenção: Taxa de conformidade abaixo do ideal
            </p>
            <p className="text-sm text-yellow-700">
              A taxa de conformidade está em{" "}
              {estatisticas.percentual_conformidade.toFixed(1)}%. Recomenda-se
              investigar os veículos com maior índice de não conformidades e
              implementar ações corretivas.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}