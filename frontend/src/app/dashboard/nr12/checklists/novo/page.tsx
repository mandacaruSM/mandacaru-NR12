// frontend/src/app/dashboard/nr12/checklists/novo/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, CheckCircle2 } from "lucide-react";
import {
  nr12Api,
  equipamentosApi,
  ModeloChecklist,
  Equipamento,
  ItemChecklist,
  RespostaItem,
} from "@/lib/api";

export default function NovoChecklistPage() {
  const router = useRouter();

  // Estados
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [modelos, setModelos] = useState<ModeloChecklist[]>([]);
  const [itens, setItens] = useState<ItemChecklist[]>([]);

  const [equipamentoSelecionado, setEquipamentoSelecionado] = useState<number | null>(null);
  const [modeloSelecionado, setModeloSelecionado] = useState<number | null>(null);
  const [leituraEquipamento, setLeituraEquipamento] = useState("");
  const [respostas, setRespostas] = useState<Record<number, RespostaItem>>({});
  const [observacoesGerais, setObservacoesGerais] = useState("");

  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Carregar equipamentos e modelos
  useEffect(() => {
    carregarDados();
  }, []);

  // Carregar itens quando selecionar modelo
  useEffect(() => {
    if (modeloSelecionado) {
      carregarItens();
    }
  }, [modeloSelecionado]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [eqResponse, modResponse] = await Promise.all([
        equipamentosApi.list({ ativo: true }),
        nr12Api.modelos.list({ ativo: true }),
      ]);

      setEquipamentos(eqResponse.results || []);
      setModelos(modResponse.results || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      alert("Erro ao carregar dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const carregarItens = async () => {
    if (!modeloSelecionado) return;

    try {
      const modelo = await nr12Api.modelos.get(modeloSelecionado);
      setItens(modelo.itens || []);
    } catch (error) {
      console.error("Erro ao carregar itens:", error);
      alert("Erro ao carregar itens do checklist.");
    }
  };

  const handleRespostaChange = (itemId: number, resposta: string) => {
    setRespostas((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        item_checklist: itemId,
        resposta: resposta,
      },
    }));
  };

  const handleObservacaoChange = (itemId: number, observacao: string) => {
    setRespostas((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        item_checklist: itemId,
        observacao: observacao,
      },
    }));
  };

  const validarFormulario = () => {
    if (!equipamentoSelecionado) {
      alert("Selecione um equipamento");
      return false;
    }

    if (!modeloSelecionado) {
      alert("Selecione um modelo de checklist");
      return false;
    }

    // Verificar itens obrigatórios
    const itensObrigatorios = itens.filter((item) => item.obrigatorio && item.id);
    const respostasObrigatorias = itensObrigatorios.filter((item) => item.id && respostas[item.id]?.resposta);

    if (respostasObrigatorias.length < itensObrigatorios.length) {
      alert("Responda todos os itens obrigatórios");
      return false;
    }

    return true;
  };

  const handleSalvar = async () => {
    if (!validarFormulario()) return;

    try {
      setSalvando(true);

      // Criar checklist
      const checklistData = {
        modelo: modeloSelecionado!,
        equipamento: equipamentoSelecionado!,
        origem: "WEB" as const,
        leitura_equipamento: leituraEquipamento || null,
        observacoes_gerais: observacoesGerais,
        respostas: Object.values(respostas).filter((r) => r.resposta),
      };

      const checklist = await nr12Api.checklists.create(checklistData);

      // Finalizar checklist
      await nr12Api.checklists.finalizar(checklist.id);

      alert("Checklist salvo com sucesso!");
      router.push(`/dashboard/nr12/checklists/${checklist.id}`);
    } catch (error) {
      console.error("Erro ao salvar checklist:", error);
      alert("Erro ao salvar checklist. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  };

  const getCategoriaColor = (categoria: string) => {
    const colors: Record<string, string> = {
      SEGURANCA: "bg-red-100 text-red-800 border-red-200",
      FUNCIONAL: "bg-blue-100 text-blue-800 border-blue-200",
      VISUAL: "bg-purple-100 text-purple-800 border-purple-200",
      MEDICAO: "bg-green-100 text-green-800 border-green-200",
      LIMPEZA: "bg-cyan-100 text-cyan-800 border-cyan-200",
      LUBRIFICACAO: "bg-orange-100 text-orange-800 border-orange-200",
      DOCUMENTACAO: "bg-gray-100 text-gray-800 border-gray-200",
      OUTROS: "bg-pink-100 text-pink-800 border-pink-200",
    };
    return colors[categoria] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const renderCampoResposta = (item: ItemChecklist) => {
    if (!item.id) return null;
    
    const itemId = item.id;
    const resposta = respostas[itemId]?.resposta || "";

    switch (item.tipo_resposta) {
      case "SIM_NAO":
        return (
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`item_${itemId}`}
                value="SIM"
                checked={resposta === "SIM"}
                onChange={(e) => handleRespostaChange(itemId, e.target.value)}
                className="w-4 h-4 text-green-600 focus:ring-green-500"
              />
              <span className="text-sm font-medium text-green-700">Sim</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`item_${itemId}`}
                value="NAO"
                checked={resposta === "NAO"}
                onChange={(e) => handleRespostaChange(itemId, e.target.value)}
                className="w-4 h-4 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm font-medium text-red-700">Não</span>
            </label>
          </div>
        );

      case "CONFORME":
        return (
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`item_${itemId}`}
                value="CONFORME"
                checked={resposta === "CONFORME"}
                onChange={(e) => handleRespostaChange(itemId, e.target.value)}
                className="w-4 h-4 text-green-600 focus:ring-green-500"
              />
              <span className="text-sm font-medium text-green-700">Conforme</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`item_${itemId}`}
                value="NAO_CONFORME"
                checked={resposta === "NAO_CONFORME"}
                onChange={(e) => handleRespostaChange(itemId, e.target.value)}
                className="w-4 h-4 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm font-medium text-red-700">Não Conforme</span>
            </label>
          </div>
        );

      case "NUMERO":
        return (
          <input
            type="number"
            value={resposta}
            onChange={(e) => handleRespostaChange(itemId, e.target.value)}
            placeholder="Digite o valor"
            className="w-full max-w-xs px-3 py-2 border rounded-lg text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );

      case "TEXTO":
        return (
          <textarea
            value={resposta}
            onChange={(e) => handleRespostaChange(itemId, e.target.value)}
            placeholder="Digite sua resposta"
            rows={3}
            className="w-full px-3 py-2 border rounded-lg text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );

      default:
        return null;
    }
  };

  const progresso = itens.length > 0
    ? Math.round((Object.keys(respostas).length / itens.length) * 100)
    : 0;

  return (
    <div className="space-y-6 pb-8">
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
            <h1 className="text-2xl font-bold text-gray-900">Novo Checklist NR12</h1>
            <p className="text-gray-600 mt-1">Preencha as informações e respostas</p>
          </div>
        </div>
        <button
          onClick={handleSalvar}
          disabled={salvando || !equipamentoSelecionado || !modeloSelecionado}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {salvando ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Salvar Checklist
            </>
          )}
        </button>
      </div>

      {/* Barra de Progresso */}
      {itens.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progresso</span>
            <span className="text-sm font-medium text-gray-700">{progresso}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>
      )}

      {/* Formulário Principal */}
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">Informações Básicas</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Equipamento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Equipamento <span className="text-red-500">*</span>
            </label>
            <select
              value={equipamentoSelecionado || ""}
              onChange={(e) => setEquipamentoSelecionado(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            >
              <option value="">Selecione um equipamento</option>
              {equipamentos.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.codigo} - {eq.descricao}
                </option>
              ))}
            </select>
          </div>

          {/* Modelo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Modelo de Checklist <span className="text-red-500">*</span>
            </label>
            <select
              value={modeloSelecionado || ""}
              onChange={(e) => setModeloSelecionado(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            >
              <option value="">Selecione um modelo</option>
              {modelos.map((modelo) => (
                <option key={modelo.id} value={modelo.id}>
                  {modelo.nome} ({modelo.periodicidade})
                </option>
              ))}
            </select>
          </div>

          {/* Leitura do Equipamento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Leitura do Equipamento (Horímetro/Odômetro)
            </label>
            <input
              type="text"
              value={leituraEquipamento}
              onChange={(e) => setLeituraEquipamento(e.target.value)}
              placeholder="Ex: 12345"
              className="w-full px-3 py-2 border rounded-lg text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Itens do Checklist */}
      {itens.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
              Itens do Checklist ({itens.length})
            </h2>
          </div>
          <div className="divide-y">
            {itens.map((item, index) => {
              if (!item.id) return null;
              
              const itemId = item.id;
              
              return (
              <div key={itemId} className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getCategoriaColor(item.categoria)}`}>
                        {item.categoria}
                      </span>
                      {item.obrigatorio && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                          Obrigatório
                        </span>
                      )}
                      <span className="text-sm text-gray-500">Item {index + 1}</span>
                    </div>
                    <p className="font-medium text-gray-900 mb-3">{item.pergunta}</p>
                    {item.descricao_ajuda && (
                      <p className="text-sm text-gray-600 mb-3">{item.descricao_ajuda}</p>
                    )}

                    {renderCampoResposta(item)}

                    {/* Observação */}
                    {((item.requer_observacao_nao_conforme &&
                      (respostas[itemId]?.resposta === "NAO_CONFORME" ||
                        respostas[itemId]?.resposta === "NAO")) ||
                      !item.requer_observacao_nao_conforme) && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Observação {item.requer_observacao_nao_conforme && respostas[itemId]?.resposta === "NAO_CONFORME" ? "(Obrigatória)" : "(Opcional)"}
                        </label>
                        <textarea
                          value={respostas[itemId]?.observacao || ""}
                          onChange={(e) => handleObservacaoChange(itemId, e.target.value)}
                          placeholder="Adicione observações sobre este item..."
                          rows={2}
                          className="w-full px-3 py-2 border rounded-lg text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )})}
          </div>
        </div>
      )}

      {/* Observações Gerais */}
      <div className="bg-white rounded-lg shadow p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Observações Gerais (Opcional)
        </label>
        <textarea
          value={observacoesGerais}
          onChange={(e) => setObservacoesGerais(e.target.value)}
          placeholder="Adicione observações gerais sobre o checklist..."
          rows={4}
          className="w-full px-3 py-2 border rounded-lg text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Botão Salvar (Fixo no rodapé em mobile) */}
      <div className="sticky bottom-0 bg-white border-t p-4 -mx-6 mt-6 flex justify-end gap-3">
        <button
          onClick={() => router.push("/dashboard/nr12/checklists")}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSalvar}
          disabled={salvando || !equipamentoSelecionado || !modeloSelecionado}
          className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {salvando ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Salvando...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Finalizar Checklist
            </>
          )}
        </button>
      </div>
    </div>
  );
}