// frontend/src/app/dashboard/manutencao-preventiva/modelos/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  getModelosManutencaoPreventiva,
  deleteModeloManutencaoPreventiva,
  duplicarModeloManutencaoPreventiva,
  formatarLeitura,
} from '@/services/manutencao-preventiva-service'
import type { ModeloManutencaoPreventiva } from '@/types/manutencao-preventiva'

export default function ModelosManutencaoPreventivaPage() {
  const router = useRouter()
  const [modelos, setModelos] = useState<ModeloManutencaoPreventiva[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros
  const [filtroAtivo, setFiltroAtivo] = useState<string>('true')
  const [filtroSearch, setFiltroSearch] = useState<string>('')

  const loadModelos = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await getModelosManutencaoPreventiva({
        ativo: filtroAtivo === 'true' ? true : filtroAtivo === 'false' ? false : undefined,
        search: filtroSearch || undefined,
        page_size: 100,
      })
      setModelos(response.results)
    } catch (err) {
      console.error('Erro ao carregar modelos:', err)
      setError('Erro ao carregar modelos')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number, nome: string) => {
    if (!confirm(`Deseja realmente excluir o modelo "${nome}"?`)) {
      return
    }

    try {
      await deleteModeloManutencaoPreventiva(id)
      alert('Modelo excluído com sucesso!')
      await loadModelos()
    } catch (err) {
      console.error('Erro ao excluir modelo:', err)
      alert('Erro ao excluir modelo')
    }
  }

  const handleDuplicar = async (id: number, nomeOriginal: string) => {
    const novoNome = prompt(
      `Digite o nome para o novo modelo (duplicado de "${nomeOriginal}"):`,
      `${nomeOriginal} - Cópia`
    )

    if (!novoNome) {
      return
    }

    try {
      await duplicarModeloManutencaoPreventiva(id, { nome: novoNome })
      alert('Modelo duplicado com sucesso!')
      await loadModelos()
    } catch (err) {
      console.error('Erro ao duplicar modelo:', err)
      alert('Erro ao duplicar modelo')
    }
  }

  useEffect(() => {
    loadModelos()
  }, [filtroAtivo, filtroSearch])

  if (loading && modelos.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Carregando modelos...</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Modelos de Manutenção Preventiva</h1>
          <p className="text-gray-600 mt-1">Templates de manutenção por tipo de equipamento</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/manutencao-preventiva"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            ← Voltar
          </Link>
          <Link
            href="/dashboard/manutencao-preventiva/modelos/novo"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            + Novo Modelo
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar Modelo
            </label>
            <input
              type="text"
              value={filtroSearch}
              onChange={(e) => setFiltroSearch(e.target.value)}
              placeholder="Digite nome ou descrição..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filtroAtivo}
              onChange={(e) => setFiltroAtivo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos</option>
              <option value="true">Ativos</option>
              <option value="false">Inativos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Modelos Grid */}
      {modelos.length === 0 ? (
        <div className="bg-white rounded-lg shadow px-6 py-12 text-center text-gray-500">
          <p className="text-lg">Nenhum modelo encontrado</p>
          <Link
            href="/dashboard/manutencao-preventiva/modelos/novo"
            className="mt-4 inline-block text-blue-600 hover:text-blue-800 font-medium"
          >
            Criar primeiro modelo →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modelos.map((modelo) => (
            <div
              key={modelo.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              {/* Card Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-gray-900 flex-1">{modelo.nome}</h3>
                  <span
                    className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                      modelo.ativo
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {modelo.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{modelo.descricao}</p>
                <div className="flex items-center text-sm text-gray-500">
                  <span className="font-medium">{modelo.tipo_equipamento_nome}</span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 bg-gray-50">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tipo de Medição:</span>
                    <span className="font-medium text-gray-900">
                      {modelo.tipo_medicao_display}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Intervalo:</span>
                    <span className="font-medium text-gray-900">
                      {formatarLeitura(modelo.intervalo, modelo.tipo_medicao)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tolerância:</span>
                    <span className="font-medium text-gray-900">
                      {formatarLeitura(modelo.tolerancia, modelo.tipo_medicao)}
                    </span>
                  </div>
                  {modelo.total_itens !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total de Itens:</span>
                      <span className="font-medium text-gray-900">{modelo.total_itens}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="p-4 border-t border-gray-200 flex justify-between items-center">
                <Link
                  href={`/dashboard/manutencao-preventiva/modelos/${modelo.id}`}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Ver Detalhes →
                </Link>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDuplicar(modelo.id, modelo.nome)}
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                    title="Duplicar modelo"
                  >
                    Duplicar
                  </button>
                  <Link
                    href={`/dashboard/manutencao-preventiva/modelos/${modelo.id}/editar`}
                    className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                  >
                    Editar
                  </Link>
                  <button
                    onClick={() => handleDelete(modelo.id, modelo.nome)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
