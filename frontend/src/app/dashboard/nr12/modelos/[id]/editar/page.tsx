// frontend/src/app/dashboard/nr12/modelos/[id]/editar/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { nr12Api, tiposEquipamentoApi, ModeloChecklist, TipoEquipamento } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";

export default function EditarModeloPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const id = params?.id as string;

  const [tipos, setTipos] = useState<TipoEquipamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [formData, setFormData] = useState({
    nome: "",
    tipo_equipamento: 0,
    descricao: "",
    periodicidade: "DIARIO" as const,
    ativo: true,
  });

  useEffect(() => {
    carregarDados();
  }, [id]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [modelo, tiposResponse] = await Promise.all([
        nr12Api.modelos.get(Number(id)),
        tiposEquipamentoApi.list(),
      ]);

      setFormData({
        nome: modelo.nome,
        tipo_equipamento: modelo.tipo_equipamento,
        descricao: modelo.descricao || "",
        periodicidade: modelo.periodicidade,
        ativo: modelo.ativo,
      });

      setTipos(tiposResponse.results || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (!formData.tipo_equipamento) {
      toast.error("Selecione um tipo de equipamento");
      return;
    }

    try {
      setSalvando(true);
      await nr12Api.modelos.update(Number(id), formData);
      toast.success("Modelo atualizado com sucesso!");
      router.push(`/dashboard/nr12/modelos/${id}`);
    } catch (error) {
      console.error("Erro ao atualizar modelo:", error);
      toast.error("Erro ao atualizar modelo");
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push(`/dashboard/nr12/modelos/${id}`)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editar Modelo</h1>
          <p className="text-gray-600 mt-1">Atualize as informações do modelo de checklist</p>
        </div>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nome */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Modelo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Ex: Checklist Diário - Escavadeira"
              className="w-full px-3 py-2 border rounded-lg text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>

          {/* Tipo de Equipamento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Equipamento <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.tipo_equipamento}
              onChange={(e) =>
                setFormData({ ...formData, tipo_equipamento: Number(e.target.value) })
              }
              className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            >
              <option value="">Selecione um tipo</option>
              {tipos.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Periodicidade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Periodicidade <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.periodicidade}
              onChange={(e) =>
                setFormData({ ...formData, periodicidade: e.target.value as any })
              }
              className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            >
              <option value="DIARIO">Diário</option>
              <option value="SEMANAL">Semanal</option>
              <option value="QUINZENAL">Quinzenal</option>
              <option value="MENSAL">Mensal</option>
            </select>
          </div>

          {/* Descrição */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição (Opcional)
            </label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Descreva o objetivo deste checklist..."
              rows={3}
              className="w-full px-3 py-2 border rounded-lg text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Status */}
          <div className="md:col-span-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.ativo}
                onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">Modelo ativo (disponível para uso)</span>
            </label>
          </div>
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => router.push(`/dashboard/nr12/modelos/${id}`)}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={salvando}
            className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed transition-colors"
          >
            {salvando ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Salvar Alterações
              </>
            )}
          </button>
        </div>
      </form>

      {/* Info */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
        <div className="flex">
          <span className="text-2xl mr-3">⚠️</span>
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Atenção</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Alterações no tipo de equipamento ou periodicidade podem afetar checklists já realizados. 
              Os itens do checklist não são alterados aqui, para gerenciá-los volte para a página de detalhes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}