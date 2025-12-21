'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  getProgramacaoManutencaoDetail,
  getModeloManutencaoPreventivaDetail,
  createManutencaoPreventiva,
  createRespostaItemManutencao,
  finalizarManutencaoPreventiva,
  formatarLeitura,
} from '@/services/manutencao-preventiva-service'
import type {
  ProgramacaoManutencao,
  ModeloManutencaoPreventivaDetail,
  ItemManutencaoPreventiva,
  RespostaItem as TipoResposta,
} from '@/types/manutencao-preventiva'
import { CATEGORIA_ITEM_LABELS } from '@/types/manutencao-preventiva'

interface RespostaItemLocal {
  item_id: number
  resposta: TipoResposta | string
  observacao?: string
  foto?: string
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  try {
    return JSON.stringify(err)
  } catch {
    return 'Erro desconhecido'
  }
}

/**
 * Compatibiliza diferentes formatos de retorno do backend.
 * Ex.: leitura_atual | equipamento_leitura_atual | equipamento.leitura_atual
 */
function getLeituraAtualFromProgramacao(prog: ProgramacaoManutencao): string {
  const p = prog as unknown as Record<string, unknown>

  const leituraDireta = p['leitura_atual']
  if (typeof leituraDireta === 'string' || typeof leituraDireta === 'number') {
    return String(leituraDireta)
  }

  const leituraEquip = p['equipamento_leitura_atual']
  if (typeof leituraEquip === 'string' || typeof leituraEquip === 'number') {
    return String(leituraEquip)
  }

  const equipamento = p['equipamento']
  if (typeof equipamento === 'object' && equipamento !== null) {
    const eq = equipamento as Record<string, unknown>
    const leituraEqObj = eq['leitura_atual']
    if (typeof leituraEqObj === 'string' || typeof leituraEqObj === 'number') {
      return String(leituraEqObj)
    }
  }

  return '0'
}

