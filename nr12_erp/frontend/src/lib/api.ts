// frontend/src/lib/api.ts - CORRIGIDO E OTIMIZADO
// ✅ CRITICAL: Usa proxy local (/api/proxy) para enviar cookies ao backend
// O proxy lê cookies HTTP-only e adiciona Authorization header
const API_BASE = '/api/proxy';

interface FetchOptions extends RequestInit {
  requireAuth?: boolean;
  skipRedirect?: boolean;
}

/**
 * Wrapper para fetch com tratamento de erros e autenticação automática
 */
async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  return apiFetchBase<T>(API_BASE, endpoint, options);
}

/**
 * Função base para fetch com tratamento de erros e autenticação automática
 */
async function apiFetchBase<T>(
  baseUrl: string,
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { requireAuth = true, skipRedirect = false, ...fetchOptions } = options;

  // ✅ CRÍTICO: Não force Content-Type para permitir FormData funcionar
  // FormData precisa que o browser defina Content-Type com boundary automático
  const headers: Record<string, string> = { ...fetchOptions.headers as Record<string, string> };

  // Só define Content-Type se não foi especificado E o body não é FormData
  if (!headers['Content-Type'] && fetchOptions.body && !(fetchOptions.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const config: RequestInit = {
    ...fetchOptions,
    credentials: 'include', // Envia cookies automaticamente
    redirect: 'manual', // ✅ CRÍTICO: Bloqueia redirects silenciosos
    headers,
  };

  // Retry para cold start do Render (502/503/504)
  const maxRetries = 2;
  const retryDelay = 2000; // 2 segundos

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`🔄 Tentativa ${attempt + 1}/${maxRetries + 1}...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }

      console.log('📤 API Request:', fetchOptions.method || 'GET', `${baseUrl}${endpoint}`);
      const response = await fetch(`${baseUrl}${endpoint}`, config);
      console.log('📥 API Response:', response.status, response.statusText, response.url);

      // ✅ Retry em caso de cold start (502/503/504)
      if ([502, 503, 504].includes(response.status) && attempt < maxRetries) {
        console.warn(`⚠️ Backend iniciando (${response.status}). Aguardando...`);
        continue; // Próxima tentativa
      }

      // ✅ Bloqueia redirects - se acontecer, é um erro de configuração
      if ([301, 302, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        console.error(`🔀 Redirect ${response.status} detectado:`, location);
        throw new Error(`Redirect ${response.status} para: ${location}. Verifique trailing slashes.`);
      }

      if (response.status === 401 && requireAuth) {
        throw new Error('Não autenticado');
      }

      if (!response.ok) {
        let error;
        try {
          error = await response.json();
          console.error('Erro da API (JSON):', error);
        } catch {
          error = { detail: `Erro HTTP ${response.status}: ${response.statusText}` };
          console.error('Erro da API (não-JSON):', error);
        }
        const errorMessage = error.detail || JSON.stringify(error) || `Erro ${response.status}`;
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log('✅ API Success:', data);
        return data;
      }
      return null as T;
    } catch (error) {
      // Se for última tentativa, lança o erro
      if (attempt === maxRetries) {
        console.error('❌ API Error (todas tentativas falharam):', error);
        throw error;
      }
      // Se não for cold start (502/503/504), lança erro imediatamente
      if (error instanceof Error && !error.message.includes('502') && !error.message.includes('503') && !error.message.includes('504')) {
        console.error('❌ API Error:', error);
        throw error;
      }
      console.warn(`⚠️ Tentativa ${attempt + 1} falhou, tentando novamente...`);
    }
  }

  // Não deveria chegar aqui
  throw new Error('Erro desconhecido na requisição');
}

// ============================================
// AUTH API
// ============================================

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface UserProfile {
  role: string;
  modules_enabled: string[];
}

export interface UserCliente {
  id: number;
  nome_razao: string;
  tipo_pessoa: string;
  documento: string;
  email_financeiro?: string;
  telefone?: string;
}

export interface UserSupervisor {
  id: number;
  nome_completo: string;
  cpf: string;
  email?: string;
  telefone?: string;
}

export interface UserOperador {
  id: number;
  nome_completo: string;
  cpf: string;
  email?: string;
  telefone?: string;
}

export interface UserTecnico {
  id: number;
  nome_completo: string;
  cpf: string;
  email?: string;
  telefone?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  profile: UserProfile;
  cliente?: UserCliente | null;
  supervisor?: UserSupervisor | null;
  operador?: UserOperador | null;
  tecnico?: UserTecnico | null;
}

export const authApi = {
  login: async (credentials: LoginCredentials) => {
    return apiFetch<{ detail: string }>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify(credentials),
      requireAuth: false,
    });
  },

  logout: async () => {
    return apiFetch<{ detail: string }>('/auth/logout/', {
      method: 'POST',
    });
  },

  me: async () => {
    // Alinhado ao backend: GET /api/v1/me/
    return apiFetch<User>('/me');
  },

  health: async () => {
    return apiFetch<{ status: string }>('/health', {
      requireAuth: false,
    });
  },
};

// ============================================
// CLIENTES API
// ============================================

export interface Cliente {
  id: number;
  tipo_pessoa: 'PJ' | 'PF';
  nome_razao: string;
  documento: string;
  inscricao_estadual: string;
  email_financeiro: string;
  telefone: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

// ============================================
// HELPER: Converte objeto de parâmetros para query string
// ============================================
function toQuery(params: Record<string, any> = {}): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      q.set(k, String(v));
    }
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

export type ClienteListParams = {
  search?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
};

export const clientesApi = {
  list: async (params: ClienteListParams = {}) => {
    return apiFetch<{ results: Cliente[]; count: number }>(
      `/cadastro/clientes${toQuery(params)}`
    );
  },

  get: async (id: number) => {
    return apiFetch<Cliente>(`/cadastro/clientes/${id}`);
  },

  create: async (data: Partial<Cliente>) => {
    return apiFetch<Cliente>('/cadastro/clientes/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: Partial<Cliente>) => {
    return apiFetch<Cliente>(`/cadastro/clientes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number) => {
    return apiFetch<void>(`/cadastro/clientes/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// EMPREENDIMENTOS API
// ============================================

export interface Empreendimento {
  id: number;
  cliente: number;
  cliente_nome: string;
  supervisor?: number | null;
  supervisor_nome?: string;
  nome: string;
  tipo: 'LAVRA' | 'OBRA' | 'PLANTA' | 'OUTRO';
  distancia_km: string;
  latitude: string | null;
  longitude: string | null;
  raio_geofence?: number;
  endereco_geocodificado?: string;
  link_google_maps?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export type EmpreendimentoListParams = {
  cliente?: number;
  search?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
};

export const empreendimentosApi = {
  list: async (params: EmpreendimentoListParams = {}) => {
    return apiFetch<{ results: Empreendimento[]; count: number }>(
      `/cadastro/empreendimentos${toQuery(params)}`
    );
  },

  get: async (id: number) => {
    return apiFetch<Empreendimento>(`/cadastro/empreendimentos/${id}`);
  },

  create: async (data: Partial<Empreendimento>) => {
    return apiFetch<Empreendimento>('/cadastro/empreendimentos/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: Partial<Empreendimento>) => {
    return apiFetch<Empreendimento>(`/cadastro/empreendimentos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number) => {
    return apiFetch<void>(`/cadastro/empreendimentos/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// GEOLOCALIZAÇÃO API
// ============================================

export interface GeocodificacaoResult {
  endereco_completo: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  uf?: string;
  cep?: string;
  pais?: string;
  latitude: number;
  longitude: number;
  coordenadas_formatadas?: string;
  link_google_maps?: string;
  erro?: string;
}

export interface GeofenceValidationResult {
  validado: boolean;
  dentro_do_raio: boolean | null;
  distancia_metros: number | null;
  raio_geofence: number;
  empreendimento?: {
    id: number;
    nome: string;
    latitude: number;
    longitude: number;
    link_google_maps: string;
  };
  checklist_location?: {
    latitude: number;
    longitude: number;
    link_google_maps: string;
  };
  erro?: string;
}

export const geolocalizacaoApi = {
  /**
   * Converte coordenadas GPS em endereço (geocodificação reversa)
   */
  geocodificar: async (latitude: number, longitude: number) => {
    return apiFetch<GeocodificacaoResult>('/core/geolocalizacao/geocodificar/', {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude }),
    });
  },

  /**
   * Valida se uma localização está dentro do raio de geofence de um empreendimento
   */
  validarGeofence: async (latitude: number, longitude: number, empreendimento_id: number) => {
    return apiFetch<GeofenceValidationResult>('/core/geolocalizacao/validar-geofence/', {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude, empreendimento_id }),
    });
  },
};

// ============================================
// TIPOS DE EQUIPAMENTO API
// ============================================

export interface TipoEquipamento {
  id: number;
  nome: string;
  descricao: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export const tiposEquipamentoApi = {
  list: async () => {
    return apiFetch<{ results: TipoEquipamento[]; count: number }>('/equipamentos/tipos-equipamento');
  },

  get: async (id: number) => {
    return apiFetch<TipoEquipamento>(`/equipamentos/tipos-equipamento/${id}`);
  },

  create: async (data: Partial<TipoEquipamento>) => {
    return apiFetch<TipoEquipamento>('/equipamentos/tipos-equipamento/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: Partial<TipoEquipamento>) => {
    return apiFetch<TipoEquipamento>(`/equipamentos/tipos-equipamento/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number) => {
    return apiFetch<void>(`/equipamentos/tipos-equipamento/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// TIPOS GENÉRICOS
// ============================================

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ============================================
// OPERADORES - TIPOS E API
// ✅ CORRIGIDO: Nomes dos campos correspondem ao backend
// ============================================

export interface Operador {
  id: number;
  nome_completo: string;
  cpf: string;
  data_nascimento?: string;
  telefone?: string;
  email?: string;
  foto?: string;
  funcao?: string;
  matricula?: string;
  ativo: boolean;
  // relacionais resumidos
  clientes?: number[];
  clientes_nomes?: string[];
  empreendimentos_nomes?: string[];
  total_equipamentos?: number;
  total_checklists?: number;
  taxa_aprovacao?: number;
  // Telegram
  telegram_chat_id?: string;
  telegram_username?: string;
  telegram_vinculado?: boolean;
  // endereço
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  // Conformidade NR12
  nr12_curso_data_conclusao?: string;
  nr12_curso_carga_horaria?: number;
  nr12_entidade_formadora?: string;
  nr12_certificado?: string;
  nr12_reciclagem_vencimento?: string;
  nr12_reciclagem_certificado?: string;
  nr12_status?: 'VERDE' | 'AMARELO' | 'VERMELHO';
  nr12_dias_para_vencer?: number;
  nr12_pode_operar?: boolean;
  // Usuário
  user_username?: string;
}

export interface Supervisor {
  id: number;
  nome_completo: string;
  cpf: string;
  data_nascimento?: string;
  telefone?: string;
  ativo: boolean;
  // endereço
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  // acesso
  user_username?: string;
}

export type ListParams = {
  q?: string;           // search
  ordering?: string;    // ex: nome_completo,-id
  page?: number;
  page_size?: number;
  cliente?: number;     // filtro por cliente
  ativo?: boolean;
};

export const operadoresApi = {
  async list(params: ListParams = {}) {
    return apiFetch<{ results: Operador[]; count: number }>(
      `/operadores${toQuery({
        search: params.q,
        ordering: params.ordering,
        page: params.page,
        page_size: params.page_size,
        cliente: params.cliente,
        ativo: params.ativo,
      })}`
    );
  },
  async retrieve(id: number) {
    return apiFetch<Operador>(`/operadores/${id}`);
  },
  async create(data: Partial<Operador>) {
    return apiFetch<Operador>(`/operadores/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },
  async update(id: number, data: Partial<Operador>) {
    return apiFetch<Operador>(`/operadores/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },
  async remove(id: number) {
    return apiFetch<void>(`/operadores/${id}`, { method: "DELETE" });
  },
  async vincularEquipamento(operadorId: number, equipamentoId: number, observacoes?: string) {
    return apiFetch<{ detail: string; autorizacao_id?: number }>(`/operadores/${operadorId}/vincular_equipamento/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ equipamento_id: equipamentoId, observacoes }),
    });
  },
  async desvincularEquipamento(operadorId: number, equipamentoId: number) {
    return apiFetch<{ detail: string }>(`/operadores/${operadorId}/desvincular_equipamento/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ equipamento_id: equipamentoId }),
    });
  },
};

export const supervisoresApi = {
  async list(params: ListParams = {}) {
    return apiFetch<{ results: Supervisor[]; count: number }>(
      `/supervisores${toQuery({
        search: params.q,
        ordering: params.ordering,
        page: params.page,
        page_size: params.page_size,
      })}`
    );
  },
  async retrieve(id: number) {
    return apiFetch<Supervisor>(`/supervisores/${id}`);
  },
  async create(data: Partial<Supervisor>) {
    return apiFetch<Supervisor>(`/supervisores/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },
  async update(id: number, data: Partial<Supervisor>) {
    return apiFetch<Supervisor>(`/supervisores/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },
  async remove(id: number) {
    return apiFetch<void>(`/supervisores/${id}`, { method: "DELETE" });
  },
};

// ============================================
// EQUIPAMENTOS API
// ============================================

export interface Equipamento {
  id: number;
  cliente: number;
  cliente_nome: string;
  empreendimento: number;
  empreendimento_nome: string;
  tipo: number;
  tipo_nome: string;
  codigo: string;
  descricao: string;
  fabricante: string;
  modelo: string;
  ano_fabricacao: number | null;
  numero_serie: string;
  tipo_medicao: 'KM' | 'HORA';
  leitura_atual: string;
  consumo_nominal_L_h: string | null;
  consumo_nominal_km_L: string | null;
  ativo: boolean;
  uuid: string;
  qr_code: string | null;
  criado_em: string;
  atualizado_em: string;
}

export type EquipamentoListParams = {
  cliente?: number;
  empreendimento?: number;
  search?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
};

export const equipamentosApi = {
  list: async (params: EquipamentoListParams = {}) => {
    return apiFetch<{ results: Equipamento[]; count: number }>(
      `/equipamentos/equipamentos${toQuery(params)}`
    );
  },

  get: async (id: number) => {
    return apiFetch<Equipamento>(`/equipamentos/equipamentos/${id}`);
  },

  create: async (data: Partial<Equipamento>) => {
    return apiFetch<Equipamento>('/equipamentos/equipamentos/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: Partial<Equipamento>) => {
    return apiFetch<Equipamento>(`/equipamentos/equipamentos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number) => {
    return apiFetch<void>(`/equipamentos/equipamentos/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// Itens de Manutenção API
// ============================================

export interface ItemManutencao {
  id: number;
  equipamento: number;
  equipamento_codigo: string;
  produto: number;
  produto_nome: string;
  produto_codigo: string;
  unidade_sigla: string;
  categoria: 'FILTRO' | 'OLEO' | 'CORREIA' | 'PNEU' | 'BATERIA' | 'FLUIDO' | 'OUTRO';
  categoria_display: string;
  descricao: string;
  quantidade_necessaria: string;
  periodicidade_km: number | null;
  periodicidade_horas: number | null;
  periodicidade_dias: number | null;
  ativo: boolean;
  observacoes: string;
  criado_em: string;
  atualizado_em: string;
}

export type ItemManutencaoListParams = {
  equipamento?: number;
  categoria?: string;
  search?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
};

export const itensManutencaoApi = {
  list: async (params: ItemManutencaoListParams = {}) => {
    return apiFetch<{ results: ItemManutencao[]; count: number }>(
      `/equipamentos/itens-manutencao${toQuery(params)}`
    );
  },

  get: async (id: number) => {
    return apiFetch<ItemManutencao>(`/equipamentos/itens-manutencao/${id}`);
  },

  create: async (data: Partial<ItemManutencao>) => {
    return apiFetch<ItemManutencao>('/equipamentos/itens-manutencao/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: Partial<ItemManutencao>) => {
    return apiFetch<ItemManutencao>(`/equipamentos/itens-manutencao/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number) => {
    return apiFetch<void>(`/equipamentos/itens-manutencao/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// NR12 API (mantido conforme original)
// ============================================

export interface ModeloChecklist {
  id: number;
  tipo_equipamento: number;
  tipo_equipamento_nome: string;
  nome: string;
  descricao: string;
  periodicidade: 'DIARIO' | 'SEMANAL' | 'QUINZENAL' | 'MENSAL';
  ativo: boolean;
  total_itens: number;
  criado_em: string;
  atualizado_em: string;
}

export interface ItemChecklist {
  id: number;
  modelo: number;
  ordem: number;
  categoria: 'VISUAL' | 'FUNCIONAL' | 'MEDICAO' | 'LIMPEZA' | 'LUBRIFICACAO' | 'DOCUMENTACAO' | 'SEGURANCA' | 'OUTROS';
  pergunta: string;
  descricao_ajuda: string;
  tipo_resposta: 'SIM_NAO' | 'CONFORME' | 'NUMERO' | 'TEXTO';
  obrigatorio: boolean;
  requer_observacao_nao_conforme: boolean;
  foto_obrigatoria: boolean;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface ChecklistRealizado {
  id: number;
  modelo: number;
  modelo_nome: string;
  equipamento: number;
  equipamento_codigo: string;
  equipamento_descricao: string;
  operador: number | null;
  operador_nome: string;  // Nome em texto livre quando não há operador cadastrado
  operador_nome_display: string;  // Nome do operador para exibição (vem do serializer)
  usuario: number | null;
  origem: 'WEB' | 'BOT' | 'MOBILE';
  data_hora_inicio: string;
  data_hora_fim: string | null;
  leitura_equipamento: string | null;
  status: 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';
  resultado_geral: 'APROVADO' | 'APROVADO_RESTRICAO' | 'REPROVADO' | null;
  observacoes_gerais: string;
  total_respostas: number;
  total_nao_conformidades: number;
  latitude: string | null;
  longitude: string | null;
  precisao_gps: string | null;
  geofence_validado: boolean | null;
  geofence_distancia: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface RespostaItemChecklist {
  id: number;
  checklist: number;
  item: number;
  item_pergunta: string;
  item_categoria: string;
  resposta: 'CONFORME' | 'NAO_CONFORME' | 'SIM' | 'NAO' | 'NA' | null;
  valor_numerico: string | null;
  valor_texto: string;
  observacao: string;
  foto: string | null;
  data_hora_resposta: string;
}

export const nr12Api = {
  modelos: {
    list: async (filters?: { tipo_equipamento?: number; ativo?: boolean; search?: string }) => {
      const params = new URLSearchParams();
      if (filters?.tipo_equipamento) params.append('tipo_equipamento', filters.tipo_equipamento.toString());
      if (filters?.ativo !== undefined) params.append('ativo', filters.ativo.toString());
      if (filters?.search) params.append('search', filters.search);
      
      const query = params.toString() ? `?${params.toString()}` : '';
      return apiFetch<{ results: ModeloChecklist[]; count: number }>(`/nr12/modelos-checklist/${query}`);
    },

    get: async (id: number) => {
      return apiFetch<ModeloChecklist & { itens: ItemChecklist[] }>(`/nr12/modelos-checklist/${id}`);
    },

    create: async (data: Partial<ModeloChecklist>) => {
      return apiFetch<ModeloChecklist>('/nr12/modelos-checklist/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update: async (id: number, data: Partial<ModeloChecklist>) => {
      return apiFetch<ModeloChecklist>(`/nr12/modelos-checklist/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    delete: async (id: number) => {
      return apiFetch<void>(`/nr12/modelos-checklist/${id}`, {
        method: 'DELETE',
      });
    },

    duplicar: async (id: number) => {
      return apiFetch<ModeloChecklist>(`/nr12/modelos-checklist/${id}/duplicar/`, {
        method: 'POST',
      });
    },
  },

  itens: {
    list: async (filters?: { modelo?: number; categoria?: string }) => {
      const params = new URLSearchParams();
      if (filters?.modelo) params.append('modelo', filters.modelo.toString());
      if (filters?.categoria) params.append('categoria', filters.categoria);
      
      const query = params.toString() ? `?${params.toString()}` : '';
      return apiFetch<{ results: ItemChecklist[]; count: number }>(`/nr12/itens-checklist/${query}`);
    },

    get: async (id: number) => {
      return apiFetch<ItemChecklist>(`/nr12/itens-checklist/${id}`);
    },

    create: async (data: Partial<ItemChecklist>) => {
      return apiFetch<ItemChecklist>('/nr12/itens-checklist/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update: async (id: number, data: Partial<ItemChecklist>) => {
      return apiFetch<ItemChecklist>(`/nr12/itens-checklist/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    delete: async (id: number) => {
      return apiFetch<void>(`/nr12/itens-checklist/${id}`, {
        method: 'DELETE',
      });
    },

    reordenar: async (itens: { id: number; ordem: number }[]) => {
      return apiFetch<{ detail: string }>('/nr12/itens-checklist/reordenar/', {
        method: 'POST',
        body: JSON.stringify({ itens }),
      });
    },
  },

  checklists: {
    list: async (filters?: { 
      equipamento?: number; 
      modelo?: number;
      status?: string;
      resultado?: string;
      data_inicio?: string;
      data_fim?: string;
    }) => {
      const params = new URLSearchParams();
      if (filters?.equipamento) params.append('equipamento', filters.equipamento.toString());
      if (filters?.modelo) params.append('modelo', filters.modelo.toString());
      if (filters?.status) params.append('status', filters.status);
      if (filters?.resultado) params.append('resultado', filters.resultado);
      if (filters?.data_inicio) params.append('data_inicio', filters.data_inicio);
      if (filters?.data_fim) params.append('data_fim', filters.data_fim);
      
      const query = params.toString() ? `?${params.toString()}` : '';
      return apiFetch<{ results: ChecklistRealizado[]; count: number }>(`/nr12/checklists/${query}`);
    },

    get: async (id: number) => {
      return apiFetch<ChecklistRealizado & { respostas: RespostaItemChecklist[] }>(`/nr12/checklists/${id}`);
    },

    create: async (data: Partial<ChecklistRealizado>) => {
      return apiFetch<ChecklistRealizado>('/nr12/checklists/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    finalizar: async (id: number, observacoes?: string) => {
      return apiFetch<ChecklistRealizado>(`/nr12/checklists/${id}/finalizar/`, {
        method: 'POST',
        body: JSON.stringify({ observacoes_gerais: observacoes }),
      });
    },

    cancelar: async (id: number, motivo?: string) => {
      return apiFetch<ChecklistRealizado>(`/nr12/checklists/${id}/cancelar/`, {
        method: 'POST',
        body: JSON.stringify({ motivo_cancelamento: motivo }),
      });
    },

    estatisticas: async (filters?: { data_inicio?: string; data_fim?: string }) => {
      const params = new URLSearchParams();
      if (filters?.data_inicio) params.append('data_inicio', filters.data_inicio);
      if (filters?.data_fim) params.append('data_fim', filters.data_fim);
      
      const query = params.toString() ? `?${params.toString()}` : '';
      return apiFetch<any>(`/nr12/checklists/estatisticas/${query}`);
    },
  },

  respostas: {
    list: async (checklistId: number) => {
      return apiFetch<{ results: RespostaItemChecklist[]; count: number }>(
        `/nr12/respostas-checklist/?checklist=${checklistId}`
      );
    },

    create: async (data: Partial<RespostaItemChecklist>) => {
      return apiFetch<RespostaItemChecklist>('/nr12/respostas-checklist/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  },
};

// ============================================
// ============================================
// MANUTENÇÕES API
// ============================================

export const manutencoesApi = {
  list: async () => {
    return apiFetch<any[]>('/manutencoes');
  },
  get: async (id: number) => {
    return apiFetch<any>(`/manutencoes/${id}`);
  },
  create: async (data: any) => {
    return apiFetch<any>('/manutencoes/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: number, data: any) => {
    return apiFetch<any>(`/manutencoes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: number) => {
    return apiFetch<void>(`/manutencoes/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// TÉCNICOS API
// ============================================

export const tecnicosApi = {
  list: async () => {
    return apiFetch<any[]>('/tecnicos');
  },
  get: async (id: number) => {
    return apiFetch<any>(`/tecnicos/${id}`);
  },
  create: async (data: any) => {
    return apiFetch<any>('/tecnicos/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: number, data: any) => {
    return apiFetch<any>(`/tecnicos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: number) => {
    return apiFetch<void>(`/tecnicos/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// ABASTECIMENTOS API
// ============================================

export interface Abastecimento {
  id: number;
  equipamento: number;
  equipamento_codigo: string;
  equipamento_descricao: string;
  data: string;
  horimetro_km: string;
  tipo_combustivel: string;
  tipo_combustivel_display: string;
  quantidade_litros: string;
  valor_total: string;
  valor_unitario: string | null;
  local: string;
  local_estoque?: number | null;
  local_estoque_nome?: string;
  produto?: number | null;
  produto_nome?: string;
  operador?: number | null;
  operador_nome?: string;
  observacoes: string;
  numero_nota: string;
  nota_fiscal?: string | null;
  created_at: string;
  updated_at: string;
}

export const abastecimentosApi = {
  list: async (filters?: {
    equipamento?: number;
    data_inicio?: string;
    data_fim?: string;
    tipo_combustivel?: string;
    page?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.equipamento) params.append('equipamento', filters.equipamento.toString());
    if (filters?.data_inicio) params.append('data_inicio', filters.data_inicio);
    if (filters?.data_fim) params.append('data_fim', filters.data_fim);
    if (filters?.tipo_combustivel) params.append('tipo_combustivel', filters.tipo_combustivel);
    if (filters?.page) params.append('page', filters.page.toString());

    const query = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<{ results: Abastecimento[]; count: number }>(`/abastecimentos/${query}`);
  },

  get: async (id: number) => {
    return apiFetch<Abastecimento>(`/abastecimentos/${id}`);
  },

  create: async (data: FormData | any) => {
    const isFormData = data instanceof FormData;
    return apiFetch<Abastecimento>('/abastecimentos/', {
      method: 'POST',
      body: isFormData ? data : JSON.stringify(data),
      headers: isFormData ? {} : { 'Content-Type': 'application/json' },
    });
  },

  update: async (id: number, data: FormData | any) => {
    const isFormData = data instanceof FormData;
    return apiFetch<Abastecimento>(`/abastecimentos/${id}`, {
      method: 'PATCH',
      body: isFormData ? data : JSON.stringify(data),
      headers: isFormData ? {} : { 'Content-Type': 'application/json' },
    });
  },

  delete: async (id: number) => {
    return apiFetch<void>(`/abastecimentos/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// ALMOXARIFADO API
// ============================================

export interface UnidadeMedida {
  id: number;
  sigla: string;
  descricao: string;
}

export interface CategoriaProduto {
  id: number;
  nome: string;
}

export interface Produto {
  id: number;
  nome: string;
  codigo: string;
  tipo: string;
  tipo_display: string;
  categoria: number;
  categoria_nome: string;
  unidade: number;
  unidade_sigla: string;
  ativo: boolean;
  densidade_kg_l?: string | null;
  preco_venda?: number | null;
}

export interface LocalEstoque {
  id: number;
  nome: string;
  tipo: string;
  tipo_display: string;
  fornecedor_nome: string;
}

export interface Estoque {
  id: number;
  produto: number;
  produto_nome: string;
  produto_codigo: string;
  local: number;
  local_nome: string;
  saldo: string;
  unidade: string;
}

export interface MovimentoEstoque {
  id: number;
  produto: number;
  produto_nome: string;
  produto_codigo: string;
  local: number;
  local_nome: string;
  tipo: string;
  tipo_display: string;
  quantidade: string;
  data_hora: string;
  documento: string;
  observacao: string;
  criado_por?: number | null;
  criado_por_nome?: string | null;
}

export const almoxarifadoApi = {
  unidades: {
    list: async () => {
      return apiFetch<{ results: UnidadeMedida[] }>('/almoxarifado/unidades/');
    },
  },

  categorias: {
    list: async () => {
      return apiFetch<{ results: CategoriaProduto[] }>('/almoxarifado/categorias/');
    },
  },

  produtos: {
    list: async (filters?: { tipo?: string; categoria?: number; ativo?: boolean; search?: string }) => {
      const params = new URLSearchParams();
      if (filters?.tipo) params.append('tipo', filters.tipo);
      if (filters?.categoria) params.append('categoria', filters.categoria.toString());
      if (filters?.ativo !== undefined) params.append('ativo', filters.ativo.toString());
      if (filters?.search) params.append('search', filters.search);

      const query = params.toString() ? `?${params.toString()}` : '';
      return apiFetch<{ results: Produto[]; count: number }>(`/almoxarifado/produtos/${query}`);
    },

    get: async (id: number) => {
      return apiFetch<Produto>(`/almoxarifado/produtos/${id}`);
    },

    create: async (data: Partial<Produto>) => {
      return apiFetch<Produto>('/almoxarifado/produtos/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    combustiveis: async () => {
      return apiFetch<Produto[]>('/almoxarifado/produtos/combustiveis');
    },
  },

  locais: {
    list: async (filters?: { tipo?: string }) => {
      const params = new URLSearchParams();
      if (filters?.tipo) params.append('tipo', filters.tipo);

      const query = params.toString() ? `?${params.toString()}` : '';
      return apiFetch<{ results: LocalEstoque[]; count: number }>(`/almoxarifado/locais/${query}`);
    },

    get: async (id: number) => {
      return apiFetch<LocalEstoque>(`/almoxarifado/locais/${id}`);
    },
  },

  estoque: {
    list: async (filters?: { local?: number; tipo_produto?: string; apenas_com_saldo?: boolean }) => {
      const params = new URLSearchParams();
      if (filters?.local) params.append('local', filters.local.toString());
      if (filters?.tipo_produto) params.append('tipo_produto', filters.tipo_produto);
      if (filters?.apenas_com_saldo) params.append('apenas_com_saldo', 'true');

      const query = params.toString() ? `?${params.toString()}` : '';
      return apiFetch<{ results: Estoque[]; count: number }>(`/almoxarifado/estoque/${query}`);
    },

    get: async (id: number) => {
      return apiFetch<Estoque>(`/almoxarifado/estoque/${id}`);
    },

    resumo: async () => {
      return apiFetch<{ total_itens: number; com_saldo: number; sem_saldo: number }>(
        '/almoxarifado/estoque/resumo/'
      );
    },
  },

  movimentos: {
    list: async (filters?: {
      tipo?: string;
      local?: number;
      produto?: number;
      data_inicio?: string;
      data_fim?: string;
    }) => {
      const params = new URLSearchParams();
      if (filters?.tipo) params.append('tipo', filters.tipo);
      if (filters?.local) params.append('local', filters.local.toString());
      if (filters?.produto) params.append('produto', filters.produto.toString());
      if (filters?.data_inicio) params.append('data_inicio', filters.data_inicio);
      if (filters?.data_fim) params.append('data_fim', filters.data_fim);

      const query = params.toString() ? `?${params.toString()}` : '';
      return apiFetch<{ results: MovimentoEstoque[]; count: number }>(`/almoxarifado/movimentos/${query}`);
    },

    create: async (data: any) => {
      return apiFetch<MovimentoEstoque>('/almoxarifado/movimentos/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    ultimos: async () => {
      return apiFetch<MovimentoEstoque[]>('/almoxarifado/movimentos/ultimos');
    },
  },
};

// ============================================
// ORCAMENTOS API
// ============================================

export interface ItemOrcamento {
  id?: number;
  orcamento?: number;
  tipo: 'SERVICO' | 'PRODUTO';
  tipo_display?: string;
  produto?: number;
  produto_codigo?: string;
  produto_nome?: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total?: number;
  observacao?: string;
}

export interface Orcamento {
  id?: number;
  numero?: string;
  tipo: 'MANUTENCAO_CORRETIVA' | 'MANUTENCAO_PREVENTIVA' | 'PRODUTO';
  tipo_display?: string;
  status: 'RASCUNHO' | 'ENVIADO' | 'APROVADO' | 'REJEITADO' | 'CANCELADO';
  status_display?: string;
  cliente: number;
  cliente_nome?: string;
  empreendimento?: number;
  empreendimento_nome?: string;
  equipamento?: number;
  equipamento_codigo?: string;
  equipamento_descricao?: string;
  data_emissao?: string;
  data_validade: string;
  data_aprovacao?: string;
  valor_servicos?: number;
  valor_produtos?: number;
  valor_deslocamento: number;
  valor_desconto: number;
  valor_total?: number;
  descricao?: string;
  observacoes?: string;
  prazo_execucao_dias: number;
  criado_por?: number;
  criado_por_nome?: string;
  aprovado_por?: number;
  aprovado_por_nome?: string;
  itens?: ItemOrcamento[];
  created_at?: string;
  updated_at?: string;
}

export const orcamentosApi = {
  list: async (filters?: {
    tipo?: string;
    status?: string;
    cliente?: number;
    empreendimento?: number;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.tipo) params.append('tipo', filters.tipo);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.cliente) params.append('cliente', filters.cliente.toString());
    if (filters?.empreendimento) params.append('empreendimento', filters.empreendimento.toString());
    if (filters?.search) params.append('search', filters.search);

    const query = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<{ results: Orcamento[]; count: number }>(`/orcamentos/${query}`);
  },

  get: async (id: number) => {
    return apiFetch<Orcamento>(`/orcamentos/${id}/`);
  },

  create: async (data: Partial<Orcamento>) => {
    return apiFetch<Orcamento>('/orcamentos/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: Partial<Orcamento>) => {
    return apiFetch<Orcamento>(`/orcamentos/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number) => {
    return apiFetch<void>(`/orcamentos/${id}/`, {
      method: 'DELETE',
    });
  },

  aprovar: async (id: number) => {
    return apiFetch<Orcamento>(`/orcamentos/${id}/aprovar/`, {
      method: 'POST',
    });
  },

  rejeitar: async (id: number) => {
    return apiFetch<Orcamento>(`/orcamentos/${id}/rejeitar/`, {
      method: 'POST',
    });
  },

  enviar: async (id: number) => {
    return apiFetch<Orcamento>(`/orcamentos/${id}/enviar/`, {
      method: 'POST',
    });
  },

  resumo: async () => {
    return apiFetch<{
      total: number;
      rascunhos: number;
      enviados: number;
      aprovados: number;
      rejeitados: number;
    }>('/orcamentos/resumo/');
  },
};

// ============================================
// ORDENS DE SERVICO API
// ============================================

export interface ItemOrdemServico {
  id?: number;
  ordem_servico?: number;
  tipo: 'SERVICO' | 'PRODUTO';
  tipo_display?: string;
  produto?: number;
  produto_codigo?: string;
  produto_nome?: string;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total?: number;
  observacao?: string;
  executado: boolean;
}

export interface OrdemServico {
  id?: number;
  numero?: string;
  status: 'ABERTA' | 'EM_EXECUCAO' | 'CONCLUIDA' | 'CANCELADA';
  status_display?: string;
  orcamento: number;
  orcamento_numero?: string;
  orcamento_tipo_display?: string;
  cliente: number;
  cliente_nome?: string;
  empreendimento?: number;
  empreendimento_nome?: string;
  equipamento?: number;
  equipamento_codigo?: string;
  equipamento_descricao?: string;
  tecnico_responsavel?: number;
  tecnico_nome?: string;
  data_abertura?: string;
  data_prevista: string;
  data_inicio?: string;
  data_conclusao?: string;
  valor_servicos?: number;
  valor_produtos?: number;
  valor_deslocamento?: number;
  valor_desconto?: number;
  valor_total?: number;
  valor_adicional: number;
  valor_final?: number;
  descricao?: string;
  observacoes?: string;
  aberto_por?: number;
  aberto_por_nome?: string;
  concluido_por?: number;
  concluido_por_nome?: string;
  itens?: ItemOrdemServico[];
  created_at?: string;
  updated_at?: string;
}

export type OrdemServicoListParams = {
  status?: string;
  cliente?: number;
  empreendimento?: number;
  tecnico_responsavel?: number;
  search?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
};

export const ordensServicoApi = {
  list: async (params: OrdemServicoListParams = {}) => {
    return apiFetch<{ results: OrdemServico[]; count: number }>(
      `/ordens-servico${toQuery(params)}`
    );
  },

  get: async (id: number) => {
    return apiFetch<OrdemServico>(`/ordens-servico/${id}/`);
  },

  update: async (id: number, data: Partial<OrdemServico>) => {
    return apiFetch<OrdemServico>(`/ordens-servico/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  iniciar: async (id: number) => {
    return apiFetch<OrdemServico>(`/ordens-servico/${id}/iniciar/`, {
      method: 'POST',
    });
  },

  concluir: async (id: number) => {
    return apiFetch<OrdemServico>(`/ordens-servico/${id}/concluir/`, {
      method: 'POST',
    });
  },

  cancelar: async (id: number) => {
    return apiFetch<OrdemServico>(`/ordens-servico/${id}/cancelar/`, {
      method: 'POST',
    });
  },

  resumo: async () => {
    return apiFetch<{
      total: number;
      abertas: number;
      em_execucao: number;
      concluidas: number;
      canceladas: number;
    }>('/ordens-servico/resumo/');
  },

  corrigirEquipamento: async (id: number, data: { equipamento: number; empreendimento?: number; cliente?: number }) => {
    return apiFetch<{ detail: string; os: OrdemServico }>(`/ordens-servico/${id}/corrigir_equipamento/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

export const itensOrdemServicoApi = {
  list: async (ordemServicoId?: number) => {
    const query = ordemServicoId ? `?ordem_servico=${ordemServicoId}` : '';
    return apiFetch<ItemOrdemServico[]>(`/itens-os/${query}`);
  },

  get: async (id: number) => {
    return apiFetch<ItemOrdemServico>(`/itens-os/${id}/`);
  },

  create: async (data: Partial<ItemOrdemServico>) => {
    return apiFetch<ItemOrdemServico>('/itens-os/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: Partial<ItemOrdemServico>) => {
    return apiFetch<ItemOrdemServico>(`/itens-os/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number) => {
    return apiFetch<void>(`/itens-os/${id}/`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// FINANCEIRO API
// ============================================

export interface ContaReceber {
  id?: number;
  numero?: string;
  tipo: 'ORCAMENTO_PRODUTO' | 'ORDEM_SERVICO' | 'VENDA' | 'OUTROS';
  tipo_display?: string;
  status: 'ABERTA' | 'PAGA' | 'VENCIDA' | 'CANCELADA';
  status_display?: string;
  orcamento?: number;
  orcamento_numero?: string;
  ordem_servico?: number;
  ordem_servico_numero?: string;
  cliente: number;
  cliente_nome?: string;
  cliente_cpf_cnpj?: string;
  data_emissao?: string;
  data_vencimento: string;
  data_pagamento?: string;
  valor_original: number;
  valor_juros: number;
  valor_desconto: number;
  valor_pago: number;
  valor_final?: number;
  descricao?: string;
  observacoes?: string;
  forma_pagamento?: string;
  comprovante?: string;
  criado_por?: number;
  criado_por_nome?: string;
  recebido_por?: number;
  recebido_por_nome?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ContaPagar {
  id?: number;
  numero?: string;
  tipo: 'FORNECEDOR' | 'SALARIO' | 'IMPOSTO' | 'ALUGUEL' | 'SERVICO' | 'OUTROS';
  tipo_display?: string;
  status: 'ABERTA' | 'PAGA' | 'VENCIDA' | 'CANCELADA';
  status_display?: string;
  fornecedor: string;
  documento_fornecedor?: string;
  data_emissao?: string;
  data_vencimento: string;
  data_pagamento?: string;
  valor_original: number;
  valor_juros: number;
  valor_desconto: number;
  valor_pago: number;
  valor_final?: number;
  descricao?: string;
  observacoes?: string;
  numero_documento?: string;
  forma_pagamento?: string;
  comprovante?: string;
  criado_por?: number;
  criado_por_nome?: string;
  pago_por?: number;
  pago_por_nome?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Pagamento {
  id?: number;
  numero?: string;
  conta_receber: number;
  conta_receber_numero?: string;
  cliente_nome?: string;
  cliente_documento?: string;
  tipo_pagamento: 'TOTAL' | 'ADIANTAMENTO' | 'PARCIAL';
  tipo_pagamento_display?: string;
  forma_pagamento: 'DINHEIRO' | 'PIX' | 'CHEQUE' | 'BOLETO' | 'DEPOSITO' | 'TRANSFERENCIA' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO';
  forma_pagamento_display?: string;
  status: 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO';
  status_display?: string;
  valor: number;
  valor_desconto: number;
  valor_final?: number;
  data_pagamento: string;
  numero_parcela?: number;
  total_parcelas?: number;
  numero_cheque?: string;
  banco_cheque?: string;
  data_compensacao?: string;
  numero_documento?: string;
  comprovante?: string;
  observacoes?: string;
  registrado_por?: number;
  registrado_por_nome?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PagamentoParceladoData {
  conta_receber: number;
  valor_total: number;
  valor_desconto?: number;
  forma_pagamento: string;
  numero_parcelas: number;
  data_primeiro_pagamento: string;
  dias_entre_parcelas?: number;
  observacoes?: string;
}

export const financeiroApi = {
  contasReceber: {
    list: async (filters?: {
      tipo?: string;
      status?: string;
      cliente?: number;
      search?: string;
    }) => {
      const params = new URLSearchParams();
      if (filters?.tipo) params.append('tipo', filters.tipo);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.cliente) params.append('cliente', filters.cliente.toString());
      if (filters?.search) params.append('search', filters.search);

      const query = params.toString() ? `?${params.toString()}` : '';
      return apiFetch<{ results: ContaReceber[]; count: number }>(`/financeiro/contas-receber/${query}`);
    },

    get: async (id: number) => {
      return apiFetch<ContaReceber>(`/financeiro/contas-receber/${id}`);
    },

    create: async (data: Partial<ContaReceber>) => {
      return apiFetch<ContaReceber>('/financeiro/contas-receber/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update: async (id: number, data: Partial<ContaReceber>) => {
      return apiFetch<ContaReceber>(`/financeiro/contas-receber/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    receber: async (id: number, data: {
      valor_pago: number;
      forma_pagamento: string;
      comprovante?: string;
    }) => {
      return apiFetch<ContaReceber>(`/financeiro/contas-receber/${id}/receber/`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    resumo: async () => {
      return apiFetch<{
        total: number;
        abertas: number;
        pagas: number;
        vencidas: number;
        total_aberto: number;
        total_vencido: number;
        total_recebido: number;
      }>('/financeiro/contas-receber/resumo/');
    },
  },

  contasPagar: {
    list: async (filters?: {
      tipo?: string;
      status?: string;
      fornecedor?: string;
      search?: string;
    }) => {
      const params = new URLSearchParams();
      if (filters?.tipo) params.append('tipo', filters.tipo);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.fornecedor) params.append('fornecedor', filters.fornecedor);
      if (filters?.search) params.append('search', filters.search);

      const query = params.toString() ? `?${params.toString()}` : '';
      return apiFetch<{ results: ContaPagar[]; count: number }>(`/financeiro/contas-pagar/${query}`);
    },

    get: async (id: number) => {
      return apiFetch<ContaPagar>(`/financeiro/contas-pagar/${id}`);
    },

    create: async (data: Partial<ContaPagar>) => {
      return apiFetch<ContaPagar>('/financeiro/contas-pagar/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update: async (id: number, data: Partial<ContaPagar>) => {
      return apiFetch<ContaPagar>(`/financeiro/contas-pagar/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    pagar: async (id: number, data: {
      valor_pago: number;
      forma_pagamento: string;
      comprovante?: string;
    }) => {
      return apiFetch<ContaPagar>(`/financeiro/contas-pagar/${id}/pagar/`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    resumo: async () => {
      return apiFetch<{
        total: number;
        abertas: number;
        pagas: number;
        vencidas: number;
        total_aberto: number;
        total_vencido: number;
        total_pago: number;
      }>('/financeiro/contas-pagar/resumo/');
    },
  },

  pagamentos: {
    list: async (filters?: {
      conta_receber?: number;
      tipo_pagamento?: string;
      forma_pagamento?: string;
      status?: string;
      search?: string;
    }) => {
      const params = new URLSearchParams();
      if (filters?.conta_receber) params.append('conta_receber', filters.conta_receber.toString());
      if (filters?.tipo_pagamento) params.append('tipo_pagamento', filters.tipo_pagamento);
      if (filters?.forma_pagamento) params.append('forma_pagamento', filters.forma_pagamento);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.search) params.append('search', filters.search);

      const query = params.toString() ? `?${params.toString()}` : '';
      return apiFetch<{ results: Pagamento[]; count: number }>(`/financeiro/pagamentos/${query}`);
    },

    get: async (id: number) => {
      return apiFetch<Pagamento>(`/financeiro/pagamentos/${id}/`);
    },

    create: async (data: Partial<Pagamento>) => {
      return apiFetch<Pagamento>('/financeiro/pagamentos/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update: async (id: number, data: Partial<Pagamento>) => {
      return apiFetch<Pagamento>(`/financeiro/pagamentos/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    delete: async (id: number) => {
      return apiFetch<void>(`/financeiro/pagamentos/${id}/`, {
        method: 'DELETE',
      });
    },

    confirmar: async (id: number) => {
      return apiFetch<Pagamento>(`/financeiro/pagamentos/${id}/confirmar/`, {
        method: 'POST',
      });
    },

    cancelar: async (id: number) => {
      return apiFetch<Pagamento>(`/financeiro/pagamentos/${id}/cancelar/`, {
        method: 'POST',
      });
    },

    parcelar: async (data: PagamentoParceladoData) => {
      return apiFetch<Pagamento[]>('/financeiro/pagamentos/parcelar/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    porConta: async (conta_receber_id: number) => {
      return apiFetch<{
        pagamentos: Pagamento[];
        resumo: {
          total_pagamentos: number;
          total_pago: number;
          total_pendente: number;
        };
      }>(`/financeiro/pagamentos/por_conta/?conta_receber_id=${conta_receber_id}`);
    },
  },
};

// ============================================
// CADASTRO API (Combined)
// ============================================

export const cadastroApi = {
  clientes: clientesApi,
  empreendimentos: empreendimentosApi,
};

export const produtosApi = almoxarifadoApi.produtos;

// ============================================
// COMPRAS API
// ============================================

export interface LocalEntrega {
  id: number;
  nome: string;
  responsavel: string;
  telefone: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  endereco_completo?: string;
  observacoes: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Fornecedor {
  id: number;
  nome: string;
  cnpj_cpf: string;
  contato: string;
  telefone: string;
  whatsapp: string;
  email: string | null;
  especialidade: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  observacoes: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ItemPedidoCompra {
  id?: number;
  pedido?: number;
  produto?: number | null;
  produto_nome?: string;
  descricao: string;
  codigo_fornecedor?: string;
  quantidade: number;
  unidade: string;
  valor_unitario: number;
  valor_total?: number;
  quantidade_recebida?: number;
  entregue?: boolean;
}

export interface PedidoCompra {
  id?: number;
  numero?: string;
  fornecedor: number;
  fornecedor_nome?: string;
  fornecedor_cnpj?: string;
  fornecedor_contato?: string;
  fornecedor_telefone?: string;
  fornecedor_email?: string;
  destino: 'PROPRIO' | 'CLIENTE';
  destino_display?: string;
  orcamento?: number | null;
  orcamento_numero?: string;
  orcamento_valor?: string;
  ordem_servico?: number | null;
  ordem_servico_numero?: string;
  ordem_servico_status?: string;
  ordem_servico_tipo?: string;
  cliente?: number | null;
  cliente_nome?: string;
  cliente_cnpj?: string;
  equipamento?: number | null;
  equipamento_codigo?: string;
  equipamento_descricao?: string;
  equipamento_tipo?: string;
  status: 'RASCUNHO' | 'ENVIADO' | 'APROVADO' | 'PARCIAL' | 'ENTREGUE' | 'CANCELADO';
  status_display?: string;
  data_pedido?: string;
  data_previsao?: string | null;
  data_entrega?: string | null;
  local_estoque?: number | null;
  local_estoque_nome?: string;
  local_entrega?: number | null;
  local_entrega_nome?: string;
  local_entrega_endereco?: string;
  numero_nf?: string;
  nota_fiscal?: string | null;
  observacoes?: string;
  valor_total?: number;
  criado_por?: number;
  criado_por_nome?: string;
  itens?: ItemPedidoCompra[];
  itens_data?: Partial<ItemPedidoCompra>[];
  created_at?: string;
  updated_at?: string;
}

export const locaisEntregaApi = {
  list: async (filters?: { search?: string; ativo?: boolean }) => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.ativo !== undefined) params.append('ativo', filters.ativo.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<{ results: LocalEntrega[]; count: number }>(`/compras/locais-entrega/${query}`);
  },
  get: async (id: number) => {
    return apiFetch<LocalEntrega>(`/compras/locais-entrega/${id}/`);
  },
  create: async (data: Partial<LocalEntrega>) => {
    return apiFetch<LocalEntrega>('/compras/locais-entrega/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: number, data: Partial<LocalEntrega>) => {
    return apiFetch<LocalEntrega>(`/compras/locais-entrega/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: number) => {
    return apiFetch<void>(`/compras/locais-entrega/${id}/`, {
      method: 'DELETE',
    });
  },
};

export const fornecedoresApi = {
  list: async (filters?: { search?: string; ativo?: boolean }) => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.ativo !== undefined) params.append('ativo', filters.ativo.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<{ results: Fornecedor[]; count: number }>(`/compras/fornecedores/${query}`);
  },
  get: async (id: number) => {
    return apiFetch<Fornecedor>(`/compras/fornecedores/${id}/`);
  },
  create: async (data: Partial<Fornecedor>) => {
    return apiFetch<Fornecedor>('/compras/fornecedores/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: number, data: Partial<Fornecedor>) => {
    return apiFetch<Fornecedor>(`/compras/fornecedores/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: number) => {
    return apiFetch<void>(`/compras/fornecedores/${id}/`, {
      method: 'DELETE',
    });
  },
};

export const pedidosCompraApi = {
  list: async (filters?: {
    status?: string;
    destino?: string;
    fornecedor?: number;
    cliente?: number;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.destino) params.append('destino', filters.destino);
    if (filters?.fornecedor) params.append('fornecedor', filters.fornecedor.toString());
    if (filters?.cliente) params.append('cliente', filters.cliente.toString());
    if (filters?.search) params.append('search', filters.search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<{ results: PedidoCompra[]; count: number }>(`/compras/pedidos-compra/${query}`);
  },
  get: async (id: number) => {
    return apiFetch<PedidoCompra>(`/compras/pedidos-compra/${id}/`);
  },
  create: async (data: Partial<PedidoCompra>) => {
    return apiFetch<PedidoCompra>('/compras/pedidos-compra/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: number, data: Partial<PedidoCompra>) => {
    return apiFetch<PedidoCompra>(`/compras/pedidos-compra/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: number) => {
    return apiFetch<void>(`/compras/pedidos-compra/${id}/`, {
      method: 'DELETE',
    });
  },
  enviar: async (id: number) => {
    return apiFetch<PedidoCompra>(`/compras/pedidos-compra/${id}/enviar/`, {
      method: 'POST',
    });
  },
  aprovar: async (id: number) => {
    return apiFetch<PedidoCompra>(`/compras/pedidos-compra/${id}/aprovar/`, {
      method: 'POST',
    });
  },
  receber: async (id: number, data?: { numero_nf?: string; local_estoque?: number }) => {
    return apiFetch<PedidoCompra>(`/compras/pedidos-compra/${id}/receber/`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  },
  cancelar: async (id: number) => {
    return apiFetch<PedidoCompra>(`/compras/pedidos-compra/${id}/cancelar/`, {
      method: 'POST',
    });
  },
  resumo: async () => {
    return apiFetch<{
      total: number;
      rascunhos: number;
      enviados: number;
      aprovados: number;
      entregues: number;
      cancelados: number;
      valor_total_pendente: number;
    }>('/compras/pedidos-compra/resumo/');
  },
};

// ============================================
// MÉTRICAS API (Dashboard de Gestão)
// ============================================

export interface MetricaDashboard {
  periodo: {
    data_inicio: string;
    data_fim: string;
    dias: number;
  };
  totais: {
    equipamentos: number;
    combustivel_litros: number;
    combustivel_valor: number;
    custo_servicos: number;
    custo_produtos: number;
    custo_total: number;
  };
  metricas: {
    disponibilidade_fisica: {
      media_percent: number;
      total_horas_periodo: number;
      total_horas_manutencao: number;
      equipamentos_analisados: number;
      detalhes: Array<{
        equipamento_id: number;
        codigo: string;
        tipo: string;
        horas_manutencao: number;
        disponibilidade_percent: number;
      }>;
    };
    consumo_medio: {
      media_litros_hora: number;
      total_litros: number;
      equipamentos_analisados: number;
      aviso?: string;
      detalhes: Array<{
        equipamento_id: number;
        codigo: string;
        tipo: string;
        tipo_medicao: string;
        litros_total: number;
        diferenca_leitura: number;
        consumo_medio: number;
        unidade: string;
      }>;
    };
    utilizacao_frota: {
      percentual: number;
      operando: number;
      parados: number;
      total: number;
      equipamentos_parados: Array<{
        id: number;
        codigo: string;
        descricao: string;
        leitura_atual: string;
        tipo__nome: string;
      }>;
    };
    cph: {
      cph_medio: number;
      custo_total: number;
      horas_totais: number;
      equipamentos_analisados: number;
      aviso?: string;
      detalhes: Array<{
        equipamento_id: number;
        codigo: string;
        tipo: string;
        custo_combustivel: number;
        custo_mao_obra: number;
        custo_pecas: number;
        custo_total: number;
        horas_trabalhadas: number;
        cph: number;
      }>;
    };
  };
  alertas: {
    total: number;
    criticos: number;
    urgentes: number;
    lista: AlertaManutencao[];
  };
  graficos: {
    consumo_por_equipamento: Array<{
      codigo: string;
      descricao: string;
      tipo: string;
      litros: number;
    }>;
  };
  aviso?: string;
}

export interface AlertaManutencao {
  equipamento_id: number;
  codigo: string;
  tipo_equipamento: string;
  item: string;
  tipo: 'PLANO' | 'MANUTENCAO';
  leitura_atual: number;
  proxima_leitura: number;
  diferenca: number;
  unidade: string;
  prioridade: 'CRITICO' | 'URGENTE' | 'ATENCAO';
  status: 'VENCIDO' | 'PROXIMO' | 'PROGRAMAR';
  periodicidade?: string;
  ultima_manutencao?: string;
}

export interface MetricasFiltros {
  data_inicio?: string;
  data_fim?: string;
  empreendimento?: number;
}

// ============================================
// FIO DIAMANTADO API
// ============================================

export interface FioDiamantado {
  id: number;
  cliente: number;
  cliente_nome?: string;
  codigo: string;
  fabricante: string;
  numero_serie?: string;
  comprimento_metros: number;
  perolas_por_metro: number;
  diametro_inicial_mm: number;
  diametro_minimo_mm: number;
  diametro_atual_mm?: number;
  desgaste_total_mm?: number;
  percentual_vida_util?: number;
  area_total_cortada_m2?: number;
  total_perolas?: number;
  precisa_substituicao?: boolean;
  status: 'ATIVO' | 'FINALIZADO' | 'MANUTENCAO';
  status_display?: string;
  // Novos campos de logistica e financeiro
  nota_fiscal?: string;
  fornecedor?: string;
  valor_por_metro?: number;
  valor_total?: number;
  data_compra?: string;
  localizacao: 'ALMOXARIFADO' | 'EMPREENDIMENTO' | 'MAQUINA';
  localizacao_display?: string;
  empreendimento?: number;
  empreendimento_nome?: string;
  maquina_instalada?: number;
  maquina_instalada_codigo?: string;
  custo_por_m2?: number;
  custo_por_mm_desgaste?: number;
  total_cortes?: number;
  cortes_em_andamento?: number;
  observacoes?: string;
  data_cadastro?: string;
  criado_em?: string;
  atualizado_em?: string;
}

export interface FioDiamantadoMetricas {
  total_cortes: number;
  cortes_em_andamento?: number;
  area_total_m2: number;
  tempo_total_horas: number;
  velocidade_media_m2h: number;
  rendimento_m2_por_mm?: number;
  rendimento_acumulado_m2_mm?: number;
  eficiencia_m2_metro_fio?: number;
  consumo_total_combustivel: number;
  custo_combustivel?: number;
  custo_total_combustivel?: number;
}

export interface RegistroCorte {
  id: number;
  fio: number;
  fio_codigo?: string;
  fio_fabricante?: string;
  maquina: number;
  maquina_codigo?: string;
  maquina_descricao?: string;
  gerador?: number | null;
  gerador_codigo?: string;
  empreendimento?: number;
  empreendimento_nome?: string;
  fonte_energia: 'GERADOR_DIESEL' | 'REDE_ELETRICA';
  fonte_energia_display?: string;
  status: 'EM_ANDAMENTO' | 'FINALIZADO' | 'CANCELADO';
  status_display?: string;
  data: string;
  hora_inicial: string;
  data_final?: string;
  hora_final?: string;
  horimetro_inicial: number;
  horimetro_final?: number;
  comprimento_corte_m?: number;
  altura_largura_corte_m?: number;
  diametro_inicial_mm: number;
  diametro_final_mm?: number;
  area_corte_m2?: number;
  tempo_execucao_horas?: number;
  desgaste_mm?: number;
  velocidade_corte_m2h?: number;
  consumo_combustivel_litros?: number;
  custo_combustivel?: number;
  custo_metro_fio?: number;
  rendimento_m2_por_mm?: number;
  operador_nome?: string;
  observacoes?: string;
  criado_em?: string;
  atualizado_em?: string;
}

export interface CorteEmAndamento {
  id: number;
  fio: number;
  fio_codigo: string;
  fio_fabricante: string;
  maquina: number;
  maquina_codigo: string;
  maquina_descricao: string;
  empreendimento: number;
  empreendimento_nome: string;
  cliente_nome: string;
  fonte_energia: 'GERADOR_DIESEL' | 'REDE_ELETRICA';
  fonte_energia_display: string;
  data: string;
  hora_inicial: string;
  horimetro_inicial: number;
  diametro_inicial_mm: number;
  operador_nome?: string;
  tempo_decorrido: number;
  criado_em: string;
}

export interface MovimentacaoFio {
  id: number;
  fio: number;
  fio_codigo?: string;
  tipo: 'ENTRADA' | 'SAIDA_EMPREENDIMENTO' | 'INSTALACAO_MAQUINA' | 'REMOCAO_MAQUINA' | 'RETORNO_ALMOXARIFADO';
  tipo_display?: string;
  data: string;
  empreendimento_origem?: number;
  empreendimento_origem_nome?: string;
  empreendimento_destino?: number;
  empreendimento_destino_nome?: string;
  maquina?: number;
  maquina_codigo?: string;
  responsavel?: string;
  observacoes?: string;
  criado_em?: string;
}

export interface HistoricoDesgaste {
  data: string;
  diametro_mm: number;
  area_corte_m2: number;
  area_acumulada_m2: number;
}

export interface DashboardFioDiamantado {
  totais: {
    fios_ativos: number;
    fios_criticos: number;
    fios_urgentes: number;
    area_total_cortada_m2: number;
    valor_total_fios?: number;
    cortes_em_andamento: number;
  };
  alertas: Array<{
    tipo: 'CRITICO' | 'URGENTE' | 'ATENCAO';
    fio_id: number;
    fio_codigo: string;
    mensagem: string;
    diametro_atual?: number;
    percentual_restante?: number;
  }>;
  cortes_em_andamento: CorteEmAndamento[];
  fios: Array<{
    id: number;
    codigo: string;
    fabricante: string;
    diametro_atual: number;
    percentual_vida_util: number;
    area_total_m2: number;
    localizacao: string;
    localizacao_display: string;
    empreendimento_nome?: string;
    valor_total?: number;
    custo_por_m2?: number;
  }>;
  cortes_recentes: RegistroCorte[];
  metricas_30_dias: {
    total_cortes: number;
    area_total_m2: number;
    tempo_total_horas: number;
    consumo_combustivel_litros: number;
    custo_combustivel: number;
  };
}

export const fioDiamantadoApi = {
  fios: {
    list: async (filters?: { status?: string; cliente?: number; search?: string; localizacao?: string; empreendimento?: number }) => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.cliente) params.append('cliente', filters.cliente.toString());
      if (filters?.search) params.append('search', filters.search);
      if (filters?.localizacao) params.append('localizacao', filters.localizacao);
      if (filters?.empreendimento) params.append('empreendimento', filters.empreendimento.toString());
      const query = params.toString() ? `?${params.toString()}` : '';
      return apiFetch<{ results: FioDiamantado[]; count: number }>(`/fio-diamantado/fios/${query}`);
    },

    get: async (id: number) => {
      return apiFetch<FioDiamantado & { metricas?: FioDiamantadoMetricas }>(`/fio-diamantado/fios/${id}/`);
    },

    create: async (data: Partial<FioDiamantado>) => {
      return apiFetch<FioDiamantado>('/fio-diamantado/fios/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update: async (id: number, data: Partial<FioDiamantado>) => {
      return apiFetch<FioDiamantado>(`/fio-diamantado/fios/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    delete: async (id: number) => {
      return apiFetch<void>(`/fio-diamantado/fios/${id}/`, {
        method: 'DELETE',
      });
    },

    historicoDesgaste: async (id: number) => {
      return apiFetch<HistoricoDesgaste[]>(`/fio-diamantado/fios/${id}/historico_desgaste/`);
    },

    movimentacoes: async (id: number) => {
      return apiFetch<MovimentacaoFio[]>(`/fio-diamantado/fios/${id}/movimentacoes/`);
    },

    transferir: async (id: number, data: Partial<MovimentacaoFio>) => {
      return apiFetch<{ message: string }>(`/fio-diamantado/fios/${id}/transferir/`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    dashboard: async (id: number) => {
      return apiFetch<{
        fio: FioDiamantado & { metricas?: FioDiamantadoMetricas };
        historico_desgaste: HistoricoDesgaste[];
        custos_por_fonte: {
          diesel: { area_total_m2: number; consumo_litros: number; tempo_horas: number; custo_total: number };
          rede_eletrica: { area_total_m2: number; tempo_horas: number; custo_estimado: number };
        };
        alertas: Array<{ tipo: string; mensagem: string; diametro_atual?: number; percentual_restante?: number }>;
        cortes_em_andamento: CorteEmAndamento[];
      }>(`/fio-diamantado/fios/${id}/dashboard/`);
    },

    resumo: async () => {
      return apiFetch<{
        totais: { total: number; ativos: number; finalizados: number; manutencao: number };
        por_localizacao: Array<{ localizacao: string; total: number }>;
        alertas: Array<{ id: number; codigo: string; diametro_atual?: number; diametro_minimo?: number; percentual_vida_util?: number; tipo_alerta?: string }>;
      }>('/fio-diamantado/fios/resumo/');
    },
  },

  movimentacoes: {
    list: async (filters?: { fio?: number; tipo?: string }) => {
      const params = new URLSearchParams();
      if (filters?.fio) params.append('fio', filters.fio.toString());
      if (filters?.tipo) params.append('tipo', filters.tipo);
      const query = params.toString() ? `?${params.toString()}` : '';
      return apiFetch<{ results: MovimentacaoFio[]; count: number }>(`/fio-diamantado/movimentacoes/${query}`);
    },

    create: async (data: Partial<MovimentacaoFio>) => {
      return apiFetch<MovimentacaoFio>('/fio-diamantado/movimentacoes/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  },

  cortes: {
    list: async (filters?: {
      fio?: number;
      maquina?: number;
      empreendimento?: number;
      status?: string;
      data_inicio?: string;
      data_fim?: string;
      fonte_energia?: string;
    }) => {
      const params = new URLSearchParams();
      if (filters?.fio) params.append('fio', filters.fio.toString());
      if (filters?.maquina) params.append('maquina', filters.maquina.toString());
      if (filters?.empreendimento) params.append('empreendimento', filters.empreendimento.toString());
      if (filters?.status) params.append('status', filters.status);
      if (filters?.data_inicio) params.append('data_inicio', filters.data_inicio);
      if (filters?.data_fim) params.append('data_fim', filters.data_fim);
      if (filters?.fonte_energia) params.append('fonte_energia', filters.fonte_energia);
      const query = params.toString() ? `?${params.toString()}` : '';
      return apiFetch<{ results: RegistroCorte[]; count: number }>(`/fio-diamantado/cortes/${query}`);
    },

    get: async (id: number) => {
      return apiFetch<RegistroCorte>(`/fio-diamantado/cortes/${id}/`);
    },

    create: async (data: Partial<RegistroCorte>) => {
      return apiFetch<RegistroCorte>('/fio-diamantado/cortes/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update: async (id: number, data: Partial<RegistroCorte>) => {
      return apiFetch<RegistroCorte>(`/fio-diamantado/cortes/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    delete: async (id: number) => {
      return apiFetch<void>(`/fio-diamantado/cortes/${id}/`, {
        method: 'DELETE',
      });
    },

    // Novo fluxo: Iniciar Corte
    iniciar: async (data: {
      fio: number;
      maquina: number;
      gerador?: number;
      empreendimento: number;
      fonte_energia: string;
      data: string;
      hora_inicial: string;
      horimetro_inicial: number;
      diametro_inicial_mm: number;
      operador_nome?: string;
      observacoes?: string;
    }) => {
      return apiFetch<RegistroCorte>('/fio-diamantado/cortes/iniciar/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    // Novo fluxo: Finalizar Corte
    finalizar: async (id: number, data: {
      hora_final: string;
      horimetro_final: number;
      diametro_final_mm: number;
      comprimento_corte_m: number;
      altura_largura_corte_m: number;
      consumo_combustivel_litros?: number;
      observacoes?: string;
    }) => {
      return apiFetch<RegistroCorte>(`/fio-diamantado/cortes/${id}/finalizar/`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    // Cancelar corte em andamento
    cancelar: async (id: number, motivo?: string) => {
      return apiFetch<RegistroCorte>(`/fio-diamantado/cortes/${id}/cancelar/`, {
        method: 'POST',
        body: JSON.stringify({ motivo }),
      });
    },

    // Listar cortes em andamento
    emAndamento: async () => {
      return apiFetch<CorteEmAndamento[]>('/fio-diamantado/cortes/em_andamento/');
    },

    metricas: async (filters?: { data_inicio?: string; data_fim?: string }) => {
      const params = new URLSearchParams();
      if (filters?.data_inicio) params.append('data_inicio', filters.data_inicio);
      if (filters?.data_fim) params.append('data_fim', filters.data_fim);
      const query = params.toString() ? `?${params.toString()}` : '';
      return apiFetch<{
        totais: {
          total_cortes: number;
          area_total_m2: number;
          tempo_total_horas: number;
          velocidade_media_m2h: number;
          desgaste_total_mm: number;
          consumo_combustivel_litros: number;
          custo_combustivel: number;
        };
        por_fonte_energia: Array<{ fonte_energia: string; cortes: number; area: number; tempo: number }>;
        por_fio: Array<{ fio__codigo: string; fio_id: number; cortes: number; area: number; desgaste: number }>;
      }>(`/fio-diamantado/cortes/metricas/${query}`);
    },
  },

  dashboard: async () => {
    return apiFetch<DashboardFioDiamantado>('/fio-diamantado/dashboard/');
  },
};

export const metricasApi = {
  dashboard: async (filters?: MetricasFiltros) => {
    const params = new URLSearchParams();
    if (filters?.data_inicio) params.append('data_inicio', filters.data_inicio);
    if (filters?.data_fim) params.append('data_fim', filters.data_fim);
    if (filters?.empreendimento) params.append('empreendimento', filters.empreendimento.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<MetricaDashboard>(`/relatorios/metricas/dashboard/${query}`);
  },

  disponibilidade: async (filters?: MetricasFiltros) => {
    const params = new URLSearchParams();
    if (filters?.data_inicio) params.append('data_inicio', filters.data_inicio);
    if (filters?.data_fim) params.append('data_fim', filters.data_fim);
    if (filters?.empreendimento) params.append('empreendimento', filters.empreendimento.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<{ periodo: { data_inicio: string; data_fim: string }; dados: MetricaDashboard['metricas']['disponibilidade_fisica'] }>(
      `/relatorios/metricas/disponibilidade/${query}`
    );
  },

  consumo: async (filters?: MetricasFiltros) => {
    const params = new URLSearchParams();
    if (filters?.data_inicio) params.append('data_inicio', filters.data_inicio);
    if (filters?.data_fim) params.append('data_fim', filters.data_fim);
    if (filters?.empreendimento) params.append('empreendimento', filters.empreendimento.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<{ periodo: { data_inicio: string; data_fim: string }; dados: MetricaDashboard['metricas']['consumo_medio'] }>(
      `/relatorios/metricas/consumo/${query}`
    );
  },

  utilizacao: async (filters?: MetricasFiltros) => {
    const params = new URLSearchParams();
    if (filters?.data_inicio) params.append('data_inicio', filters.data_inicio);
    if (filters?.data_fim) params.append('data_fim', filters.data_fim);
    if (filters?.empreendimento) params.append('empreendimento', filters.empreendimento.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<{ periodo: { data_inicio: string; data_fim: string }; dados: MetricaDashboard['metricas']['utilizacao_frota'] }>(
      `/relatorios/metricas/utilizacao/${query}`
    );
  },

  cph: async (filters?: MetricasFiltros) => {
    const params = new URLSearchParams();
    if (filters?.data_inicio) params.append('data_inicio', filters.data_inicio);
    if (filters?.data_fim) params.append('data_fim', filters.data_fim);
    if (filters?.empreendimento) params.append('empreendimento', filters.empreendimento.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<{ periodo: { data_inicio: string; data_fim: string }; dados: MetricaDashboard['metricas']['cph'] }>(
      `/relatorios/metricas/cph/${query}`
    );
  },

  alertasManutencao: async (empreendimento?: number) => {
    const params = new URLSearchParams();
    if (empreendimento) params.append('empreendimento', empreendimento.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<{
      total: number;
      criticos: number;
      urgentes: number;
      atencao: number;
      alertas: AlertaManutencao[];
    }>(`/relatorios/metricas/alertas-manutencao/${query}`);
  },

  exportar: async (filters?: MetricasFiltros) => {
    const params = new URLSearchParams();
    if (filters?.data_inicio) params.append('data_inicio', filters.data_inicio);
    if (filters?.data_fim) params.append('data_fim', filters.data_fim);
    if (filters?.empreendimento) params.append('empreendimento', filters.empreendimento.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<any>(`/relatorios/metricas/exportar/${query}`);
  },
};

// EXPORT DEFAULT
// ============================================

export default {
  auth: authApi,
  clientes: clientesApi,
  empreendimentos: empreendimentosApi,
  tiposEquipamento: tiposEquipamentoApi,
  equipamentos: equipamentosApi,
  nr12: nr12Api,
  operadores: operadoresApi,
  supervisores: supervisoresApi,
  manutencoes: manutencoesApi,
  tecnicos: tecnicosApi,
  abastecimentos: abastecimentosApi,
  almoxarifado: almoxarifadoApi,
  orcamentos: orcamentosApi,
  ordensServico: ordensServicoApi,
  financeiro: financeiroApi,
  locaisEntrega: locaisEntregaApi,
  fornecedores: fornecedoresApi,
  pedidosCompra: pedidosCompraApi,
  metricas: metricasApi,
  fioDiamantado: fioDiamantadoApi,
};


export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  // Todos os endpoints agora usam API_BASE (/api/v1)
  const baseUrl = API_BASE;

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
    },
    credentials: 'include', // CRÍTICO: Adicionar para enviar cookies de autenticação
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}
