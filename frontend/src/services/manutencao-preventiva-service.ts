// frontend/src/services/manutencao-preventiva-service.ts

import { api } from '@/lib/api'
import type {
  ModeloManutencaoPreventiva,
  ModeloManutencaoPreventivaDetail,
  ModeloManutencaoPreventivaFormData,
  ItemManutencaoPreventiva,
  ItemManutencaoPreventivaFormData,
  ProgramacaoManutencao,
  ProgramacaoManutencaoFormData,
  ManutencaoPreventivaRealizada,
  ManutencaoPreventivaRealizadaDetail,
  ManutencaoPreventivaRealizadaFormData,
  RespostaItemManutencao,
  RespostaItemManutencaoFormData,
  PaginatedResponse,
  DashboardProgramacoes,
  EstatisticasManutencoes,
} from '@/types/manutencao-preventiva'

// Helper para construir query string
function buildQuery(params: Record<string, any>): string {
  const queryParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, String(value))
    }
  })
  const query = queryParams.toString()
  return query ? `?${query}` : ''
}

// ============================================
// MODELOS DE MANUTENÇÃO PREVENTIVA
// ============================================

export const getModelosManutencaoPreventiva = async (
  params?: {
    tipo_equipamento?: number
    ativo?: boolean
    search?: string
    page?: number
    page_size?: number
  }
): Promise<PaginatedResponse<ModeloManutencaoPreventiva>> => {
  const query = buildQuery(params || {})
  return api<PaginatedResponse<ModeloManutencaoPreventiva>>(`/nr12/modelos-manutencao-preventiva/${query}`)
}

export const getModeloManutencaoPreventivaDetail = async (
  id: number
): Promise<ModeloManutencaoPreventivaDetail> => {
  return api<ModeloManutencaoPreventivaDetail>(`/nr12/modelos-manutencao-preventiva/${id}`)
}