export default function ExecutarManutencaoPreventiva() {
  const router = useRouter()
  const params = useParams()
  const programacaoId = parseInt(params.programacaoId as string)

  const [programacao, setProgramacao] = useState<ProgramacaoManutencao | null>(null)
  const [modelo, setModelo] = useState<ModeloManutencaoPreventivaDetail | null>(null)
  const [itens, setItens] = useState<ItemManutencaoPreventiva[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Estado da execução
  const [manutencaoId, setManutencaoId] = useState<number | null>(null)
  const [leituraEquipamento, setLeituraEquipamento] = useState('')
  const [respostas, setRespostas] = useState<Record<number, RespostaItemLocal>>({})
  const [observacoesGerais, setObservacoesGerais] = useState('')
  const [itemAtualIndex, setItemAtualIndex] = useState(0)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const progData = await getProgramacaoManutencaoDetail(programacaoId)
      setProgramacao(progData)

      const modeloData = await getModeloManutencaoPreventivaDetail(progData.modelo)
      setModelo(modeloData)
      setItens([...modeloData.itens].sort((a, b) => a.ordem - b.ordem))

      // ✅ Inicializa usando leitura do equipamento (sem depender de progData.leitura_atual no tipo)
      setLeituraEquipamento(getLeituraAtualFromProgramacao(progData))
    } catch (err: unknown) {
      console.error('Erro ao carregar dados:', err)
      setError(getErrorMessage(err) || 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [programacaoId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const iniciarManutencao = async () => {
    if (!programacao || !modelo) return

    try {
      setSubmitting(true)
      setError(null)

      const leituraNumero = Number(leituraEquipamento)

      if (!leituraEquipamento || Number.isNaN(leituraNumero) || leituraNumero < 0) {
        setError('Informe a leitura atual do equipamento')
        setSubmitting(false)
        return
      }

      const manutencao = await createManutencaoPreventiva({
        programacao: programacaoId,
        equipamento: programacao.equipamento,
        modelo: programacao.modelo,
        leitura_equipamento: leituraNumero, // ✅ agora é number
        origem: 'WEB',
      })

      setManutencaoId(manutencao.id)
      alert('Manutenção iniciada! Agora responda os itens do checklist.')
    } catch (err: unknown) {
      console.error('Erro ao iniciar manutenção:', err)
      setError(getErrorMessage(err) || 'Erro ao iniciar manutenção')
    } finally {
      setSubmitting(false)
    }
  }

  const salvarResposta = async (itemId: number) => {
    if (!manutencaoId) return

    const resposta = respostas[itemId]
    if (!resposta || !resposta.resposta) {
      alert('Selecione uma resposta antes de continuar')
      return
    }

    try {
      await createRespostaItemManutencao({
        manutencao: manutencaoId,
        item: itemId,
        resposta: resposta.resposta as TipoResposta,
        observacao: resposta.observacao || '',
      })

      // Avançar para próximo item
      if (itemAtualIndex < itens.length - 1) {
        setItemAtualIndex((prev) => prev + 1)
      }
    } catch (err: unknown) {
      console.error('Erro ao salvar resposta:', err)
      alert(getErrorMessage(err) || 'Erro ao salvar resposta')
    }
  }

  const finalizarExecucao = async () => {
    if (!manutencaoId) return

    // Verificar se todos os itens obrigatórios foram respondidos
    const itensObrigatorios = itens.filter((item) => item.obrigatorio)
    const itensRespondidos = Object.keys(respostas).map(Number)
    const faltantes = itensObrigatorios.filter((item) => !itensRespondidos.includes(item.id))

    if (faltantes.length > 0) {
      if (
        !confirm(
          `Ainda há ${faltantes.length} item(ns) obrigatório(s) não respondido(s). Deseja finalizar mesmo assim?`
        )
      ) {
        return
      }
    }

    try {
      setSubmitting(true)
      await finalizarManutencaoPreventiva(manutencaoId, {
        observacoes_gerais: observacoesGerais,
      })
      alert('Manutenção finalizada com sucesso!')
      router.push(`/dashboard/manutencao-preventiva/historico/${manutencaoId}`)
    } catch (err: unknown) {
      console.error('Erro ao finalizar manutenção:', err)
      alert(getErrorMessage(err) || 'Erro ao finalizar manutenção')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRespostaChange = (itemId: number, campo: string, valor: string) => {
    setRespostas((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        item_id: itemId,
        [campo]: valor,
      },
    }))
  }

  const getOpcoesResposta = (tipoResposta: string): string[] => {
    switch (tipoResposta) {
      case 'OK_NAO_OK':
        return ['OK', 'NÃO OK']
      case 'SIM_NAO':
        return ['SIM', 'NÃO']
      case 'APROVADO_REPROVADO':
        return ['APROVADO', 'REPROVADO']
      case 'BOM_REGULAR_RUIM':
        return ['BOM', 'REGULAR', 'RUIM']
      case 'TEXTO':
        return []
      default:
        return []
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    )
  }

  if (!programacao || !modelo) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Programação ou modelo não encontrado
        </div>
      </div>
    )
  }

  const itemAtual = itens[itemAtualIndex]
  const progressoGeral = itens.length > 0 ? ((itemAtualIndex + 1) / itens.length) * 100 : 0

  // ✅ leitura anterior “registrada” (compatível)
  const leituraAnterior = getLeituraAtualFromProgramacao(programacao)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Executar Manutenção Preventiva</h1>
            <p className="text-gray-600 mt-1">
              {programacao.equipamento_codigo} - {modelo.nome}
            </p>
          </div>
          <Link
            href="/dashboard/manutencao-preventiva/programacoes"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            ← Cancelar
          </Link>
        </div>

        {/* Progress Bar Geral */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Progresso: {itemAtualIndex + 1} de {itens.length} itens
            </span>
            <span className="text-sm font-medium text-gray-700">{progressoGeral.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all"
              style={{ width: `${progressoGeral}%` }}
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

      {/* Início da Manutenção */}
      {!manutencaoId ? (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Iniciar Manutenção</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Leitura Atual do Equipamento <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={leituraEquipamento}
                  onChange={(e) => setLeituraEquipamento(e.target.value)}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Digite a leitura atual..."
                />
                <span className="absolute right-3 top-2 text-gray-500 text-sm">
                  {programacao.tipo_medicao === 'HORIMETRO' ? 'horas' : 'km'}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Última leitura registrada:{' '}
                {formatarLeitura(leituraAnterior, programacao.tipo_medicao)}
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Informações</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <div>
                  <span className="font-medium">Total de itens:</span> {itens.length}
                </div>
                <div>
                  <span className="font-medium">Itens obrigatórios:</span>{' '}
                  {itens.filter((i) => i.obrigatorio).length}
                </div>
                <div>
                  <span className="font-medium">Modelo:</span> {modelo.nome}
                </div>
              </div>
            </div>

            <button
              onClick={iniciarManutencao}
              disabled={submitting}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-lg"
            >
              {submitting ? 'Iniciando...' : 'Iniciar Manutenção'}
            </button>
          </div>
        </div>
      ) : (
        /* Checklist */
        <div className="space-y-6">
          {/* Item Atual */}
          {itemAtual && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                      {itemAtual.ordem}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{itemAtual.descricao}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                          {CATEGORIA_ITEM_LABELS[itemAtual.categoria]}
                        </span>
                        {itemAtual.obrigatorio && (
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                            Obrigatório
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Resposta */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resposta {itemAtual.obrigatorio && <span className="text-red-500">*</span>}
                  </label>
                  {itemAtual.tipo_resposta === 'TEXTO' ? (
                    <textarea
                      value={respostas[itemAtual.id]?.resposta || ''}
                      onChange={(e) => handleRespostaChange(itemAtual.id, 'resposta', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Digite sua resposta..."
                    />
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {getOpcoesResposta(itemAtual.tipo_resposta).map((opcao) => (
                        <button
                          key={opcao}
                          type="button"
                          onClick={() => handleRespostaChange(itemAtual.id, 'resposta', opcao)}
                          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                            respostas[itemAtual.id]?.resposta === opcao
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {opcao}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Observação */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observação (opcional)
                  </label>
                  <textarea
                    value={respostas[itemAtual.id]?.observacao || ''}
                    onChange={(e) => handleRespostaChange(itemAtual.id, 'observacao', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Adicione observações sobre este item..."
                  />
                </div>

                {/* Foto (placeholder) - funcionalidade a ser implementada */}
                {(itemAtual as any).permite_foto && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Foto (opcional)
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <p className="text-sm text-gray-500">📷 Upload de foto será implementado em breve</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-between">
                <button
                  type="button"
                  onClick={() => setItemAtualIndex((prev) => Math.max(0, prev - 1))}
                  disabled={itemAtualIndex === 0}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Anterior
                </button>

                {itemAtualIndex < itens.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => salvarResposta(itemAtual.id)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Salvar e Próximo →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => salvarResposta(itemAtual.id)}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Salvar Último Item
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Observações Gerais e Finalizar */}
          {itemAtualIndex === itens.length - 1 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Finalizar Manutenção</h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observações Gerais
                </label>
                <textarea
                  value={observacoesGerais}
                  onChange={(e) => setObservacoesGerais(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Adicione observações gerais sobre esta manutenção..."
                />
              </div>

              <button
                type="button"
                onClick={finalizarExecucao}
                disabled={submitting}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-lg"
              >
                {submitting ? 'Finalizando...' : '✓ Finalizar Manutenção'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
