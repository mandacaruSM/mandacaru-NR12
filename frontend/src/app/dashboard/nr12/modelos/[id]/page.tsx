// frontend/src/app/dashboard/nr12/modelos/[id]/page.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { nr12Api, ModeloChecklist, ItemChecklist } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';

const CATEGORIA_LABELS: Record<string, string> = {
  'VISUAL': 'Visual',
  'FUNCIONAL': 'Funcional',
  'MEDICAO': 'Medição',
  'LIMPEZA': 'Limpeza',
  'LUBRIFICACAO': 'Lubrificação',
  'DOCUMENTACAO': 'Documentação',
  'SEGURANCA': 'Segurança',
  'OUTROS': 'Outros',
};

const TIPO_RESPOSTA_LABELS: Record<string, string> = {
  'SIM_NAO': 'Sim/Não',
  'CONFORME': 'Conforme/Não Conforme',
  'NUMERO': 'Número',
  'TEXTO': 'Texto',
};

export default function DetalhesModeloPage() {
  const params = useParams();
  const toast = useToast();
  const modeloId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [modelo, setModelo] = useState<ModeloChecklist | null>(null);
  const [itens, setItens] = useState<ItemChecklist[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemForm, setItemForm] = useState<Partial<ItemChecklist>>({
    modelo: modeloId,
    ordem: 1,
    categoria: 'VISUAL',
    pergunta: '',
    descricao_ajuda: '',
    tipo_resposta: 'CONFORME',
    obrigatorio: true,
    requer_observacao_nao_conforme: true,
    ativo: true,
  });

  useEffect(() => {
    loadModelo();
  }, [modeloId]);

  const loadModelo = async () => {
    try {
      setLoading(true);
      const [modeloData, itensData] = await Promise.all([
        nr12Api.modelos.get(modeloId),
        nr12Api.itens.list({ modelo: modeloId }), // ✅ CORRIGIDO: Usar nr12Api.itens
      ]);
      
      setModelo(modeloData);
      setItens(itensData.results.sort((a, b) => a.ordem - b.ordem));
      
      // Atualizar ordem do próximo item
      if (itensData.results.length > 0) {
        const maxOrdem = Math.max(...itensData.results.map(i => i.ordem));
        setItemForm(prev => ({ ...prev, ordem: maxOrdem + 1 }));
      }
    } catch (err: any) {
      toast.error('Erro ao carregar modelo');
    } finally {
      setLoading(false);
    }
  };

  const handleItemFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setItemForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              name === 'ordem' ? Number(value) : value
    }));
  };

  const handleAddItem = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!itemForm.pergunta) {
      toast.error('Preencha a pergunta do item');
      return;
    }

    try {
      await nr12Api.itens.create(itemForm); // ✅ CORRIGIDO: Usar nr12Api.itens
      toast.success('Item adicionado com sucesso!');
      setShowAddItem(false);
      setItemForm({
        modelo: modeloId,
        ordem: (itens.length > 0 ? Math.max(...itens.map(i => i.ordem)) : 0) + 1,
        categoria: 'VISUAL',
        pergunta: '',
        descricao_ajuda: '',
        tipo_resposta: 'CONFORME',
        obrigatorio: true,
        requer_observacao_nao_conforme: true,
        ativo: true,
      });
      loadModelo();
    } catch (err: any) {
      toast.error('Erro ao adicionar item');
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!confirm('Deseja excluir este item?')) {
      return;
    }

    try {
      await nr12Api.itens.delete(itemId); // ✅ CORRIGIDO: Usar nr12Api.itens
      toast.success('Item excluído com sucesso!');
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
            <p className="text-sm text-gray-600">{itens.length} itens cadastrados</p>
          </div>
          <button
            onClick={() => setShowAddItem(!showAddItem)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            {showAddItem ? '✕ Cancelar' : '+ Adicionar Item'}
          </button>
        </div>

        {/* Formulário de Adicionar Item */}
        {showAddItem && (
          <div className="p-6 bg-gray-50 border-b">
            <form onSubmit={handleAddItem} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ordem *
                  </label>
                  <input
                    type="number"
                    name="ordem"
                    value={itemForm.ordem || 1}
                    onChange={handleItemFormChange}
                    required
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria *
                  </label>
                  <select
                    name="categoria"
                    value={itemForm.categoria || 'VISUAL'}
                    onChange={handleItemFormChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                  >
                    {Object.entries(CATEGORIA_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Resposta *
                  </label>
                  <select
                    name="tipo_resposta"
                    value={itemForm.tipo_resposta || 'CONFORME'}
                    onChange={handleItemFormChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                  >
                    {Object.entries(TIPO_RESPOSTA_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pergunta *
                </label>
                <input
                  type="text"
                  name="pergunta"
                  value={itemForm.pergunta || ''}
                  onChange={handleItemFormChange}
                  required
                  maxLength={200}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                  placeholder="Ex: O equipamento possui extintor de incêndio?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição/Ajuda
                </label>
                <textarea
                  name="descricao_ajuda"
                  value={itemForm.descricao_ajuda || ''}
                  onChange={handleItemFormChange}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                  placeholder="Informações adicionais para ajudar o operador"
                />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="obrigatorio"
                    checked={itemForm.obrigatorio || false}
                    onChange={handleItemFormChange}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Item obrigatório</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="requer_observacao_nao_conforme"
                    checked={itemForm.requer_observacao_nao_conforme || false}
                    onChange={handleItemFormChange}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Requer observação se não conforme</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="ativo"
                    checked={itemForm.ativo || false}
                    onChange={handleItemFormChange}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Ativo</span>
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  ✓ Adicionar Item
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de Itens */}
        <div className="p-6">
          {itens.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-gray-500 text-lg">Nenhum item cadastrado</p>
              <p className="text-gray-400 text-sm mt-2">
                Adicione itens ao checklist para começar
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {itens.map((item, index) => (
                <div
                  key={item.id}
                  className={`p-4 border-2 rounded-lg ${
                    item.ativo ? 'border-gray-200' : 'border-gray-300 bg-gray-50 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">
                          {item.ordem}
                        </span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          {CATEGORIA_LABELS[item.categoria] || item.categoria}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                          {TIPO_RESPOSTA_LABELS[item.tipo_resposta] || item.tipo_resposta}
                        </span>
                        {item.obrigatorio && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                            Obrigatório
                          </span>
                        )}
                        {!item.ativo && (
                          <span className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs">
                            Inativo
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-900 font-medium mb-1">{item.pergunta}</p>
                      
                      {item.descricao_ajuda && (
                        <p className="text-sm text-gray-600">{item.descricao_ajuda}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Link
                        href={`/dashboard/nr12/modelos/${modeloId}/itens/${item.id}/editar`}
                        className="text-purple-600 hover:text-purple-900 transition-colors"
                        title="Editar"
                      >
                        ✏️
                      </Link>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                        title="Excluir"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
        <div className="flex">
          <span className="text-2xl mr-3">💡</span>
          <div>
            <h3 className="text-sm font-medium text-blue-800">Dica</h3>
            <p className="text-sm text-blue-700 mt-1">
              A ordem dos itens define a sequência em que as perguntas aparecerão durante a 
              execução do checklist. Use números consecutivos para facilitar a organização.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}