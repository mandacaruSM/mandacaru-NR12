// frontend/src/types/manutencao-preventiva.ts

export type TipoMedicao = 'HORIMETRO' | 'ODOMETRO'

export type CategoriaItemManutencao =
  | 'TROCA_OLEO'
  | 'TROCA_FILTRO'
  | 'LUBRIFICACAO'
  | 'INSPECAO'
  | 'AJUSTE'
  | 'LIMPEZA'
  | 'SUBSTITUICAO'
  | 'TESTE'
  | 'MEDICAO'
  | 'OUTROS'

export type TipoRespostaItem = 'EXECUTADO' | 'CONFORME' | 'NUMERO' | 'TEXTO'

export type StatusProgramacao = 'ATIVA' | 'PENDENTE' | 'EM_ATRASO' | 'INATIVA'

export type StatusManutencao = 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA'

export type ResultadoManutencao = 'COMPLETA' | 'COMPLETA_RESTRICAO' | 'INCOMPLETA'

export type RespostaItem = 'EXECUTADO' | 'NAO_EXECUTADO' | 'CONFORME' | 'NAO_CONFORME' | 'NA'

// Modelo de Manutenção Preventiva
export interface ModeloManutencaoPreventiva {
  id: number
  tipo_equipamento: number
  tipo_equipamento_nome: string
  nome: string
  descricao: string
  tipo_medicao: TipoMedicao
  tipo_medicao_display: string
  intervalo: string // DecimalField
  tolerancia: string // DecimalField
  ativo: boolean
  total_itens?: number
  criado_em: string
  atualizado_em: string
}

export interface ModeloManutencaoPreventivaDetail extends ModeloManutencaoPreventiva {
  itens: ItemManutencaoPreventiva[]
}

