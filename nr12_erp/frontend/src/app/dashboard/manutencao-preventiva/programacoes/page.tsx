// frontend/src/app/dashboard/manutencao-preventiva/programacoes/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  getProgramacoesManutencao,
  deleteProgramacaoManutencao,
  atualizarTodasProgramacoes,
  formatarLeitura,
  getPercentualColor,
} from '@/services/manutencao-preventiva-service'
import type { ProgramacaoManutencao } from '@/types/manutencao-preventiva'
import {
  STATUS_PROGRAMACAO_LABELS,
  STATUS_PROGRAMACAO_COLORS,
} from '@/types/manutencao-preventiva'

export default function ProgramacoesManutencaoPage() {
  const router = useRouter()
  const [programacoes, setProgramacoes] = useState<ProgramacaoManutencao[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [atualizando, setAtualizando] = useState(false)

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<string>('')
  const [filtroSearch, setFiltroSearch] = useState<string>('')

  const loadProgramacoes = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await getProgramacoesManutencao({
        status: filtroStatus || undefined,
        search: filtroSearch || undefined,
        page_size: 100,
      })
      setProgramacoes(response.results)
    } catch (err) {
      console.error('Erro ao carregar programações:', err)
      setError('Erro ao carregar programações')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number, equipamento: string) => {
    if (!confirm(`Deseja realmente excluir a programação do equipamento ${equipamento}?`)) {
      return
    }

    try {
      await deleteProgramacaoManutencao(id)
      alert('Programação excluída com sucesso!')
      await loadProgramacoes()
    } catch (err) {
      console.error('Erro ao excluir programação:', err)
      alert('Erro ao excluir programação')
    }
  }

  const handleAtualizarTodas = async () => {
    if (!confirm('Deseja atualizar o status de todas as programações?')) {
      return
    }

    try {
      setAtualizando(true)
      const resultado = await atualizarTodasProgramacoes()
      alert(resultado.message)
      await loadProgramacoes()
    } catch (err: any) {
      console.error('Erro ao atualizar programações:', err)
      alert(err.message || 'Erro ao atualizar programações')
    } finally {
      setAtualizando(false)
    }
  }

  useEffect(() => {
    loadProgramacoes()
  }, [filtroStatus, filtroSearch])

  if (loading && programacoes.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Carregando programações...</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Programações de Manutenção</h1>
          <p className="text-gray-900 mt-1">Gerencie as programações de manutenção preventiva</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/manutencao-preventiva"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            ← Voltar
          </Link>
          <button
            onClick={handleAtualizarTodas}
            disabled={atualizando}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
          >
            {atualizando ? 'Atualizando...' : '🔄 Atualizar Todas'}
          </button>
          <Link
            href="/dashboard/manutencao-preventiva/programacoes/nova"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            + Nova Programação
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Buscar Equipamento
            </label>
            <input
              type="text"
              value={filtroSearch}
              onChange={(e) => setFiltroSearch(e.target.value)}
              placeholder="Digite código ou descrição..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Status</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos os status</option>
              <option value="ATIVA">Ativa</option>
              <option value="PENDENTE">Pendente</option>
              <option value="EM_ATRASO">Em Atraso</option>
              <option value="INATIVA">Inativa</option>
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

      {/* Programações List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {programacoes.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-900">
            <p className="text-lg">Nenhuma programação encontrada</p>
            <Link
              href="/dashboard/manutencao-preventiva/programacoes/nova"
              className="mt-4 inline-block text-blue-600 hover:text-blue-800 font-medium"
            >
              Criar primeira programação →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Equipamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Modelo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Tipo Medição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Última Manutenção
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Próxima Manutenção
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Progresso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {programacoes.map((prog) => (
                  <tr key={prog.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {prog.equipamento_codigo}
                      </div>
                      <div className="text-sm text-gray-900">{prog.equipamento_descricao}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{prog.modelo_nome}</div>
                      <div className="text-sm text-gray-900">
                        Intervalo: {formatarLeitura(prog.modelo_intervalo, prog.tipo_medicao)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{prog.tipo_medicao_display}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatarLeitura(prog.leitura_ultima_manutencao, prog.tipo_medicao)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatarLeitura(prog.leitura_proxima_manutencao, prog.tipo_medicao)}
                      </div>
                      {prog.falta_para_manutencao && (
                        <div className="text-xs text-gray-900">
                          Falta: {formatarLeitura(prog.falta_para_manutencao, prog.tipo_medicao)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {prog.percentual_concluido !== undefined && (
                        <div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                prog.percentual_concluido >= 100
                                  ? 'bg-red-600'
                                  : prog.percentual_concluido >= 80
                                  ? 'bg-yellow-500'
                                  : 'bg-green-600'
                              }`}
                              style={{ width: `${Math.min(prog.percentual_concluido, 100)}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-900 mt-1">
                            {prog.percentual_concluido.toFixed(0)}%
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${STATUS_PROGRAMACAO_COLORS[prog.status]}`}
                      >
                        {STATUS_PROGRAMACAO_LABELS[prog.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/dashboard/manutencao-preventiva/programacoes/${prog.id}`}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Ver
                      </Link>
                      <Link
                        href={`/dashboard/manutencao-preventiva/programacoes/${prog.id}/editar`}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        Editar
                      </Link>
                      <Link
                        href={`/dashboard/manutencao-preventiva/executar/${prog.id}`}
                        className="text-green-600 hover:text-green-900 mr-3"
                      >
                        Executar
                      </Link>
                      <button
                        onClick={() => handleDelete(prog.id, prog.equipamento_codigo)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
