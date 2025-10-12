// frontend/src/app/dashboard/nr12/modelos/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Plus, Trash2, GripVertical, Edit2, Save, X } from "lucide-react";
import { nr12Api, ModeloChecklist, ItemChecklist } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";

const CATEGORIAS = [
  { value: "VISUAL", label: "Visual", color: "bg-purple-100 text-purple-800" },
  { value: "FUNCIONAL", label: "Funcional", color: "bg-blue-100 text-blue-800" },
  { value: "MEDICAO", label: "Medição", color: "bg-green-100 text-green-800" },
  { value: "LIMPEZA", label: "Limpeza", color: "bg-cyan-100 text-cyan-800" },
  { value: "LUBRIFICACAO", label: "Lubrificação", color: "bg-orange-100 text-orange-800" },
  { value: "DOCUMENTACAO", label: "Documentação", color: "bg-gray-100 text-gray-800" },
  { value: "SEGURANCA", label: "Segurança", color: "bg-red-100 text-red-800" },
  { value: "OUTROS", label: "Outros", color: "bg-pink-100 text-pink-800" },
];

const TIPOS_RESPOSTA = [
  { value: "SIM_NAO", label: "Sim/Não" },
  { value: "CONFORME", label: "Conforme/Não Conforme" },
  { value: "NUMERO", label: "Número" },
  { value: "TEXTO", label: "Texto" },
];

const PERIODICIDADE_LABELS: Record<string, string> = {
  DIARIO: "Diário",
  SEMANAL: "Semanal",
  QUINZENAL: "Quinzenal",
  MENSAL: "Mensal",
};

