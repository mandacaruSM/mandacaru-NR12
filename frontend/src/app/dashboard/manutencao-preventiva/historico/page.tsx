// frontend/src/app/dashboard/manutencao-preventiva/historico/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  getManutencoesPreventivasRealizadas,
  getEstatisticasManutencoes,
  formatarLeitura,
} from '@/services/manutencao-preventiva-service'
import type {
  ManutencaoPreventivaRealizada,
  EstatisticasManutencoes,
} from '@/types/manutencao-preventiva'
import {
  STATUS_MANUTENCAO_LABELS,
  STATUS_MANUTENCAO_COLORS,
  RESULTADO_MANUTENCAO_LABELS,
  RESULTADO_MANUTENCAO_COLORS,
} from '@/types/manutencao-preventiva'

export default function HistoricoManutencaoPreventiva() {
  const router = useRouter()
  const [manutencoes, setManutencoes] = useState<ManutencaoPreventivaRealizada[]>([])
  const [estatisticas, setEstatisticas] = useState<EstatisticasManutencoes | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<string>('')
  const [filtroResultado, setFiltroResultado] = useState<string>('')
  const [filtroOrigem, setFiltroOrigem] = useState<string>('')
  const [filtroDataInicio, setFiltroDataInicio] = useState<string>('')
  const [filtroDataFim, setFiltroDataFim] = useState<string>('')

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Carregar manutenções
      const responseManutencoes = await getManutencoesPreventivasRealizadas({
        status: filtroStatus || undefined,
        resultado_geral: filtroResultado || undefined,
        origem: filtroOrigem || undefined,
        data_inicio: filtroDataInicio || undefined,
        data_fim: filtroDataFim || undefined,
        page_size: 50,
      })
      setManutencoes(responseManutencoes.results)

      // Carregar estatísticas
      const responseEstatisticas = await getEstatisticasManutencoes({
        data_inicio: filtroDataInicio || undefined,
        data_fim: filtroDataFim || undefined,
      })
      setEstatisticas(responseEstatisticas)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      setError('Erro ao carregar dados do histórico')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [filtroStatus, filtroResultado, filtroOrigem, filtroDataInicio, filtroDataFim])

  const formatarData = (dataString: string | null) => {
    if (!dataString) return '-'
    const date = new Date(dataString)
    return date.toLocaleString('pt-BR')
  }

  if (loading && manutencoes.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Carregando histórico...</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Histórico de Manutenções</h1>
          <p className="text-gray-600 mt-1">
            Visualize todas as manutenções preventivas realizadas
          </p>
        </div>
        <Link
          href="/dashboard/manutencao-preventiva"
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          ← Voltar
        </Link>
      </div>

      {/* Estatísticas */}
      {estatisticas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Total</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{estatisticas.total}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Concluídas</div>
            <div className="text-3xl font-bold text-green-600 mt-2">
              {estatisticas.concluidas}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Em Andamento</div>
            <div className="text-3xl font-bold text-blue-600 mt-2">
              {estatisticas.em_andamento}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Canceladas</div>
            <div className="text-3xl font-bold text-red-600 mt-2">{estatisticas.canceladas}</div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos</option>
              <option value="EM_ANDAMENTO">Em Andamento</option>
              <option value="CONCLUIDA">Concluída</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Resultado</label>
            <select
              value={filtroResultado}
              onChange={(e) => setFiltroResultado(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos</option>
              <option value="COMPLETA">Completa</option>
              <option value="COMPLETA_RESTRICAO">Completa c/ Restrição</option>
              <option value="INCOMPLETA">Incompleta</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Origem</label>
            <select
              value={filtroOrigem}
              onChange={(e) => setFiltroOrigem(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todas</option>
              <option value="WEB">Web</option>
              <option value="BOT">Telegram</option>
              <option value="MOBILE">Mobile</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data Início</label>
            <input
              type="date"
              value={filtroDataInicio}
              onChange={(e) => setFiltroDataInicio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data Fim</label>
            <input
              type="date"
              value={filtroDataFim}
              onChange={(e) => setFiltroDataFim(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Lista de Manutenções */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {manutencoes.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <p className="text-lg">Nenhuma manutenção encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Equipamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Modelo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Técnico
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data/Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leitura
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resultado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Origem
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {manutencoes.map((manutencao) => (
                  <tr key={manutencao.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      #{manutencao.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {manutencao.equipamento_codigo}
                      </div>
                      <div className="text-sm text-gray-500">
                        {manutencao.equipamento_descricao}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {manutencao.modelo_nome}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {manutencao.tecnico_nome_display || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatarData(manutencao.data_hora_inicio)}
                      </div>
                      {manutencao.data_hora_fim && (
                        <div className="text-xs text-gray-500">
                          Fim: {formatarData(manutencao.data_hora_fim)}
                        </div>
                      )}
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      {manutencao.resultado_geral ? (
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${RESULTADO_MANUTENCAO_COLORS[manutencao.resultado_geral]}`}
                        >
                          {RESULTADO_MANUTENCAO_LABELS[manutencao.resultado_geral]}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{manutencao.origem}</span>
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

      {/* Estatísticas Adicionais */}
      {estatisticas && estatisticas.por_equipamento.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Por Equipamento */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Top 5 Equipamentos (Manutenções)
            </h3>
            <div className="space-y-3">
              {estatisticas.por_equipamento.slice(0, 5).map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {item.equipamento__codigo}
                    </div>
                    <div className="text-xs text-gray-500">{item.equipamento__descricao}</div>
                  </div>
                  <div className="text-lg font-bold text-gray-900">{item.total}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Por Técnico */}
          {estatisticas.por_tecnico.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Top 5 Técnicos (Manutenções)
              </h3>
              <div className="space-y-3">
                {estatisticas.por_tecnico.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div className="text-sm font-medium text-gray-900">
                      {item.tecnico__nome || 'Não informado'}
                    </div>
                    <div className="text-lg font-bold text-gray-900">{item.total}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
