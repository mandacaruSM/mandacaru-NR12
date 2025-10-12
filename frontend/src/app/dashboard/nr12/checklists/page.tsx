// frontend/src/app/dashboard/nr12/checklists/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Plus, 
  Search,
  Filter,
  Eye
} from "lucide-react";
import { nr12Api, ChecklistRealizado } from "@/lib/api";

export default function ChecklistsPage() {
  const router = useRouter();
  const [checklists, setChecklists] = useState<ChecklistRealizado[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<string>("TODOS");
  const [resultadoFiltro, setResultadoFiltro] = useState<string>("TODOS");

  useEffect(() => {
    carregarChecklists();
  }, [statusFiltro, resultadoFiltro]);

  const carregarChecklists = async () => {
    try {
      setLoading(true);
      const params: any = {};
      
      if (statusFiltro !== "TODOS") {
        params.status = statusFiltro;
      }
      if (resultadoFiltro !== "TODOS") {
        params.resultado = resultadoFiltro;
      }

      const response = await nr12Api.checklists.list(params);
      setChecklists(response.results || []);
    } catch (error) {
      console.error("Erro ao carregar checklists:", error);
    } finally {
      setLoading(false);
    }
  };

  const checklistsFiltrados = checklists.filter((checklist) =>
    (checklist.equipamento_codigo?.toLowerCase() || "").includes(filtro.toLowerCase()) ||
    (checklist.modelo_nome?.toLowerCase() || "").includes(filtro.toLowerCase()) ||
    (checklist.operador_nome?.toLowerCase() || "").includes(filtro.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const badges = {
      EM_ANDAMENTO: { color: "bg-blue-100 text-blue-800", icon: Clock, label: "Em Andamento" },
      CONCLUIDO: { color: "bg-green-100 text-green-800", icon: CheckCircle2, label: "Concluído" },
      CANCELADO: { color: "bg-gray-100 text-gray-800", icon: XCircle, label: "Cancelado" },
    };
    const badge = badges[status as keyof typeof badges] || badges.EM_ANDAMENTO;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  const getResultadoBadge = (resultado: string | null | undefined) => {
    if (!resultado) return null;

    const badges = {
      APROVADO: { color: "bg-green-100 text-green-800", icon: CheckCircle2, label: "Aprovado" },
      APROVADO_RESTRICAO: { color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle, label: "Aprovado c/ Restrição" },
      REPROVADO: { color: "bg-red-100 text-red-800", icon: XCircle, label: "Reprovado" },
    };
    const badge = badges[resultado as keyof typeof badges];
    if (!badge) return null;

    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Checklists NR12</h1>
          <p className="text-gray-600 mt-1">Gerenciar checklists realizados</p>
        </div>
        <button
          onClick={() => router.push("/dashboard/nr12/checklists/novo")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Checklist
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Busca */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por equipamento, modelo ou operador..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filtro Status */}
          <div>
            <select
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="TODOS">Todos os Status</option>
              <option value="EM_ANDAMENTO">Em Andamento</option>
              <option value="CONCLUIDO">Concluído</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>

          {/* Filtro Resultado */}
          <div>
            <select
              value={resultadoFiltro}
              onChange={(e) => setResultadoFiltro(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="TODOS">Todos os Resultados</option>
              <option value="APROVADO">Aprovado</option>
              <option value="APROVADO_RESTRICAO">Aprovado c/ Restrição</option>
              <option value="REPROVADO">Reprovado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando checklists...</p>
        </div>
      ) : checklistsFiltrados.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Filter className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum checklist encontrado
          </h3>
          <p className="text-gray-600 mb-4">
            {filtro
              ? "Tente ajustar os filtros de busca"
              : "Comece criando um novo checklist"}
          </p>
          {!filtro && (
            <button
              onClick={() => router.push("/dashboard/nr12/checklists/novo")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Criar Primeiro Checklist
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Equipamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Modelo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Operador
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data/Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resultado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Não Conformidades
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {checklistsFiltrados.map((checklist) => (
                  <tr key={checklist.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {checklist.equipamento_codigo || "N/A"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {checklist.equipamento_descricao || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{checklist.modelo_nome || "-"}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{checklist.operador_nome || "-"}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatarData(checklist.data_hora_inicio)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(checklist.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getResultadoBadge(checklist.resultado_geral)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {(checklist.total_nao_conformidades || 0) > 0 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {checklist.total_nao_conformidades}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => router.push(`/dashboard/nr12/checklists/${checklist.id}`)}
                        className="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        Ver Detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rodapé com contadores */}
      {!loading && checklistsFiltrados.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Mostrando <strong>{checklistsFiltrados.length}</strong> de{" "}
              <strong>{checklists.length}</strong> checklists
            </span>
          </div>
        </div>
      )}
    </div>
  );
}