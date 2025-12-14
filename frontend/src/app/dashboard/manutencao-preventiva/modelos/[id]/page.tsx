// frontend/src/app/dashboard/manutencao-preventiva/modelos/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  getModeloManutencaoPreventivaDetail,
  deleteModeloManutencaoPreventiva,
  formatarLeitura,
  getItensManutencaoPreventiva,
  createItemManutencaoPreventiva,
  updateItemManutencaoPreventiva,
  deleteItemManutencaoPreventiva,
  reordenarItensManutencaoPreventiva,
} from '@/services/manutencao-preventiva-service'
import type {
  ModeloManutencaoPreventivaDetail,
  ItemManutencaoPreventiva,
  ItemManutencaoPreventivaFormData,
} from '@/types/manutencao-preventiva'
import {
  CATEGORIAS_ITEM_MANUTENCAO,
  TIPO_RESPOSTA_ITEM,
  CATEGORIA_ITEM_LABELS,
  TIPO_RESPOSTA_LABELS,
} from '@/types/manutencao-preventiva'

export default function DetalhesModeloManutencao() {
  const router = useRouter()
  const params = useParams()
  const id = parseInt(params.id as string)

  const [modelo, setModelo] = useState<ModeloManutencaoPreventivaDetail | null>(null)
  const [itens, setItens] = useState<ItemManutencaoPreventiva[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal de adicionar/editar item
  const [showItemModal, setShowItemModal] = useState(false)
  const [editingItem, setEditingItem] = useState<ItemManutencaoPreventiva | null>(null)
  const [itemFormData, setItemFormData] = useState<ItemManutencaoPreventivaFormData>({
    modelo: id,
    categoria: 'INSPECAO',
    descricao: '',
    tipo_resposta: 'OK_NAO_OK',
    obrigatorio: true,
    permite_foto: true,
    ordem: 0,
    ativo: true,
  })

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [modeloData, itensData] = await Promise.all([
        getModeloManutencaoPreventivaDetail(id),
        getItensManutencaoPreventiva({ modelo: id, page_size: 100 }),
      ])

      setModelo(modeloData)
      setItens(itensData.results.sort((a, b) => a.ordem - b.ordem))
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err)
      setError(err.message || 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteModelo = async () => {
    if (!confirm(`Deseja realmente excluir o modelo "${modelo?.nome}"?`)) {
      return
    }

    try {
      await deleteModeloManutencaoPreventiva(id)
      alert('Modelo excluído com sucesso!')
      router.push('/dashboard/manutencao-preventiva/modelos')
    } catch (err: any) {
      console.error('Erro ao excluir modelo:', err)
      alert(err.message || 'Erro ao excluir modelo')
    }
  }

  const openItemModal = (item?: ItemManutencaoPreventiva) => {
    if (item) {
      setEditingItem(item)
      setItemFormData({
        modelo: id,
        categoria: item.categoria,
        descricao: item.descricao,
        tipo_resposta: item.tipo_resposta,
        obrigatorio: item.obrigatorio,
        permite_foto: item.permite_foto,
        ordem: item.ordem,
        ativo: item.ativo,
      })
    } else {
      setEditingItem(null)
      setItemFormData({
        modelo: id,
        categoria: 'INSPECAO',
        descricao: '',
        tipo_resposta: 'OK_NAO_OK',
        obrigatorio: true,
        permite_foto: true,
        ordem: itens.length > 0 ? Math.max(...itens.map((i) => i.ordem)) + 1 : 1,
        ativo: true,
      })
    }
    setShowItemModal(true)
  }

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingItem) {
        await updateItemManutencaoPreventiva(editingItem.id, itemFormData)
        alert('Item atualizado com sucesso!')
      } else {
        await createItemManutencaoPreventiva(itemFormData)
        alert('Item criado com sucesso!')
      }
      setShowItemModal(false)
      await loadData()
    } catch (err: any) {
      console.error('Erro ao salvar item:', err)
      alert(err.message || 'Erro ao salvar item')
    }
  }

  const handleDeleteItem = async (itemId: number, descricao: string) => {
    if (!confirm(`Deseja realmente excluir o item "${descricao}"?`)) {
      return
    }

    try {
      await deleteItemManutencaoPreventiva(itemId)
      alert('Item excluído com sucesso!')
      await loadData()
    } catch (err: any) {
      console.error('Erro ao excluir item:', err)
      alert(err.message || 'Erro ao excluir item')
    }
  }

  const moveItem = async (itemId: number, direction: 'up' | 'down') => {
    const currentIndex = itens.findIndex((i) => i.id === itemId)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= itens.length) return

    const newItens = [...itens]
    const [movedItem] = newItens.splice(currentIndex, 1)
    newItens.splice(newIndex, 0, movedItem)

    // Atualizar ordem
    const reordered = newItens.map((item, index) => ({
      id: item.id,
      ordem: index + 1,
    }))

    try {
      await reordenarItensManutencaoPreventiva({ ordem: reordered })
      setItens(newItens.map((item, index) => ({ ...item, ordem: index + 1 })))
    } catch (err: any) {
      console.error('Erro ao reordenar itens:', err)
      alert(err.message || 'Erro ao reordenar itens')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    )
  }

  if (!modelo) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Modelo não encontrado
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{modelo.nome}</h1>
          <p className="text-gray-600 mt-1">{modelo.descricao}</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/manutencao-preventiva/modelos"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            ← Voltar
          </Link>
          <Link
            href={`/dashboard/manutencao-preventiva/modelos/${id}/editar`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Editar
          </Link>
          <button
            onClick={handleDeleteModelo}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Excluir
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Tipo de Equipamento</div>
          <div className="text-lg font-bold text-gray-900 mt-1">
            {modelo.tipo_equipamento_nome}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Tipo de Medição</div>
          <div className="text-lg font-bold text-gray-900 mt-1">
            {modelo.tipo_medicao_display}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Intervalo</div>
          <div className="text-lg font-bold text-gray-900 mt-1">
            {formatarLeitura(modelo.intervalo, modelo.tipo_medicao)}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Tolerância</div>
          <div className="text-lg font-bold text-gray-900 mt-1">
            {formatarLeitura(modelo.tolerancia, modelo.tipo_medicao)}
          </div>
        </div>
      </div>

      {/* Itens do Checklist */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Itens do Checklist</h2>
            <p className="text-sm text-gray-600 mt-1">
              {itens.length} {itens.length === 1 ? 'item' : 'itens'} cadastrados
            </p>
          </div>
          <button
            onClick={() => openItemModal()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            + Novo Item
          </button>
        </div>

        {itens.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg mb-4">Nenhum item cadastrado</p>
            <button
              onClick={() => openItemModal()}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Adicionar primeiro item →
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {itens.map((item, index) => (
              <div
                key={item.id}
                className="p-4 hover:bg-gray-50 flex items-center justify-between"
              >
                <div className="flex items-center flex-1">
                  <div className="flex flex-col gap-1 mr-4">
                    <button
                      onClick={() => moveItem(item.id, 'up')}
                      disabled={index === 0}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveItem(item.id, 'down')}
                      disabled={index === itens.length - 1}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ▼
                    </button>
                  </div>

                  <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center font-bold text-gray-600 mr-3">
                    {item.ordem}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{item.descricao}</span>
                      {item.obrigatorio && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                          Obrigatório
                        </span>
                      )}
                      {!item.ativo && (
                        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded">
                          Inativo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                      <span>{CATEGORIA_ITEM_LABELS[item.categoria]}</span>
                      <span>•</span>
                      <span>{TIPO_RESPOSTA_LABELS[item.tipo_resposta]}</span>
                      {item.permite_foto && (
                        <>
                          <span>•</span>
                          <span>📷 Permite foto</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => openItemModal(item)}
                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id, item.descricao)}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-800 font-medium"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Item */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSaveItem}>
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingItem ? 'Editar Item' : 'Novo Item'}
                </h3>
              </div>

              <div className="p-6 space-y-4">
                {/* Descrição */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={itemFormData.descricao}
                    onChange={(e) =>
                      setItemFormData((prev) => ({ ...prev, descricao: e.target.value }))
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Verificar nível de óleo do motor"
                  />
                </div>

                {/* Categoria */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={itemFormData.categoria}
                    onChange={(e) =>
                      setItemFormData((prev) => ({
                        ...prev,
                        categoria: e.target.value as any,
                      }))
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {CATEGORIAS_ITEM_MANUTENCAO.map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORIA_ITEM_LABELS[cat]}
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
                    value={itemFormData.tipo_resposta}
                    onChange={(e) =>
                      setItemFormData((prev) => ({
                        ...prev,
                        tipo_resposta: e.target.value as any,
                      }))
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {TIPO_RESPOSTA_ITEM.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {TIPO_RESPOSTA_LABELS[tipo]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ordem */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ordem</label>
                  <input
                    type="number"
                    value={itemFormData.ordem}
                    onChange={(e) =>
                      setItemFormData((prev) => ({ ...prev, ordem: parseInt(e.target.value) }))
                    }
                    required
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Checkboxes */}
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={itemFormData.obrigatorio}
                      onChange={(e) =>
                        setItemFormData((prev) => ({ ...prev, obrigatorio: e.target.checked }))
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700">Item obrigatório</label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={itemFormData.permite_foto}
                      onChange={(e) =>
                        setItemFormData((prev) => ({ ...prev, permite_foto: e.target.checked }))
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700">Permite anexar foto</label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={itemFormData.ativo}
                      onChange={(e) =>
                        setItemFormData((prev) => ({ ...prev, ativo: e.target.checked }))
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700">Item ativo</label>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingItem ? 'Salvar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
