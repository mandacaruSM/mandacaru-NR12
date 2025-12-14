// frontend/src/app/dashboard/manutencao-preventiva/programacoes/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  getProgramacaoManutencaoDetail,
  deleteProgramacaoManutencao,
  atualizarStatusProgramacao,
  getManutencoesPreventivasRealizadas,
  formatarLeitura,
} from '@/services/manutencao-preventiva-service'
import type {
  ProgramacaoManutencao,
  ManutencaoPreventivaRealizada,
} from '@/types/manutencao-preventiva'
import {
  STATUS_PROGRAMACAO_LABELS,
  STATUS_PROGRAMACAO_COLORS,
  STATUS_MANUTENCAO_LABELS,
  STATUS_MANUTENCAO_COLORS,
} from '@/types/manutencao-preventiva'

export default function DetalhesProgramacao() {
  const router = useRouter()
  const params = useParams()
  const id = parseInt(params.id as string)

  const [programacao, setProgramacao] = useState<ProgramacaoManutencao | null>(null)
  const [manutencoes, setManutencoes] = useState<ManutencaoPreventivaRealizada[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal de atualizar leitura
  const [showAtualizarModal, setShowAtualizarModal] = useState(false)
  const [novaLeitura, setNovaLeitura] = useState('')

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [progData, manutData] = await Promise.all([
        getProgramacaoManutencaoDetail(id),
        getManutencoesPreventivasRealizadas({
          equipamento: undefined, // Precisaríamos do ID do equipamento
          page_size: 10,
        }),
      ])

      setProgramacao(progData)
      setNovaLeitura(progData.leitura_atual || '0')
      // Filtrar manutenções desta programação (idealmente deveria vir do backend)
      setManutencoes(manutData.results)
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err)
      setError(err.message || 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Deseja realmente excluir esta programação?`)) {
      return
    }

    try {
      await deleteProgramacaoManutencao(id)
      alert('Programação excluída com sucesso!')
      router.push('/dashboard/manutencao-preventiva/programacoes')
    } catch (err: any) {
      console.error('Erro ao excluir programação:', err)
      alert(err.message || 'Erro ao excluir programação')
    }
  }

  const handleAtualizarLeitura = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await atualizarStatusProgramacao(id, { leitura_atual: parseFloat(novaLeitura) })
      alert('Leitura atualizada com sucesso!')
      setShowAtualizarModal(false)
      await loadData()
    } catch (err: any) {
      console.error('Erro ao atualizar leitura:', err)
      alert(err.message || 'Erro ao atualizar leitura')
    }
  }

  const formatarData = (dataString: string | null) => {
    if (!dataString) return '-'
    const date = new Date(dataString)
    return date.toLocaleDateString('pt-BR')
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    )
  }

  if (!programacao) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Programação não encontrada
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Programação #{id} - {programacao.equipamento_codigo}
          </h1>
          <p className="text-gray-600 mt-1">{programacao.modelo_nome}</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/manutencao-preventiva/programacoes"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            ← Voltar
          </Link>
          <Link
            href={`/dashboard/manutencao-preventiva/programacoes/${id}/editar`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Editar
          </Link>
          <button
            onClick={handleDelete}
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

      {/* Status Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Status da Programação</h2>
          <span
            className={`inline-flex px-3 py-1.5 text-sm font-semibold rounded-full ${STATUS_PROGRAMACAO_COLORS[programacao.status]}`}
          >
            {STATUS_PROGRAMACAO_LABELS[programacao.status]}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600">Última Manutenção</div>
            <div className="text-lg font-bold text-gray-900 mt-1">
              {formatarLeitura(programacao.leitura_ultima_manutencao, programacao.tipo_medicao)}
            </div>
            {programacao.data_ultima_manutencao && (
              <div className="text-xs text-gray-500 mt-1">
                {formatarData(programacao.data_ultima_manutencao)}
              </div>
            )}
          </div>

          <div>
            <div className="text-sm text-gray-600">Leitura Atual</div>
            <div className="text-lg font-bold text-gray-900 mt-1">
              {programacao.leitura_atual
                ? formatarLeitura(programacao.leitura_atual, programacao.tipo_medicao)
                : '-'}
            </div>
            <button
              onClick={() => setShowAtualizarModal(true)}
              className="text-xs text-blue-600 hover:text-blue-800 mt-1"
            >
              Atualizar leitura →
            </button>
          </div>

          <div>
            <div className="text-sm text-gray-600">Próxima Manutenção</div>
            <div className="text-lg font-bold text-gray-900 mt-1">
              {formatarLeitura(programacao.leitura_proxima_manutencao, programacao.tipo_medicao)}
            </div>
            {programacao.falta_para_manutencao && (
              <div className="text-xs text-gray-500 mt-1">
                Falta: {formatarLeitura(programacao.falta_para_manutencao, programacao.tipo_medicao)}
              </div>
            )}
          </div>

          <div>
            <div className="text-sm text-gray-600">Progresso</div>
            <div className="mt-2">
              {programacao.percentual_concluido !== undefined && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-gray-900">
                      {programacao.percentual_concluido.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        programacao.percentual_concluido >= 100
                          ? 'bg-red-600'
                          : programacao.percentual_concluido >= 80
                          ? 'bg-yellow-500'
                          : 'bg-green-600'
                      }`}
                      style={{ width: `${Math.min(programacao.percentual_concluido, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Informações do Equipamento */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Informações do Equipamento</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-600">Código</div>
            <div className="text-base font-medium text-gray-900 mt-1">
              {programacao.equipamento_codigo}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Descrição</div>
            <div className="text-base font-medium text-gray-900 mt-1">
              {programacao.equipamento_descricao}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Tipo de Medição</div>
            <div className="text-base font-medium text-gray-900 mt-1">
              {programacao.tipo_medicao_display}
            </div>
          </div>
        </div>
      </div>

      {/* Informações do Modelo */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Modelo de Manutenção</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-600">Nome do Modelo</div>
            <div className="text-base font-medium text-gray-900 mt-1">
              {programacao.modelo_nome}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Intervalo</div>
            <div className="text-base font-medium text-gray-900 mt-1">
              {formatarLeitura(programacao.modelo_intervalo, programacao.tipo_medicao)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Tolerância</div>
            <div className="text-base font-medium text-gray-900 mt-1">
              {formatarLeitura(programacao.modelo_tolerancia, programacao.tipo_medicao)}
            </div>
          </div>
        </div>
      </div>

      {/* Histórico de Manutenções */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Histórico de Manutenções</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manutenções preventivas realizadas neste equipamento
          </p>
        </div>

        {manutencoes.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg">Nenhuma manutenção realizada ainda</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Técnico
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Leitura
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {manutencoes.map((manutencao) => (
                  <tr key={manutencao.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatarData(manutencao.data_hora_inicio)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {manutencao.tecnico_nome_display || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {manutencao.leitura_equipamento}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${STATUS_MANUTENCAO_COLORS[manutencao.status]}`}
                      >
                        {STATUS_MANUTENCAO_LABELS[manutencao.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/dashboard/manutencao-preventiva/historico/${manutencao.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Ver Detalhes
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Atualizar Leitura */}
      {showAtualizarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <form onSubmit={handleAtualizarLeitura}>
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">Atualizar Leitura</h3>
              </div>

              <div className="p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nova Leitura
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={novaLeitura}
                    onChange={(e) => setNovaLeitura(e.target.value)}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute right-3 top-2 text-gray-500 text-sm">
                    {programacao.tipo_medicao === 'HORIMETRO' ? 'horas' : 'km'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Atual: {formatarLeitura(programacao.leitura_atual || '0', programacao.tipo_medicao)}
                </p>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAtualizarModal(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Atualizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
