// frontend/src/app/dashboard/nr12/checklists/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  Calendar,
  FileText,
  Wrench,
  MapPin,
  Camera,
  ExternalLink,
} from "lucide-react";
import { nr12Api, ChecklistRealizado } from "@/lib/api";

export default function ChecklistDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [checklist, setChecklist] = useState<ChecklistRealizado | null>(null);
  const [loading, setLoading] = useState(true);
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      carregarChecklist();
    }
  }, [id]);

  const carregarChecklist = async () => {
    try {
      setLoading(true);
      const data = await nr12Api.checklists.get(Number(id));
      setChecklist(data);
    } catch (error) {
      console.error("Erro ao carregar checklist:", error);
    } finally {
      setLoading(false);
    }
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

  const getStatusBadge = (status: string) => {
    const badges = {
      EM_ANDAMENTO: { color: "bg-blue-100 text-blue-800", icon: Clock, label: "Em Andamento" },
      CONCLUIDO: { color: "bg-green-100 text-green-800", icon: CheckCircle2, label: "Concluído" },
      CANCELADO: { color: "bg-gray-100 text-gray-800", icon: XCircle, label: "Cancelado" },
    };
    const badge = badges[status as keyof typeof badges];
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium ${badge.color}`}>
        <Icon className="w-4 h-4" />
        {badge.label}
      </span>
    );
  };

  const getResultadoBadge = (resultado: string | null | undefined) => {
    if (!resultado) return null;

    const badges = {
      APROVADO: { color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2, label: "Aprovado" },
      APROVADO_RESTRICAO: { color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: AlertTriangle, label: "Aprovado com Restrição" },
      REPROVADO: { color: "bg-red-100 text-red-800 border-red-200", icon: XCircle, label: "Reprovado" },
    };
    const badge = badges[resultado as keyof typeof badges];
    if (!badge) return null;

    const Icon = badge.icon;
    return (
      <div className={`flex items-center gap-3 p-4 rounded-lg border-2 ${badge.color}`}>
        <Icon className="w-8 h-8" />
        <div>
          <p className="font-medium text-sm">Resultado Final</p>
          <p className="text-lg font-bold">{badge.label}</p>
        </div>
      </div>
    );
  };

  const getCategoriaColor = (categoria: string) => {
    const colors: Record<string, string> = {
      SEGURANCA: "bg-red-100 text-red-800",
      FUNCIONAL: "bg-blue-100 text-blue-800",
      VISUAL: "bg-purple-100 text-purple-800",
      MEDICAO: "bg-green-100 text-green-800",
      LIMPEZA: "bg-cyan-100 text-cyan-800",
      LUBRIFICACAO: "bg-orange-100 text-orange-800",
      DOCUMENTACAO: "bg-gray-100 text-gray-800",
      OUTROS: "bg-pink-100 text-pink-800",
    };
    return colors[categoria] || "bg-gray-100 text-gray-800";
  };

  const getRespostaIcon = (resposta: string) => {
    const icons: Record<string, { icon: any; color: string }> = {
      CONFORME: { icon: CheckCircle2, color: "text-green-600" },
      NAO_CONFORME: { icon: XCircle, color: "text-red-600" },
      SIM: { icon: CheckCircle2, color: "text-green-600" },
      NAO: { icon: XCircle, color: "text-red-600" },
      NA: { icon: AlertTriangle, color: "text-gray-400" },
    };
    const config = icons[resposta] || icons.NA;
    const Icon = config.icon;
    return <Icon className={`w-5 h-5 ${config.color}`} />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-900">Carregando checklist...</p>
        </div>
      </div>
    );
  }

  if (!checklist) {
    return (
      <div className="text-center py-12">
        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Checklist não encontrado</h2>
        <button
          onClick={() => router.push("/dashboard/nr12/checklists")}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          Voltar para lista
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard/nr12/checklists")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Checklist #{checklist.id}
            </h1>
            <p className="text-gray-900 mt-1">{checklist.modelo_nome}</p>
          </div>
        </div>
        {getStatusBadge(checklist.status)}
      </div>

      {/* Cards de Informação */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Equipamento */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Wrench className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-900">Equipamento</p>
              <p className="font-medium text-gray-900">{checklist.equipamento_codigo || "N/A"}</p>
              <p className="text-xs text-gray-500">{checklist.equipamento_descricao || ""}</p>
            </div>
          </div>
        </div>

        {/* Operador */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <User className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-900">Operador</p>
              <p className="font-medium text-gray-900">{checklist.operador_nome_display || checklist.operador_nome || "N/A"}</p>
            </div>
          </div>
        </div>

        {/* Data/Hora */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-900">Data/Hora</p>
              <p className="font-medium text-gray-900 text-sm">
                {formatarData(checklist.data_hora_inicio)}
              </p>
            </div>
          </div>
        </div>

        {/* Origem */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <FileText className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-900">Origem</p>
              <p className="font-medium text-gray-900">{checklist.origem}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Localização GPS */}
      {checklist.latitude && checklist.longitude && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-teal-100 rounded-lg">
              <MapPin className="w-6 h-6 text-teal-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Localização GPS</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Latitude</p>
              <p className="font-mono font-medium text-gray-900">{checklist.latitude}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Longitude</p>
              <p className="font-mono font-medium text-gray-900">{checklist.longitude}</p>
            </div>
            {checklist.precisao_gps && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Precisão</p>
                <p className="font-medium text-gray-900">{checklist.precisao_gps} metros</p>
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={`https://www.google.com/maps?q=${checklist.latitude},${checklist.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Ver no Google Maps
            </a>
            {checklist.geofence_validado !== null && (
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                checklist.geofence_validado
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {checklist.geofence_validado ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Dentro da área permitida
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4" />
                    Fora da área permitida
                  </>
                )}
                {checklist.geofence_distancia && (
                  <span className="ml-1">({checklist.geofence_distancia}m do local)</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resultado */}
      {checklist.resultado_geral && (
        <div>{getResultadoBadge(checklist.resultado_geral)}</div>
      )}

      {/* Estatísticas */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Estatísticas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-3xl font-bold text-gray-900">{checklist.total_respostas || 0}</p>
            <p className="text-sm text-gray-900 mt-1">Total de Respostas</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-3xl font-bold text-green-600">
              {(checklist.total_respostas || 0) - (checklist.total_nao_conformidades || 0)}
            </p>
            <p className="text-sm text-gray-900 mt-1">Conformes</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-3xl font-bold text-red-600">{checklist.total_nao_conformidades || 0}</p>
            <p className="text-sm text-gray-900 mt-1">Não Conformidades</p>
          </div>
        </div>
      </div>

      {/* Respostas */}
      {(checklist as any).respostas && Array.isArray((checklist as any).respostas) && (checklist as any).respostas.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Respostas do Checklist</h2>
          </div>
          <div className="divide-y">
            {(checklist as any).respostas.map((resposta: any, index: number) => (
              <div key={index} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoriaColor(resposta.item_categoria)}`}>
                        {resposta.item_categoria}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900 mb-2">
                      {resposta.item_pergunta}
                    </p>
                    {resposta.observacao && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-900">
                          <strong>Observação:</strong> {resposta.observacao}
                        </p>
                      </div>
                    )}
                    {/* Foto da resposta */}
                    {resposta.foto && (
                      <div className="mt-3">
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                          <Camera className="w-4 h-4" />
                          <span>Foto anexada</span>
                        </div>
                        <button
                          onClick={() => setFotoAmpliada(resposta.foto)}
                          className="relative group"
                        >
                          <img
                            src={resposta.foto}
                            alt="Foto de evidência"
                            className="w-32 h-32 object-cover rounded-lg border border-gray-200 hover:border-blue-400 transition-colors"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center">
                            <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium">
                              Ampliar
                            </span>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getRespostaIcon(resposta.resposta)}
                    <span className="font-medium text-sm">
                      {resposta.resposta?.replace("_", " ") || "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Observações Gerais */}
      {checklist.observacoes_gerais && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Observações Gerais</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{checklist.observacoes_gerais}</p>
        </div>
      )}

      {/* Modal de foto ampliada */}
      {fotoAmpliada && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setFotoAmpliada(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setFotoAmpliada(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <XCircle className="w-8 h-8" />
            </button>
            <img
              src={fotoAmpliada}
              alt="Foto ampliada"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}