export default function ModeloDetailPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const id = params?.id as string;

  const [modelo, setModelo] = useState<ModeloChecklist | null>(null);
  const [itens, setItens] = useState<ItemChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [editandoItem, setEditandoItem] = useState<number | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<ItemChecklist>>({
    ordem: 1,
    categoria: "VISUAL",
    pergunta: "",
    descricao_ajuda: "",
    tipo_resposta: "CONFORME",
    obrigatorio: true,
    requer_observacao_nao_conforme: true,
    ativo: true,
  });

  useEffect(() => {
    if (id) {
      carregarModelo();
    }
  }, [id]);

  const carregarModelo = async () => {
    try {
      setLoading(true);
      const data = await nr12Api.modelos.get(Number(id));
      setModelo(data);
      setItens(data.itens || []);
    } catch (error) {
      console.error("Erro ao carregar modelo:", error);
      toast.error("Erro ao carregar modelo");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.pergunta?.trim()) {
      toast.error("Pergunta é obrigatória");
      return;
    }

    try {
      // Preparar dados para envio (SEM o campo modelo, pois é definido pelo backend)
      const novaOrdem = itens.length > 0 ? Math.max(...itens.map((i) => i.ordem)) + 1 : 1;
      
      const dadosLimpos = {
        ordem: editandoItem ? formData.ordem : novaOrdem,
        categoria: formData.categoria,
        pergunta: formData.pergunta.trim(),
        tipo_resposta: formData.tipo_resposta,
        obrigatorio: formData.obrigatorio ?? true,
        requer_observacao_nao_conforme: formData.requer_observacao_nao_conforme ?? true,
        ativo: true,
      };

      // Adicionar descricao_ajuda apenas se tiver conteúdo
      if (formData.descricao_ajuda?.trim()) {
        dadosLimpos.descricao_ajuda = formData.descricao_ajuda.trim();
      }

      if (editandoItem) {
        // Atualizar item existente
        console.log("Atualizando item:", dadosLimpos);
        await nr12Api.modelos.itens.update(Number(id), editandoItem, dadosLimpos);
        toast.success("Item atualizado com sucesso!");
      } else {
        // Criar novo item
        console.log("Criando item:", dadosLimpos);
        await nr12Api.modelos.itens.create(Number(id), dadosLimpos);
        toast.success("Item adicionado com sucesso!");
      }

      carregarModelo();
      resetForm();
    } catch (error: any) {
      console.error("Erro detalhado ao salvar item:", error);
      const mensagemErro = error?.message || "Erro ao salvar item";
      toast.error(mensagemErro);
    }
  };

  const handleEdit = (item: ItemChecklist) => {
    setFormData(item);
    setEditandoItem(item.id || null);
    setMostrarFormulario(true);
  };

  const handleDelete = async (itemId: number) => {
    if (!confirm("Deseja excluir este item?")) return;

    try {
      await nr12Api.modelos.itens.delete(Number(id), itemId);
      toast.success("Item excluído com sucesso!");
      carregarModelo();
    } catch (error) {
      console.error("Erro ao excluir item:", error);
      toast.error("Erro ao excluir item");
    }
  };

  const resetForm = () => {
    setFormData({
      ordem: 1,
      categoria: "VISUAL",
      pergunta: "",
      descricao_ajuda: "",
      tipo_resposta: "CONFORME",
      obrigatorio: true,
      requer_observacao_nao_conforme: true,
      ativo: true,
    });
    setEditandoItem(null);
    setMostrarFormulario(false);
  };

  const getCategoriaColor = (categoria: string) => {
    return CATEGORIAS.find((c) => c.value === categoria)?.color || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando modelo...</p>
        </div>
      </div>
    );
  }

  if (!modelo) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Modelo não encontrado</h2>
        <button
          onClick={() => router.push("/dashboard/nr12/modelos")}
          className="mt-4 text-purple-600 hover:text-purple-800"
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
            onClick={() => router.push("/dashboard/nr12/modelos")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{modelo.nome}</h1>
            <p className="text-gray-600 mt-1">
              {modelo.tipo_equipamento_nome} • {PERIODICIDADE_LABELS[modelo.periodicidade]} • {itens.length} itens
            </p>
          </div>
        </div>
        <button
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          {mostrarFormulario ? (
            <>
              <X className="w-5 h-5" />
              Cancelar
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              Novo Item
            </>
          )}
        </button>
      </div>

      {/* Formulário de Item */}
      {mostrarFormulario && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editandoItem ? "Editar Item" : "Novo Item"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Categoria */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoria <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  {CATEGORIAS.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo de Resposta */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Resposta <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.tipo_resposta}
                  onChange={(e) => setFormData({ ...formData, tipo_resposta: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  {TIPOS_RESPOSTA.map((tipo) => (
                    <option key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pergunta */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pergunta <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.pergunta}
                onChange={(e) => setFormData({ ...formData, pergunta: e.target.value })}
                placeholder="Ex: O equipamento está em boas condições?"
                className="w-full px-3 py-2 border rounded-lg text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>

            {/* Descrição de Ajuda */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição de Ajuda (Opcional)
              </label>
              <textarea
                value={formData.descricao_ajuda}
                onChange={(e) => setFormData({ ...formData, descricao_ajuda: e.target.value })}
                placeholder="Informações adicionais para ajudar no preenchimento..."
                rows={2}
                className="w-full px-3 py-2 border rounded-lg text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Checkboxes */}
            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.obrigatorio}
                  onChange={(e) => setFormData({ ...formData, obrigatorio: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">Item obrigatório</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.requer_observacao_nao_conforme}
                  onChange={(e) =>
                    setFormData({ ...formData, requer_observacao_nao_conforme: e.target.checked })
                  }
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">Exigir observação em não conformidade</span>
              </label>
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                {editandoItem ? "Atualizar" : "Adicionar"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Itens */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Itens do Checklist ({itens.length})
          </h2>
        </div>

        {itens.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-gray-500 text-lg mb-4">Nenhum item cadastrado</p>
            <button
              onClick={() => setMostrarFormulario(true)}
              className="text-purple-600 hover:text-purple-800 font-medium"
            >
              Adicione o primeiro item
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {itens
              .sort((a, b) => a.ordem - b.ordem)
              .map((item) => (
                <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Número de Ordem */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-purple-600 font-bold">{item.ordem}</span>
                      </div>
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoriaColor(item.categoria)}`}>
                          {CATEGORIAS.find((c) => c.value === item.categoria)?.label}
                        </span>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {TIPOS_RESPOSTA.find((t) => t.value === item.tipo_resposta)?.label}
                        </span>
                        {item.obrigatorio && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                            Obrigatório
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-gray-900 mb-1">{item.pergunta}</p>
                      {item.descricao_ajuda && (
                        <p className="text-sm text-gray-600">{item.descricao_ajuda}</p>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => item.id && handleDelete(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Info */}
      {itens.length > 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
          <div className="flex">
            <span className="text-2xl mr-3">💡</span>
            <div>
              <h3 className="text-sm font-medium text-blue-800">Dica</h3>
              <p className="text-sm text-blue-700 mt-1">
                Os itens são apresentados na ordem definida. Você pode reordenar os itens editando o número de ordem.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}