// frontend/src/app/dashboard/nr12/modelos/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { nr12Api, ModeloChecklist, ItemChecklist } from '@/lib/api';
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
  const toast = useToast();
  const modeloId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [modelo, setModelo] = useState<ModeloChecklist & { itens: ItemChecklist[] } | null>(null);
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
      
      // Definir próxima ordem
      if (data.itens && data.itens.length > 0) {
        const maxOrdem = Math.max(...data.itens.map(i => i.ordem));
        setNewItem(prev => ({ ...prev, ordem: maxOrdem + 1 }));
      }
    } catch (err: any) {
      toast.error('Erro ao carregar modelo');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      await nr12Api.itens.create({
        ...newItem,
        modelo: modeloId,
      });

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
      await nr12Api.itens.delete(itemId);
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
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
        <p className="text-red-800">Modelo não encontrado</p>
        <Link href="/dashboard/nr12/modelos" className="text-blue-600 hover:underline mt-2 inline-block">
          Voltar para lista de modelos
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Link href="/dashboard/nr12" className="hover:text-purple-600">
                NR12
              </Link>
              <span>/</span>
              <Link href="/dashboard/nr12/modelos" className="hover:text-purple-600">
                Modelos
              </Link>
              <span>/</span>
              <span>{modelo.nome}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{modelo.nome}</h1>
            <p className="text-gray-600 mt-1">{modelo.tipo_equipamento_nome}</p>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/dashboard/nr12/modelos/${modeloId}/editar`}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              ✏️ Editar Modelo
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
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Itens do Checklist</h2>
            <p className="text-sm text-gray-600">{modelo.itens?.length || 0} itens cadastrados</p>
          </div>
          <button
            onClick={() => setShowAddItem(!showAddItem)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            {showAddItem ? '✕ Cancelar' : '+ Adicionar Item'}
          </button>
        </div>

        {/* Formulário de Novo Item */}
        {showAddItem && (
          <form onSubmit={handleAddItem} className="p-6 bg-gray-50 border-b">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ordem</label>
                <input
                  type="number"
                  value={newItem.ordem}
                  onChange={(e) => setNewItem({...newItem, ordem: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <select
                  value={newItem.categoria}
                  onChange={(e) => setNewItem({...newItem, categoria: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-purple-500"
                >
                  {Object.entries(CATEGORIA_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Pergunta *</label>
                <input
                  type="text"
                  value={newItem.pergunta}
                  onChange={(e) => setNewItem({...newItem, pergunta: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-purple-500"
                  placeholder="Ex: Verificar nível de óleo do motor"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição/Ajuda</label>
                <textarea
                  value={newItem.descricao_ajuda}
                  onChange={(e) => setNewItem({...newItem, descricao_ajuda: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-purple-500"
                  rows={2}
                  placeholder="Instruções para o operador..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Resposta</label>
                <select
                  value={newItem.tipo_resposta}
                  onChange={(e) => setNewItem({...newItem, tipo_resposta: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 text-gray-900 placeholder:text-gray-500 focus:ring-purple-500"
                >
                  {Object.entries(TIPO_RESPOSTA_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-6">
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
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Adicionar Item'}
              </button>
            </div>
          </form>
        )}

        {/* Lista de Itens */}
        <div className="divide-y">
          {modelo.itens && modelo.itens.length > 0 ? (
            modelo.itens.map((item) => (
              <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg font-bold text-purple-600">#{item.ordem}</span>
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {CATEGORIA_LABELS[item.categoria]}
                      </span>
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        {TIPO_RESPOSTA_LABELS[item.tipo_resposta]}
                      </span>
                      {item.obrigatorio && (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          Obrigatório
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-medium text-gray-900 mb-1">
                      {item.pergunta}
                    </h3>

                    {item.descricao_ajuda && (
                      <p className="text-sm text-gray-600 italic">
                        💡 {item.descricao_ajuda}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteItem(item.id, item.pergunta)}
                    className="ml-4 text-red-600 hover:text-red-900 transition-colors"
                    title="Excluir item"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-gray-500">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-lg mb-2">Nenhum item cadastrado</p>
              <p className="text-sm">Clique em "+ Adicionar Item" para começar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}