// Item de Manutenção Preventiva
export interface ItemManutencaoPreventiva {
  id: number
  modelo: number
  ordem: number
  categoria: CategoriaItemManutencao
  descricao: string
  instrucoes: string
  tipo_resposta: TipoRespostaItem
  obrigatorio: boolean
  requer_observacao_nao_conforme: boolean
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

// Programação de Manutenção
export interface ProgramacaoManutencao {
  id: number
  equipamento: number
  equipamento_codigo: string
  equipamento_descricao: string
  modelo: number
  modelo_nome: string
  modelo_intervalo: string
  tipo_medicao: TipoMedicao
  tipo_medicao_display: string
  leitura_inicial: string
  leitura_ultima_manutencao: string
  leitura_proxima_manutencao: string
  status: StatusProgramacao
  status_display: string
  percentual_concluido?: number
  falta_para_manutencao?: string
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

// Manutenção Preventiva Realizada
export interface ManutencaoPreventivaRealizada {
  id: number
  programacao: number
  equipamento: number
  equipamento_codigo: string
  equipamento_descricao: string
  modelo: number
  modelo_nome: string
  tecnico: number | null
  tecnico_nome: string
  tecnico_nome_display: string
  usuario: number | null
  origem: 'WEB' | 'BOT' | 'MOBILE'
  data_hora_inicio: string
  data_hora_fim: string | null
  leitura_equipamento: string
  status: StatusManutencao
  status_display: string
  resultado_geral: ResultadoManutencao | null
  resultado_geral_display: string
  observacoes_gerais: string
  manutencao: number | null
  total_respostas?: number
  total_nao_conformidades?: number
  criado_em: string
  atualizado_em: string
}

export interface ManutencaoPreventivaRealizadaDetail extends ManutencaoPreventivaRealizada {
  respostas: RespostaItemManutencao[]
}

// Resposta Item Manutenção
export interface RespostaItemManutencao {
  id: number
  manutencao: number
  item: number
  item_descricao: string
  item_categoria: CategoriaItemManutencao
  resposta: RespostaItem | null
  valor_numerico: string | null
  valor_texto: string
  observacao: string
  foto: string | null
  data_hora_resposta: string
}

// Form Data Types
export interface ModeloManutencaoPreventivaFormData {
  tipo_equipamento: number
  nome: string
  descricao: string
  tipo_medicao: TipoMedicao
  intervalo: number
  tolerancia: number
  ativo: boolean
}

export interface ItemManutencaoPreventivaFormData {
  modelo?: number
  ordem: number
  categoria: CategoriaItemManutencao
  descricao: string
  instrucoes: string
  tipo_resposta: TipoRespostaItem
  obrigatorio: boolean
  requer_observacao_nao_conforme: boolean
  ativo: boolean
}

export interface ProgramacaoManutencaoFormData {
  equipamento: number
  modelo: number
  leitura_inicial: number
  leitura_ultima_manutencao: number
  leitura_proxima_manutencao: number
  ativo: boolean
}

export interface RespostaItemManutencaoFormData {
  item: number
  resposta?: RespostaItem
  valor_numerico?: number
  valor_texto?: string
  observacao?: string
}

export interface ManutencaoPreventivaRealizadaFormData {
  programacao: number
  equipamento: number
  modelo: number
  tecnico?: number
  tecnico_nome?: string
  origem: 'WEB' | 'BOT' | 'MOBILE'
  leitura_equipamento: number
  observacoes_gerais?: string
  respostas?: RespostaItemManutencaoFormData[]
  // Geolocalização
  latitude?: number
  longitude?: number
  precisao_gps?: number
}

// Dashboard Stats
export interface DashboardProgramacoes {
  total: number
  ativas: number
  pendentes: number
  em_atraso: number
  proximas_manutencoes: Array<{
    id: number
    equipamento__codigo: string
    equipamento__descricao: string
    modelo__nome: string
    leitura_proxima_manutencao: string
    status: StatusProgramacao
  }>
  por_status: Array<{
    status: StatusProgramacao
    total: number
  }>
}

export interface EstatisticasManutencoes {
  total: number
  concluidas: number
  em_andamento: number
  canceladas: number
  completas: number
  completas_restricao: number
  incompletas: number
  por_equipamento: Array<{
    equipamento__codigo: string
    equipamento__descricao: string
    total: number
  }>
  por_modelo: Array<{
    modelo__nome: string
    total: number
  }>
  por_tecnico: Array<{
    tecnico__nome: string
    total: number
  }>
}

// API Response Types
export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

// Category Labels
export const CATEGORIA_ITEM_LABELS: Record<CategoriaItemManutencao, string> = {
  TROCA_OLEO: 'Troca de Óleo',
  TROCA_FILTRO: 'Troca de Filtro',
  LUBRIFICACAO: 'Lubrificação',
  INSPECAO: 'Inspeção',
  AJUSTE: 'Ajuste/Regulagem',
  LIMPEZA: 'Limpeza',
  SUBSTITUICAO: 'Substituição de Peças',
  TESTE: 'Teste Funcional',
  MEDICAO: 'Medição',
  OUTROS: 'Outros',
}

export const CATEGORIAS_ITEM_MANUTENCAO: CategoriaItemManutencao[] = [
  'TROCA_OLEO',
  'TROCA_FILTRO',
  'LUBRIFICACAO',
  'INSPECAO',
  'AJUSTE',
  'LIMPEZA',
  'SUBSTITUICAO',
  'TESTE',
  'MEDICAO',
  'OUTROS',
]

export const TIPO_RESPOSTA_LABELS: Record<TipoRespostaItem, string> = {
  EXECUTADO: 'Executado/Não Executado',
  CONFORME: 'Conforme/Não Conforme',
  NUMERO: 'Valor Numérico',
  TEXTO: 'Texto Livre',
}

export const TIPO_RESPOSTA_ITEM: TipoRespostaItem[] = [
  'EXECUTADO',
  'CONFORME',
  'NUMERO',
  'TEXTO',
]

// Status Labels and Colors
export const STATUS_PROGRAMACAO_LABELS: Record<StatusProgramacao, string> = {
  ATIVA: 'Ativa',
  PENDENTE: 'Pendente',
  EM_ATRASO: 'Em Atraso',
  INATIVA: 'Inativa',
}

export const STATUS_PROGRAMACAO_COLORS: Record<StatusProgramacao, string> = {
  ATIVA: 'bg-green-100 text-green-800',
  PENDENTE: 'bg-yellow-100 text-yellow-800',
  EM_ATRASO: 'bg-red-100 text-red-800',
  INATIVA: 'bg-gray-100 text-gray-800',
}

export const STATUS_MANUTENCAO_LABELS: Record<StatusManutencao, string> = {
  EM_ANDAMENTO: 'Em Andamento',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
}

export const STATUS_MANUTENCAO_COLORS: Record<StatusManutencao, string> = {
  EM_ANDAMENTO: 'bg-blue-100 text-blue-800',
  CONCLUIDA: 'bg-green-100 text-green-800',
  CANCELADA: 'bg-gray-100 text-gray-800',
}

export const RESULTADO_MANUTENCAO_LABELS: Record<ResultadoManutencao, string> = {
  COMPLETA: 'Completa',
  COMPLETA_RESTRICAO: 'Completa com Restrição',
  INCOMPLETA: 'Incompleta',
}

export const RESULTADO_MANUTENCAO_COLORS: Record<ResultadoManutencao, string> = {
  COMPLETA: 'bg-green-100 text-green-800',
  COMPLETA_RESTRICAO: 'bg-yellow-100 text-yellow-800',
  INCOMPLETA: 'bg-red-100 text-red-800',
}
