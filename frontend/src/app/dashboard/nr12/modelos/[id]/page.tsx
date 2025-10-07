// frontend/src/app/dashboard/nr12/modelos/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { nr12Api } from '@/lib/api';
import type { ModeloChecklist, ItemChecklist } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';

const CATEGORIA_LABELS = {
  'VISUAL': 'Inspeção Visual',
  'FUNCIONAL': 'Teste Funcional',
  'MEDICAO': 'Medição',
  'LIMPEZA': 'Limpeza',
  'LUBRIFICACAO': 'Lubrificação',
  'DOCUMENTACAO': 'Documentação',
  'SEGURANCA': 'Segurança',
  'OUTROS': 'Outros',
};

const TIPO_RESPOSTA_LABELS = {
  'SIM_NAO': 'Sim/Não',
  'CONFORME': 'Conforme/Não Conforme',
  'NUMERO': 'Valor Numérico',
  'TEXTO': 'Texto Livre',
};

export default function DetalhesModeloPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const modeloId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [modelo, setModelo] = useState<ModeloChecklist | null>(null);
  const [itens, setItens] = useState<ItemChecklist[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newItem, setNewItem] = useState({
    ordem: 1,
    categoria: 'VISUAL' as any,
    pergunta: '',
    descricao_ajuda: '',
    tipo_resposta: 'CONFORME' as any,
    obrigatorio: true,
    requer_observacao_nao_conforme: true,
  });

  useEffect(() => {
    loadModelo();
  }, [modeloId]);

  const loadModelo = async () => {
    try {
      setLoading(true);
      const data = await nr12Api.modelos.get(modeloId);
      setModelo(data);
      
      // Carregar itens separadamente
      const itensData = await nr12Api.itens.list(modeloId);
      setItens(itensData.results);
      
      // Definir próxima ordem
      if (itensData.results.length > 0) {
        const maxOrdem = Math.max(...itensData.results.map((i: any) => i.ordem));
        setNewItem(prev => ({ ...prev, ordem: maxOrdem + 1 }));
      }
    } catch (err: any) {
      toast.error('Erro ao carregar modelo');
      router.push('/dashboard/nr12/modelos');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      await nr12Api.itens.create(modeloId, newItem);

      toast.success('Item adicionado com sucesso!');
      setShowAddItem(false);
      setNewItem({
        ordem: newItem.ordem + 1,
        categoria: 'VISUAL' as any,
        pergunta: '',
        descricao_ajuda: '',
        tipo_resposta: 'CONFORME' as any,
        obrigatorio: true,
        requer_observacao_nao_conforme: true,
      });
      loadModelo();
    } catch (err: any) {
      toast.error('Erro ao adicionar item');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: number, pergunta: string) => {
    if (!confirm(`Deseja excluir o item "${pergunta}"?`)) return;

    try {
      await nr12Api.itens.delete(modeloId, itemId);
      toast.success('Item excluído!');
      loadModelo();
    } catch (err: any) {
      toast.error('Erro ao excluir item');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
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
        <span className="text-6xl">❌</span>
        <p className="text-gray-600 mt-4">Modelo não encontrado</p>
        <Link
          href="/dashboard/nr12/modelos"
          className="inline-block mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          ← Voltar para Modelos
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/nr12/modelos"
              className="text-gray-600 hover:text-gray-900"
            >
              ← Voltar
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{modelo.nome}</h1>
              <p className="text-gray-600 mt-1">
                {modelo.tipo_equipamento_nome} • {modelo.periodicidade}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className={`px-4 py-2 rounded-lg font-semibold ${
              modelo.ativo 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {modelo.ativo ? '✓ Ativo' : '✕ Inativo'}
            </span>
            <Link
              href={`/dashboard/nr12/modelos/${modelo.id}/editar`}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              ✏️ Editar
            </Link>
          </div>
        </div>

        {modelo.descricao && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">{modelo.descricao}</p>
          </div>
        )}
      </div>

      {/* Itens do Checklist */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Itens do Checklist ({modelo.itens?.length || 0})
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Items que serão verificados durante a inspeção
              </p>
            </div>
            <button
              onClick={() => setShowAddItem(!showAddItem)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              {showAddItem ? '✕ Cancelar' : '➕ Adicionar Item'}
            </button>
          </div>
        </div>

        {/* Formulário Adicionar Item */}
        {showAddItem && (
          <form onSubmit={handleAddItem} className="p-6 bg-gray-50 border-b">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pergunta */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pergunta *
                </label>
                <input
                  type="text"
                  value={newItem.pergunta}
                  onChange={(e) => setNewItem({...newItem, pergunta: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-purple-500"
                  placeholder="Ex: Verificar estado das proteções"
                />
              </div>

              {/* Ordem */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ordem
                </label>
                <input
                  type="number"
                  value={newItem.ordem}
                  onChange={(e) => setNewItem({...newItem, ordem: Number(e.target.value)})}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 focus:ring-purple-500"
                />
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria *
                </label>
                <select
                  value={newItem.categoria}
                  onChange={(e) => setNewItem({...newItem, categoria: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 focus:ring-purple-500"
                >
                  {Object.entries(CATEGORIA_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Tipo de Resposta */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Resposta *
                </label>
                <select
                  value={newItem.tipo_resposta}
                  onChange={(e) => setNewItem({...newItem, tipo_resposta: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 focus:ring-purple-500"
                >
                  {Object.entries(TIPO_RESPOSTA_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Descrição Ajuda */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição/Ajuda
                </label>
                <textarea
                  value={newItem.descricao_ajuda}
                  onChange={(e) => setNewItem({...newItem, descricao_ajuda: e.target.value})}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-purple-500"
                  placeholder="Instruções adicionais para o operador..."
                />
              </div>

              {/* Checkboxes */}
              <div className="md:col-span-2 flex gap-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newItem.obrigatorio}
                    onChange={(e) => setNewItem({...newItem, obrigatorio: e.target.checked})}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Obrigatório</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newItem.requer_observacao_nao_conforme}
                    onChange={(e) => setNewItem({...newItem, requer_observacao_nao_conforme: e.target.checked})}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Obs. obrigatória se não conforme</span>
                </label>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddItem(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Adicionar Item'}
              </button>
            </div>
          </form>
        )}

        {/* Lista de Itens */}
        <div className="divide-y">
          {modelo.itens && modelo.itens.length > 0 ? (
            modelo.itens.map((item: any) => (
              <div key={item.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-bold text-gray-500">#{item.ordem}</span>
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                        {CATEGORIA_LABELS[item.categoria as keyof typeof CATEGORIA_LABELS]}
                      </span>
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {TIPO_RESPOSTA_LABELS[item.tipo_resposta as keyof typeof TIPO_RESPOSTA_LABELS]}
                      </span>
                      {item.obrigatorio && (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          Obrigatório
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {item.pergunta}
                    </h3>
                    {item.descricao_ajuda && (
                      <p className="text-sm text-gray-600">{item.descricao_ajuda}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteItem(item.id, item.pergunta)}
                    className="ml-4 text-red-600 hover:text-red-900"
                    title="Excluir item"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <span className="text-6xl">📝</span>
              <p className="text-gray-600 mt-4">Nenhum item cadastrado</p>
              <button
                onClick={() => setShowAddItem(true)}
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                ➕ Adicionar Primeiro Item
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}