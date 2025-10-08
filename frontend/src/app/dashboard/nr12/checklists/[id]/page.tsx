// frontend/src/app/dashboard/nr12/checklists/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Printer,
  Download,
} from "lucide-react";

interface ItemResposta {
  id: number;
  ordem: number;
  pergunta: string;
  tipo_resposta: string;
  resposta_texto: string | null;
  resposta_conforme: boolean | null;
  observacao: string;
}

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
    tipo: string;
  };
  operador_nome: string;
  data_hora: string;
  conforme: number;
  nao_conforme: number;
  observacoes: string;
  itens: ItemResposta[];
}

export default function ChecklistDetailPage() {
  const router = useRouter();
  const params = useParams();
  const checklistId = params?.id as string;

  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (checklistId) {
      carregarChecklist();
    }
  }, [checklistId]);

  const carregarChecklist = async () => {
    try {
      const res = await fetch(`/api/nr12/checklists/${checklistId}/`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setChecklist(data);
      } else {
        router.push("/dashboard/nr12/checklists");
      }
    } catch (error) {
      console.error("Erro ao carregar checklist:", error);
      router.push("/dashboard/nr12/checklists");
    } finally {
      setLoading(false);
    }
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

  const handleImprimir = () => {
    window.print();
  };

  const handleExportar = async () => {
    try {
      const res = await fetch(`/api/nr12/checklists/${checklistId}/exportar/`, {
        credentials: "include",
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `checklist_${checklistId}.pdf`;
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
        <div className="text-center">
          <Clock className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Carregando checklist...</p>
        </div>
      </div>
    );
  }

  if (!checklist) {
    return null;
  }

  const statusGeral = checklist.nao_conforme === 0 ? "CONFORME" : "NÃO CONFORME";
  const statusColor =
    statusGeral === "CONFORME"
      ? "bg-green-100 text-green-800"
      : "bg-red-100 text-red-800";

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Botão Voltar (não imprimir) */}
      <button
        onClick={() => router.push("/dashboard/nr12/checklists")}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 print:hidden"
      >
        <ArrowLeft className="w-5 h-5" />
        Voltar para Lista
      </button>

      {/* Cabeçalho */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Checklist NR12 #{checklist.id}
                </h1>
                <p className="text-sm text-gray-500">
                  {checklist.modelo.nome}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${statusColor}`}
              >
                {statusGeral}
              </span>
              <span className="text-sm text-gray-500">
                {checklist.conforme} conformes / {checklist.nao_conforme} não
                conformes
              </span>
            </div>
          </div>

          {/* Ações (não imprimir) */}
          <div className="flex gap-2 print:hidden">
            <button
              onClick={handleImprimir}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              title="Imprimir"
            >
              <Printer className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={handleExportar}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              title="Exportar PDF"
            >
              <Download className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Informações do Checklist */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
          <div>
            <p className="text-xs text-gray-500 mb-1">Veículo</p>
            <p className="text-sm font-semibold text-gray-900">
              {checklist.veiculo.identificacao}
            </p>
            <p className="text-xs text-gray-500">
              Placa: {checklist.veiculo.placa}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Operador</p>
            <p className="text-sm font-semibold text-gray-900">
              {checklist.operador_nome}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Data/Hora</p>
            <p className="text-sm font-semibold text-gray-900">
              {formatarData(checklist.data_hora)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Tipo Equipamento</p>
            <p className="text-sm font-semibold text-gray-900">
              {checklist.modelo.tipo_equipamento}
            </p>
          </div>
        </div>

        {/* Observações Gerais */}
        {checklist.observacoes && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2">Observações Gerais</p>
            <p className="text-sm text-gray-700 bg-gray-50 rounded p-3">
              {checklist.observacoes}
            </p>
          </div>
        )}
      </div>

      {/* Lista de Itens */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Itens do Checklist
        </h2>

        <div className="space-y-4">
          {checklist.itens.map((item) => {
            const isConforme =
              item.tipo_resposta === "CONFORME"
                ? item.resposta_conforme === true
                : false;
            const isNaoConforme =
              item.tipo_resposta === "CONFORME"
                ? item.resposta_conforme === false
                : false;

            return (
              <div
                key={item.id}
                className={`border rounded-lg p-4 ${
                  isNaoConforme
                    ? "border-red-200 bg-red-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Ícone Status */}
                  <div className="flex-shrink-0 mt-1">
                    {isConforme && (
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    )}
                    {isNaoConforme && (
                      <XCircle className="w-6 h-6 text-red-600" />
                    )}
                    {!isConforme && !isNaoConforme && (
                      <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                    )}
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <p className="font-medium text-gray-900">
                        {item.ordem}. {item.pergunta}
                      </p>
                    </div>

                    {/* Resposta */}
                    <div className="text-sm">
                      {item.tipo_resposta === "CONFORME" && (
                        <p className="text-gray-700">
                          <span className="font-semibold">Resposta:</span>{" "}
                          {item.resposta_conforme === true
                            ? "Conforme"
                            : item.resposta_conforme === false
                            ? "Não Conforme"
                            : "Não respondido"}
                        </p>
                      )}
                      {item.tipo_resposta === "TEXTO" && (
                        <p className="text-gray-700">
                          <span className="font-semibold">Resposta:</span>{" "}
                          {item.resposta_texto || "Não respondido"}
                        </p>
                      )}
                    </div>

                    {/* Observação do Item */}
                    {item.observacao && (
                      <div className="mt-2 text-sm">
                        <p className="text-gray-500 font-semibold">
                          Observação:
                        </p>
                        <p className="text-gray-700 bg-white rounded p-2 mt-1">
                          {item.observacao}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resumo Final */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Resumo da Inspeção
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-3xl font-bold text-gray-900">
              {checklist.itens.length}
            </p>
            <p className="text-sm text-gray-600 mt-1">Total de Itens</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-3xl font-bold text-green-600">
              {checklist.conforme}
            </p>
            <p className="text-sm text-gray-600 mt-1">Conformes</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-3xl font-bold text-red-600">
              {checklist.nao_conforme}
            </p>
            <p className="text-sm text-gray-600 mt-1">Não Conformes</p>
          </div>
        </div>
      </div>
    </div>
  );
}