// frontend/src/app/dashboard/nr12/checklists/novo/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Save,
} from "lucide-react";

interface Veiculo {
  id: number;
  identificacao: string;
  placa: string;
  tipo: string;
}

interface ItemModelo {
  id: number;
  ordem: number;
  pergunta: string;
  tipo_resposta: string;
  obrigatorio: boolean;
}

interface Modelo {
  id: number;
  nome: string;
  tipo_equipamento: string;
  periodicidade: string;
  itens: ItemModelo[];
}

interface Resposta {
  item_id: number;
  resposta_conforme?: boolean;
  resposta_texto?: string;
  observacao: string;
}

export default function NovoChecklistPage() {
  const router = useRouter();

  // Estados
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [modelosFiltrados, setModelosFiltrados] = useState<Modelo[]>([]);

  const [veiculoId, setVeiculoId] = useState("");
  const [modeloId, setModeloId] = useState("");
  const [operadorNome, setOperadorNome] = useState("");
  const [observacoesGerais, setObservacoesGerais] = useState("");

  const [modeloSelecionado, setModeloSelecionado] = useState<Modelo | null>(null);
  const [respostas, setRespostas] = useState<Map<number, Resposta>>(new Map());

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    if (veiculoId) {
      const veiculo = veiculos.find((v) => v.id === parseInt(veiculoId));
      if (veiculo) {
        const filtrados = modelos.filter(
          (m) => m.tipo_equipamento === veiculo.tipo
        );
        setModelosFiltrados(filtrados);
      }
    } else {
      setModelosFiltrados([]);
    }
    setModeloId("");
    setModeloSelecionado(null);
  }, [veiculoId, veiculos, modelos]);

  useEffect(() => {
    if (modeloId) {
      const modelo = modelos.find((m) => m.id === parseInt(modeloId));
      setModeloSelecionado(modelo || null);
      setRespostas(new Map());
    } else {
      setModeloSelecionado(null);
    }
  }, [modeloId, modelos]);

  const carregarDados = async () => {
    try {
      const [resVeiculos, resModelos] = await Promise.all([
        fetch("/api/nr12/veiculos/", { credentials: "include" }),
        fetch("/api/nr12/modelos/", { credentials: "include" }),
      ]);

      if (resVeiculos.ok) {
        const dataVeiculos = await resVeiculos.json();
        setVeiculos(dataVeiculos);
      }

      if (resModelos.ok) {
        const dataModelos = await resModelos.json();
        setModelos(dataModelos);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      setErro("Erro ao carregar dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const atualizarResposta = (
    itemId: number,
    campo: keyof Resposta,
    valor: any
  ) => {
    setRespostas((prev) => {
      const novasRespostas = new Map(prev);
      const respostaAtual = novasRespostas.get(itemId) || {
        item_id: itemId,
        observacao: "",
      };
      novasRespostas.set(itemId, { ...respostaAtual, [campo]: valor });
      return novasRespostas;
    });
  };

  const validarFormulario = (): boolean => {
    if (!veiculoId || !modeloId || !operadorNome.trim()) {
      setErro("Preencha todos os campos obrigatórios.");
      return false;
    }

    if (!modeloSelecionado) {
      setErro("Selecione um modelo de checklist.");
      return false;
    }

    // Validar itens obrigatórios
    const itensObrigatorios = modeloSelecionado.itens.filter((i) => i.obrigatorio);
    for (const item of itensObrigatorios) {
      const resposta = respostas.get(item.id);
      if (!resposta) {
        setErro(`Item obrigatório não respondido: ${item.pergunta}`);
        return false;
      }
      if (
        item.tipo_resposta === "CONFORME" &&
        resposta.resposta_conforme === undefined
      ) {
        setErro(`Item obrigatório não respondido: ${item.pergunta}`);
        return false;
      }
      if (
        item.tipo_resposta === "TEXTO" &&
        !resposta.resposta_texto?.trim()
      ) {
        setErro(`Item obrigatório não respondido: ${item.pergunta}`);
        return false;
      }
    }

    return true;
  };

  const handleSalvar = async () => {
    setErro("");

    if (!validarFormulario()) {
      return;
    }

    setSalvando(true);

    try {
      const payload = {
        veiculo: parseInt(veiculoId),
        modelo: parseInt(modeloId),
        operador_nome: operadorNome.trim(),
        observacoes: observacoesGerais.trim(),
        itens: Array.from(respostas.values()),
      };

      const res = await fetch("/api/nr12/checklists/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/dashboard/nr12/checklists/${data.id}`);
      } else {
        const errorData = await res.json();
        setErro(errorData.detail || "Erro ao salvar checklist.");
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      setErro("Erro ao salvar checklist. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  };

  const calcularProgresso = () => {
    if (!modeloSelecionado) return 0;
    const total = modeloSelecionado.itens.length;
    const respondidos = Array.from(respostas.values()).filter((r) => {
      return r.resposta_conforme !== undefined || r.resposta_texto;
    }).length;
    return Math.round((respondidos / total) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <button
        onClick={() => router.push("/dashboard/nr12/checklists")}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        Voltar
      </button>

      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Realizar Novo Checklist NR12
      </h1>

      {/* Erro */}
      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800">{erro}</p>
        </div>
      )}

      {/* Formulário Principal */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Informações Básicas
        </h2>

        <div className="space-y-4">
          {/* Veículo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Veículo/Equipamento *
            </label>
            <select
              value={veiculoId}
              onChange={(e) => setVeiculoId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecione um veículo</option>
              {veiculos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.identificacao} - {v.placa} ({v.tipo})
                </option>
              ))}
            </select>
          </div>

          {/* Modelo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Modelo de Checklist *
            </label>
            <select
              value={modeloId}
              onChange={(e) => setModeloId(e.target.value)}
              disabled={!veiculoId}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">
                {veiculoId
                  ? "Selecione um modelo"
                  : "Selecione um veículo primeiro"}
              </option>
              {modelosFiltrados.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome} ({m.periodicidade})
                </option>
              ))}
            </select>
          </div>

          {/* Operador */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Operador *
            </label>
            <input
              type="text"
              value={operadorNome}
              onChange={(e) => setOperadorNome(e.target.value)}
              placeholder="Digite o nome do operador"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Observações Gerais */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observações Gerais
            </label>
            <textarea
              value={observacoesGerais}
              onChange={(e) => setObservacoesGerais(e.target.value)}
              placeholder="Observações sobre o checklist (opcional)"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Itens do Checklist */}
      {modeloSelecionado && (
        <>
          {/* Barra de Progresso */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Progresso
              </span>
              <span className="text-sm font-semibold text-blue-600">
                {calcularProgresso()}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${calcularProgresso()}%` }}
              />
            </div>
          </div>

          {/* Lista de Itens */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Itens do Checklist
            </h2>

            <div className="space-y-6">
              {modeloSelecionado.itens.map((item) => (
                <div
                  key={item.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                      {item.ordem}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {item.pergunta}
                        {item.obrigatorio && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Resposta Conforme/Não Conforme */}
                  {item.tipo_resposta === "CONFORME" && (
                    <div className="flex gap-3 mb-3">
                      <button
                        onClick={() =>
                          atualizarResposta(
                            item.id,
                            "resposta_conforme",
                            true
                          )
                        }
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition ${
                          respostas.get(item.id)?.resposta_conforme === true
                            ? "border-green-500 bg-green-50 text-green-700"
                            : "border-gray-200 hover:border-green-300"
                        }`}
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        Conforme
                      </button>
                      <button
                        onClick={() =>
                          atualizarResposta(
                            item.id,
                            "resposta_conforme",
                            false
                          )
                        }
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition ${
                          respostas.get(item.id)?.resposta_conforme === false
                            ? "border-red-500 bg-red-50 text-red-700"
                            : "border-gray-200 hover:border-red-300"
                        }`}
                      >
                        <XCircle className="w-5 h-5" />
                        Não Conforme
                      </button>
                    </div>
                  )}

                  {/* Resposta Texto */}
                  {item.tipo_resposta === "TEXTO" && (
                    <div className="mb-3">
                      <input
                        type="text"
                        value={respostas.get(item.id)?.resposta_texto || ""}
                        onChange={(e) =>
                          atualizarResposta(
                            item.id,
                            "resposta_texto",
                            e.target.value
                          )
                        }
                        placeholder="Digite sua resposta"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}

                  {/* Observação do Item */}
                  <div>
                    <textarea
                      value={respostas.get(item.id)?.observacao || ""}
                      onChange={(e) =>
                        atualizarResposta(item.id, "observacao", e.target.value)
                      }
                      placeholder="Observações sobre este item (opcional)"
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Botão Salvar */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => router.push("/dashboard/nr12/checklists")}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSalvar}
              disabled={salvando}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {salvando ? "Salvando..." : "Salvar Checklist"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}