export const createModeloManutencaoPreventiva = async (
  data: ModeloManutencaoPreventivaFormData
): Promise<ModeloManutencaoPreventiva> => {
  return api<ModeloManutencaoPreventiva>('/nr12/modelos-manutencao-preventiva', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export const updateModeloManutencaoPreventiva = async (
  id: number,
  data: Partial<ModeloManutencaoPreventivaFormData>
): Promise<ModeloManutencaoPreventiva> => {
  return api<ModeloManutencaoPreventiva>(`/nr12/modelos-manutencao-preventiva/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export const deleteModeloManutencaoPreventiva = async (id: number): Promise<void> => {
  return api<void>(`/nr12/modelos-manutencao-preventiva/${id}`, { method: 'DELETE' })
}

export const duplicarModeloManutencaoPreventiva = async (
  id: number,
  data: { nome: string }
): Promise<ModeloManutencaoPreventiva> => {
  return api<ModeloManutencaoPreventiva>(`/nr12/modelos-manutencao-preventiva/${id}/duplicar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// ============================================
// ITENS DE MANUTENÇÃO PREVENTIVA
// ============================================

export const getItensManutencaoPreventiva = async (
  params?: {
    modelo?: number
    categoria?: string
    ativo?: boolean
    page?: number
    page_size?: number
  }
): Promise<PaginatedResponse<ItemManutencaoPreventiva>> => {
  const query = buildQuery(params || {})
  return api<PaginatedResponse<ItemManutencaoPreventiva>>(`/nr12/itens-manutencao-preventiva/${query}`)
}

export const getItemManutencaoPreventivaDetail = async (
  id: number
): Promise<ItemManutencaoPreventiva> => {
  return api<ItemManutencaoPreventiva>(`/nr12/itens-manutencao-preventiva/${id}`)
}

export const createItemManutencaoPreventiva = async (
  data: ItemManutencaoPreventivaFormData
): Promise<ItemManutencaoPreventiva> => {
  return api<ItemManutencaoPreventiva>('/nr12/itens-manutencao-preventiva', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export const updateItemManutencaoPreventiva = async (
  id: number,
  data: Partial<ItemManutencaoPreventivaFormData>
): Promise<ItemManutencaoPreventiva> => {
  return api<ItemManutencaoPreventiva>(`/nr12/itens-manutencao-preventiva/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export const deleteItemManutencaoPreventiva = async (id: number): Promise<void> => {
  return api<void>(`/nr12/itens-manutencao-preventiva/${id}`, { method: 'DELETE' })
}

export const reordenarItensManutencaoPreventiva = async (
  data: { ordem: Array<{ id: number; ordem: number }> }
): Promise<{ success: boolean; message: string }> => {
  return api<{ success: boolean; message: string }>('/nr12/itens-manutencao-preventiva/reordenar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// ============================================
// PROGRAMAÇÕES DE MANUTENÇÃO
// ============================================

export const getProgramacoesManutencao = async (
  params?: {
    equipamento?: number
    modelo?: number
    status?: string
    ativo?: boolean
    search?: string
    page?: number
    page_size?: number
  }
): Promise<PaginatedResponse<ProgramacaoManutencao>> => {
  const query = buildQuery(params || {})
  return api<PaginatedResponse<ProgramacaoManutencao>>(`/nr12/programacoes-manutencao/${query}`)
}

export const getProgramacaoManutencaoDetail = async (
  id: number
): Promise<ProgramacaoManutencao> => {
  return api<ProgramacaoManutencao>(`/nr12/programacoes-manutencao/${id}`)
}

export const createProgramacaoManutencao = async (
  data: ProgramacaoManutencaoFormData
): Promise<ProgramacaoManutencao> => {
  return api<ProgramacaoManutencao>('/nr12/programacoes-manutencao', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export const updateProgramacaoManutencao = async (
  id: number,
  data: Partial<ProgramacaoManutencaoFormData>
): Promise<ProgramacaoManutencao> => {
  return api<ProgramacaoManutencao>(`/nr12/programacoes-manutencao/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export const deleteProgramacaoManutencao = async (id: number): Promise<void> => {
  return api<void>(`/nr12/programacoes-manutencao/${id}`, { method: 'DELETE' })
}

export const atualizarStatusProgramacao = async (
  id: number,
  data: { leitura_atual: number }
): Promise<ProgramacaoManutencao> => {
  return api<ProgramacaoManutencao>(`/nr12/programacoes-manutencao/${id}/atualizar_status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export const atualizarTodasProgramacoes = async (): Promise<{
  success: boolean
  message: string
  atualizadas: number
}> => {
  const result = await api<{ detail: string }>('/nr12/programacoes-manutencao/atualizar_todas', {
    method: 'POST',
  })

  // Extrair número de atualizadas da mensagem
  const match = result.detail.match(/(\d+)/)
  const atualizadas = match ? parseInt(match[1]) : 0

  return {
    success: true,
    message: result.detail,
    atualizadas,
  }
}

export const getProgramacoesPendentes = async (
  params?: { equipamento?: number }
): Promise<ProgramacaoManutencao[]> => {
  const query = buildQuery(params || {})
  return api<ProgramacaoManutencao[]>(`/nr12/programacoes-manutencao/pendentes/${query}`)
}

export const getDashboardProgramacoes = async (): Promise<DashboardProgramacoes> => {
  return api<DashboardProgramacoes>('/nr12/programacoes-manutencao/dashboard')
}

// ============================================
// MANUTENÇÕES PREVENTIVAS REALIZADAS
// ============================================

export const getManutencoesPreventivasRealizadas = async (
  params?: {
    equipamento?: number
    modelo?: number
    tecnico?: number
    status?: string
    resultado_geral?: string
    origem?: string
    data_inicio?: string
    data_fim?: string
    search?: string
    page?: number
    page_size?: number
  }
): Promise<PaginatedResponse<ManutencaoPreventivaRealizada>> => {
  const query = buildQuery(params || {})
  return api<PaginatedResponse<ManutencaoPreventivaRealizada>>(`/nr12/manutencoes-preventivas/${query}`)
}

export const getManutencaoPreventivaRealizadaDetail = async (
  id: number
): Promise<ManutencaoPreventivaRealizadaDetail> => {
  return api<ManutencaoPreventivaRealizadaDetail>(`/nr12/manutencoes-preventivas/${id}`)
}

export const createManutencaoPreventiva = async (
  data: ManutencaoPreventivaRealizadaFormData
): Promise<ManutencaoPreventivaRealizada> => {
  return api<ManutencaoPreventivaRealizada>('/nr12/manutencoes-preventivas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export const updateManutencaoPreventiva = async (
  id: number,
  data: Partial<ManutencaoPreventivaRealizadaFormData>
): Promise<ManutencaoPreventivaRealizada> => {
  return api<ManutencaoPreventivaRealizada>(`/nr12/manutencoes-preventivas/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export const deleteManutencaoPreventiva = async (id: number): Promise<void> => {
  return api<void>(`/nr12/manutencoes-preventivas/${id}`, { method: 'DELETE' })
}

export const finalizarManutencaoPreventiva = async (
  id: number,
  data?: { observacoes_gerais?: string }
): Promise<ManutencaoPreventivaRealizada> => {
  return api<ManutencaoPreventivaRealizada>(`/nr12/manutencoes-preventivas/${id}/finalizar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data || {}),
  })
}

export const cancelarManutencaoPreventiva = async (
  id: number,
  data: { motivo: string }
): Promise<ManutencaoPreventivaRealizada> => {
  return api<ManutencaoPreventivaRealizada>(`/nr12/manutencoes-preventivas/${id}/cancelar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export const getEstatisticasManutencoes = async (
  params?: {
    data_inicio?: string
    data_fim?: string
    equipamento?: number
    modelo?: number
  }
): Promise<EstatisticasManutencoes> => {
  const query = buildQuery(params || {})
  return api<EstatisticasManutencoes>(`/nr12/manutencoes-preventivas/estatisticas/${query}`)
}

// ============================================
// RESPOSTAS DE ITENS DE MANUTENÇÃO
// ============================================

export const getRespostasItemManutencao = async (
  params?: {
    manutencao?: number
    item?: number
    resposta?: string
    page?: number
    page_size?: number
  }
): Promise<PaginatedResponse<RespostaItemManutencao>> => {
  const query = buildQuery(params || {})
  return api<PaginatedResponse<RespostaItemManutencao>>(`/nr12/respostas-manutencao/${query}`)
}

export const getRespostaItemManutencaoDetail = async (
  id: number
): Promise<RespostaItemManutencao> => {
  return api<RespostaItemManutencao>(`/nr12/respostas-manutencao/${id}`)
}

export const createRespostaItemManutencao = async (
  data: RespostaItemManutencaoFormData & { manutencao: number }
): Promise<RespostaItemManutencao> => {
  return api<RespostaItemManutencao>('/nr12/respostas-manutencao', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export const updateRespostaItemManutencao = async (
  id: number,
  data: Partial<RespostaItemManutencaoFormData>
): Promise<RespostaItemManutencao> => {
  return api<RespostaItemManutencao>(`/nr12/respostas-manutencao/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export const deleteRespostaItemManutencao = async (id: number): Promise<void> => {
  return api<void>(`/nr12/respostas-manutencao/${id}`, { method: 'DELETE' })
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calcula a cor do badge baseado no percentual concluído
 */
export const getPercentualColor = (percentual: number): string => {
  if (percentual >= 100) return 'bg-red-100 text-red-800'
  if (percentual >= 80) return 'bg-yellow-100 text-yellow-800'
  if (percentual >= 50) return 'bg-blue-100 text-blue-800'
  return 'bg-green-100 text-green-800'
}

/**
 * Formata a leitura do equipamento com a unidade apropriada
 */
export const formatarLeitura = (
  leitura: string | number,
  tipoMedicao: 'HORIMETRO' | 'ODOMETRO'
): string => {
  const valor = typeof leitura === 'string' ? parseFloat(leitura) : leitura
  const unidade = tipoMedicao === 'HORIMETRO' ? 'h' : 'km'
  return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ${unidade}`
}

/**
 * Calcula o percentual de progresso entre duas leituras
 */
export const calcularPercentualProgresso = (
  leituraInicial: number,
  leituraAtual: number,
  leituraProxima: number
): number => {
  const intervalo = leituraProxima - leituraInicial
  if (intervalo <= 0) return 100

  const progresso = leituraAtual - leituraInicial
  const percentual = (progresso / intervalo) * 100

  return Math.min(Math.max(percentual, 0), 100)
}
