// frontend/src/app/dashboard/nr12/checklists/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Clock, Filter, Search, Plus } from "lucide-react";

interface Checklist {
  id: number;
  modelo: {
    id: number;
    nome: string;
    tipo_equipamento: string;
  };
  veiculo: {
    id: number;
    identificacao: string;
    placa: string;
  };
  operador_nome: string;
  data_hora: string;
  conforme: number;
  nao_conforme: number;
  observacoes: string;
}

export default function ChecklistsPage() {
  const router = useRouter();
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<"TODOS" | "CONFORME" | "NAO_CONFORME">("TODOS");

  useEffect(() => {
    carregarChecklists();
  }, []);

  const carregarChecklists = async () => {
    try {
      const res = await fetch("/api/nr12/checklists/", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setChecklists(data);
      }
    } catch (error) {
      console.error("Erro ao carregar checklists:", error);
    } finally {
      setLoading(false);
    }
  };

  const checklistsFiltrados = checklists.filter((c) => {
    const matchFiltro =
      c.veiculo.identificacao.toLowerCase().includes(filtro.toLowerCase()) ||
      c.veiculo.placa.toLowerCase().includes(filtro.toLowerCase()) ||
      c.operador_nome.toLowerCase().includes(filtro.toLowerCase());

    const matchStatus =
      statusFiltro === "TODOS" ||
      (statusFiltro === "CONFORME" && c.nao_conforme === 0) ||
      (statusFiltro === "NAO_CONFORME" && c.nao_conforme > 0);

    return matchFiltro && matchStatus;
  });

  const getStatusColor = (checklist: Checklist) => {
    if (checklist.nao_conforme === 0) return "text-green-600 bg-green-50";
    return "text-red-600 bg-red-50";
  };

  const getStatusIcon = (checklist: Checklist) => {
    if (checklist.nao_conforme === 0)
      return <CheckCircle2 className="w-5 h-5" />;
    return <XCircle className="w-5 h-5" />;
  };

  const formatarData = (dataISO: string) => {
    const data = new Date(dataISO);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(data);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Carregando checklists...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Checklists NR12</h1>
          <p className="text-gray-600 mt-1">
            {checklists.length} checklist(s) registrado(s)
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard/nr12/checklists/novo")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          Novo Checklist
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Busca */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por veículo, placa ou operador..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filtro Status */}
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFiltro("TODOS")}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                statusFiltro === "TODOS"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFiltro("CONFORME")}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                statusFiltro === "CONFORME"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Conformes
            </button>
            <button
              onClick={() => setStatusFiltro("NAO_CONFORME")}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                statusFiltro === "NAO_CONFORME"
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Não Conformes
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Checklists */}
      {checklistsFiltrados.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Filter className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Nenhum checklist encontrado
          </h3>
          <p className="text-gray-500">
            {filtro || statusFiltro !== "TODOS"
              ? "Tente ajustar os filtros de busca"
              : "Clique em 'Novo Checklist' para começar"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {checklistsFiltrados.map((checklist) => (
            <div
              key={checklist.id}
              onClick={() =>
                router.push(`/dashboard/nr12/checklists/${checklist.id}`)
              }
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Cabeçalho */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${getStatusColor(checklist)}`}>
                      {getStatusIcon(checklist)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {checklist.veiculo.identificacao}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Placa: {checklist.veiculo.placa}
                      </p>
                    </div>
                  </div>

                  {/* Informações */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Modelo</p>
                      <p className="text-sm font-medium text-gray-900">
                        {checklist.modelo.nome}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Operador</p>
                      <p className="text-sm font-medium text-gray-900">
                        {checklist.operador_nome}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Data/Hora</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatarData(checklist.data_hora)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Resultado</p>
                      <p className="text-sm font-medium">
                        <span className="text-green-600">
                          {checklist.conforme} ✓
                        </span>
                        {" / "}
                        <span className="text-red-600">
                          {checklist.nao_conforme} ✗
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Observações */}
                  {checklist.observacoes && (
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-xs text-gray-500 mb-1">Observações</p>
                      <p className="text-sm text-gray-700">
                        {checklist.observacoes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}