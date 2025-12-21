// frontend/src/app/dashboard/manutencao-preventiva/historico/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  getManutencaoPreventivaRealizadaDetail,
  formatarLeitura,
} from '@/services/manutencao-preventiva-service'
import type { ManutencaoPreventivaRealizadaDetail } from '@/types/manutencao-preventiva'
import {
  STATUS_MANUTENCAO_LABELS,
  STATUS_MANUTENCAO_COLORS,
  RESULTADO_MANUTENCAO_LABELS,
  RESULTADO_MANUTENCAO_COLORS,
  CATEGORIA_ITEM_LABELS,
  TIPO_RESPOSTA_LABELS,
} from '@/types/manutencao-preventiva'

export default function DetalhesManutencaoRealizada() {
  const router = useRouter()
  const params = useParams()
  const id = parseInt(params.id as string)

  const [manutencao, setManutencao] = useState<ManutencaoPreventivaRealizadaDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getManutencaoPreventivaRealizadaDetail(id)
      setManutencao(data)
    } catch (err: any) {
      console.error('Erro ao carregar manutenção:', err)
      setError(err.message || 'Erro ao carregar dados da manutenção')
    } finally {
      setLoading(false)
    }
  }

  const formatarDataHora = (dataString: string | null) => {
    if (!dataString) return '-'
    const date = new Date(dataString)
    return date.toLocaleString('pt-BR')
  }

  const calcularDuracao = () => {
    if (!manutencao?.data_hora_inicio || !manutencao?.data_hora_fim) return '-'
    const inicio = new Date(manutencao.data_hora_inicio)
    const fim = new Date(manutencao.data_hora_fim)
    const diffMs = fim.getTime() - inicio.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const horas = Math.floor(diffMins / 60)
    const minutos = diffMins % 60
    return horas > 0 ? `${horas}h ${minutos}min` : `${minutos}min`
  }

  const getCorResposta = (resposta: string): string => {
    const respostasPositivas = ['OK', 'SIM', 'APROVADO', 'BOM']
    const respostasNegativas = ['NÃO OK', 'NÃO', 'REPROVADO', 'RUIM']
    const respostasNeutras = ['REGULAR']

    if (respostasPositivas.includes(resposta.toUpperCase())) {
      return 'bg-green-100 text-green-800'
    } else if (respostasNegativas.includes(resposta.toUpperCase())) {
      return 'bg-red-100 text-red-800'
    } else if (respostasNeutras.includes(resposta.toUpperCase())) {
      return 'bg-yellow-100 text-yellow-800'
    }
    return 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    )
  }

  if (!manutencao) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Manutenção não encontrada
        </div>
      </div>
    )
  }

  const itensRespondidos = manutencao.respostas.length
  const totalItens = (manutencao as any).modelo_total_itens || manutencao.respostas.length
  const percentualConclusao = totalItens > 0 ? (itensRespondidos / totalItens) * 100 : 0

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Manutenção Preventiva #{id}
          </h1>
          <p className="text-gray-600 mt-1">
            {manutencao.equipamento_codigo} - {manutencao.equipamento_descricao}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/manutencao-preventiva/historico"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            ← Voltar
          </Link>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            🖨️ Imprimir
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Status</div>
          <div className="mt-2">
            <span
              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${STATUS_MANUTENCAO_COLORS[manutencao.status]}`}
            >
              {STATUS_MANUTENCAO_LABELS[manutencao.status]}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Resultado</div>
          <div className="mt-2">
            {manutencao.resultado_geral ? (
              <span
                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${RESULTADO_MANUTENCAO_COLORS[manutencao.resultado_geral]}`}
              >
                {RESULTADO_MANUTENCAO_LABELS[manutencao.resultado_geral]}
              </span>
            ) : (
              <span className="text-gray-400">-</span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Itens Respondidos</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {itensRespondidos} / {totalItens}
          </div>
          <div className="text-xs text-gray-500">{percentualConclusao.toFixed(0)}% completo</div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Duração</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{calcularDuracao()}</div>
        </div>
      </div>

      {/* Informações Gerais */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Informações Gerais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-600">Data/Hora Início</div>
            <div className="text-base font-medium text-gray-900 mt-1">
              {formatarDataHora(manutencao.data_hora_inicio)}
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600">Data/Hora Fim</div>
            <div className="text-base font-medium text-gray-900 mt-1">
              {formatarDataHora(manutencao.data_hora_fim)}
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600">Técnico</div>
            <div className="text-base font-medium text-gray-900 mt-1">
              {manutencao.tecnico_nome_display || 'Não informado'}
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600">Equipamento</div>
            <div className="text-base font-medium text-gray-900 mt-1">
              {manutencao.equipamento_codigo}
            </div>
            <div className="text-sm text-gray-500">{manutencao.equipamento_descricao}</div>
          </div>

          <div>
            <div className="text-sm text-gray-600">Modelo de Manutenção</div>
            <div className="text-base font-medium text-gray-900 mt-1">
              {manutencao.modelo_nome}
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600">Leitura do Equipamento</div>
            <div className="text-base font-medium text-gray-900 mt-1">
              {manutencao.leitura_equipamento}
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600">Origem</div>
            <div className="text-base font-medium text-gray-900 mt-1">
              {manutencao.origem === 'WEB' ? '🖥️ Web' : manutencao.origem === 'BOT' ? '💬 Telegram' : '📱 Mobile'}
            </div>
          </div>
        </div>

        {manutencao.observacoes_gerais && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm font-medium text-gray-700 mb-2">Observações Gerais</div>
            <div className="text-base text-gray-900 bg-gray-50 p-3 rounded">
              {manutencao.observacoes_gerais}
            </div>
          </div>
        )}
      </div>

      {/* Checklist - Respostas */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Checklist</h2>
          <p className="text-sm text-gray-600 mt-1">
            Respostas dos itens verificados durante a manutenção
          </p>
        </div>

        {manutencao.respostas.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg">Nenhuma resposta registrada</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {manutencao.respostas
              .sort((a, b) => ((a as any).item_ordem || 0) - ((b as any).item_ordem || 0))
              .map((resposta, index) => (
                <div key={resposta.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start gap-4">
                    {/* Número do Item */}
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center font-bold">
                      {(resposta as any).item_ordem || index + 1}
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1">
                      {/* Descrição e Categoria */}
                      <div className="mb-2">
                        <h3 className="text-base font-semibold text-gray-900">
                          {resposta.item_descricao}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                            {CATEGORIA_ITEM_LABELS[resposta.item_categoria]}
                          </span>
                          {(resposta as any).item_tipo_resposta && (
                            <span className="text-xs text-gray-500">
                              {(TIPO_RESPOSTA_LABELS as any)[(resposta as any).item_tipo_resposta]}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Resposta */}
                      <div className="mb-2">
                        <div className="text-sm text-gray-600 mb-1">Resposta:</div>
                        <span
                          className={`inline-flex px-3 py-1 text-sm font-semibold rounded ${getCorResposta(resposta.resposta)}`}
                        >
                          {resposta.resposta}
                        </span>
                      </div>

                      {/* Observação */}
                      {resposta.observacao && (
                        <div>
                          <div className="text-sm text-gray-600 mb-1">Observação:</div>
                          <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                            {resposta.observacao}
                          </div>
                        </div>
                      )}

                      {/* Foto */}
                      {(resposta as any).foto_url && (
                        <div className="mt-2">
                          <div className="text-sm text-gray-600 mb-1">Foto:</div>
                          <img
                            src={(resposta as any).foto_url}
                            alt={`Foto do item ${(resposta as any).item_ordem || index + 1}`}
                            className="max-w-sm rounded-lg border border-gray-200"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Resumo de Respostas */}
      {manutencao.respostas.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Resumo das Respostas</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['OK', 'NÃO OK', 'SIM', 'NÃO', 'APROVADO', 'REPROVADO', 'BOM', 'REGULAR', 'RUIM'].map(
              (tipo) => {
                const count = manutencao.respostas.filter(
                  (r) => r.resposta.toUpperCase() === tipo
                ).length
                if (count === 0) return null
                return (
                  <div key={tipo} className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{count}</div>
                    <div className="text-sm text-gray-600">{tipo}</div>
                  </div>
                )
              }
            )}
          </div>
        </div>
      )}
    </div>
  )
}
