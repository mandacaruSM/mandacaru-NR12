// frontend/src/lib/api.ts - CORRIGIDO E OTIMIZADO
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
const API_BASE_V0 = process.env.NEXT_PUBLIC_API_URL?.replace('/v1', '') || 'http://localhost:8000/api';

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
 * Wrapper para fetch usando API_BASE_V0 (para manutenções e técnicos)
 */
async function apiFetchV0<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  return apiFetchBase<T>(API_BASE_V0, endpoint, options);
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

  const config: RequestInit = {
    ...fetchOptions,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  };

  try {
    console.log('📤 API Request:', fetchOptions.method || 'GET', `${baseUrl}${endpoint}`);
    const response = await fetch(`${baseUrl}${endpoint}`, config);
    console.log('📥 API Response:', response.status, response.statusText, response.url);

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
    console.error('❌ API Error:', error);
    throw error;
  }
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

export interface User {
  id: number;
  username: string;
  email: string;
  profile: UserProfile;
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
    return apiFetch<User>('/me/');
  },

  health: async () => {
    return apiFetch<{ status: string }>('/health/', {
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

export const clientesApi = {
  list: async (search?: string) => {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    return apiFetch<{ results: Cliente[]; count: number }>(`/cadastro/clientes/${params}`);
  },

  get: async (id: number) => {
    return apiFetch<Cliente>(`/cadastro/clientes/${id}/`);
  },

  create: async (data: Partial<Cliente>) => {
    return apiFetch<Cliente>('/cadastro/clientes/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: Partial<Cliente>) => {
    return apiFetch<Cliente>(`/cadastro/clientes/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number) => {
    return apiFetch<void>(`/cadastro/clientes/${id}/`, {
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

export const empreendimentosApi = {
  list: async (filters?: { cliente?: number; search?: string }) => {
    const params = new URLSearchParams();
    if (filters?.cliente) params.append('cliente', filters.cliente.toString());
    if (filters?.search) params.append('search', filters.search);

    const query = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<{ results: Empreendimento[]; count: number }>(`/cadastro/empreendimentos/${query}`);
  },

  get: async (id: number) => {
    return apiFetch<Empreendimento>(`/cadastro/empreendimentos/${id}/`);
  },

  create: async (data: Partial<Empreendimento>) => {
    return apiFetch<Empreendimento>('/cadastro/empreendimentos/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: Partial<Empreendimento>) => {
    return apiFetch<Empreendimento>(`/cadastro/empreendimentos/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number) => {
    return apiFetch<void>(`/cadastro/empreendimentos/${id}/`, {
      method: 'DELETE',
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
    return apiFetch<{ results: TipoEquipamento[]; count: number }>('/equipamentos/tipos-equipamento/');
  },

  get: async (id: number) => {
    return apiFetch<TipoEquipamento>(`/equipamentos/tipos-equipamento/${id}/`);
  },

  create: async (data: Partial<TipoEquipamento>) => {
    return apiFetch<TipoEquipamento>('/equipamentos/tipos-equipamento/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: Partial<TipoEquipamento>) => {
    return apiFetch<TipoEquipamento>(`/equipamentos/tipos-equipamento/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number) => {
    return apiFetch<void>(`/equipamentos/tipos-equipamento/${id}/`, {
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
  ativo: boolean;
  // relacionais resumidos
  clientes?: number[];
  // endereço
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
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
}

export type ListParams = {
  q?: string;           // search
  ordering?: string;    // ex: nome_completo,-id
  page?: number;
  page_size?: number;
  cliente?: number;     // filtro por cliente
  ativo?: boolean;
};

function toQuery(params: Record<string, any> = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      q.set(k, String(v));
    }
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const operadoresApi = {
  async list(params: ListParams = {}) {
    return apiFetch<{ results: Operador[]; count: number }>(
      `/operadores/${toQuery({
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
    return apiFetch<Operador>(`/operadores/${id}/`);
  },
  async create(data: Partial<Operador>) {
    return apiFetch<Operador>(`/operadores/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },
  async update(id: number, data: Partial<Operador>) {
    return apiFetch<Operador>(`/operadores/${id}/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },
  async remove(id: number) {
    return apiFetch<void>(`/operadores/${id}/`, { method: "DELETE" });
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
      `/supervisores/${toQuery({
        search: params.q,
        ordering: params.ordering,
        page: params.page,
        page_size: params.page_size,
      })}`
    );
  },
  async retrieve(id: number) {
    return apiFetch<Supervisor>(`/supervisores/${id}/`);
  },
  async create(data: Partial<Supervisor>) {
    return apiFetch<Supervisor>(`/supervisores/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },
  async update(id: number, data: Partial<Supervisor>) {
    return apiFetch<Supervisor>(`/supervisores/${id}/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },
  async remove(id: number) {
    return apiFetch<void>(`/supervisores/${id}/`, { method: "DELETE" });
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
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export const equipamentosApi = {
  list: async (filters?: { cliente?: number; empreendimento?: number; search?: string }) => {
    const params = new URLSearchParams();
    if (filters?.cliente) params.append('cliente', filters.cliente.toString());
    if (filters?.empreendimento) params.append('empreendimento', filters.empreendimento.toString());
    if (filters?.search) params.append('search', filters.search);

    const query = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<{ results: Equipamento[]; count: number }>(`/equipamentos/equipamentos/${query}`);
  },

  get: async (id: number) => {
    return apiFetch<Equipamento>(`/equipamentos/equipamentos/${id}/`);
  },

  create: async (data: Partial<Equipamento>) => {
    return apiFetch<Equipamento>('/equipamentos/equipamentos/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: Partial<Equipamento>) => {
    return apiFetch<Equipamento>(`/equipamentos/equipamentos/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number) => {
    return apiFetch<void>(`/equipamentos/equipamentos/${id}/`, {
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
      return apiFetch<ModeloChecklist & { itens: ItemChecklist[] }>(`/nr12/modelos-checklist/${id}/`);
    },

    create: async (data: Partial<ModeloChecklist>) => {
      return apiFetch<ModeloChecklist>('/nr12/modelos-checklist/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update: async (id: number, data: Partial<ModeloChecklist>) => {
      return apiFetch<ModeloChecklist>(`/nr12/modelos-checklist/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    delete: async (id: number) => {
      return apiFetch<void>(`/nr12/modelos-checklist/${id}/`, {
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
      return apiFetch<ItemChecklist>(`/nr12/itens-checklist/${id}/`);
    },

    create: async (data: Partial<ItemChecklist>) => {
      return apiFetch<ItemChecklist>('/nr12/itens-checklist/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update: async (id: number, data: Partial<ItemChecklist>) => {
      return apiFetch<ItemChecklist>(`/nr12/itens-checklist/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    delete: async (id: number) => {
      return apiFetch<void>(`/nr12/itens-checklist/${id}/`, {
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
      return apiFetch<ChecklistRealizado & { respostas: RespostaItemChecklist[] }>(`/nr12/checklists/${id}/`);
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
    return apiFetch<any[]>('/manutencoes/');
  },
  get: async (id: number) => {
    return apiFetch<any>(`/manutencoes/${id}/`);
  },
  create: async (data: any) => {
    return apiFetch<any>('/manutencoes/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: number, data: any) => {
    return apiFetch<any>(`/manutencoes/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: number) => {
    return apiFetch<void>(`/manutencoes/${id}/`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// TÉCNICOS API
// ============================================

export const tecnicosApi = {
  list: async () => {
    return apiFetch<any[]>('/tecnicos/');
  },
  get: async (id: number) => {
    return apiFetch<any>(`/tecnicos/${id}/`);
  },
  create: async (data: any) => {
    return apiFetch<any>('/tecnicos/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: number, data: any) => {
    return apiFetch<any>(`/tecnicos/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: number) => {
    return apiFetch<void>(`/tecnicos/${id}/`, {
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
    return apiFetch<Abastecimento>(`/abastecimentos/${id}/`);
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
    return apiFetch<Abastecimento>(`/abastecimentos/${id}/`, {
      method: 'PATCH',
      body: isFormData ? data : JSON.stringify(data),
      headers: isFormData ? {} : { 'Content-Type': 'application/json' },
    });
  },

  delete: async (id: number) => {
    return apiFetch<void>(`/abastecimentos/${id}/`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// ALMOXARIFADO API
// ============================================

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
      return apiFetch<Produto>(`/almoxarifado/produtos/${id}/`);
    },

    combustiveis: async () => {
      return apiFetch<Produto[]>('/almoxarifado/produtos/combustiveis/');
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
      return apiFetch<LocalEstoque>(`/almoxarifado/locais/${id}/`);
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
      return apiFetch<Estoque>(`/almoxarifado/estoque/${id}/`);
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
      return apiFetch<MovimentoEstoque[]>('/almoxarifado/movimentos/ultimos/');
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

export const ordensServicoApi = {
  list: async (filters?: {
    status?: string;
    cliente?: number;
    empreendimento?: number;
    tecnico_responsavel?: number;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.cliente) params.append('cliente', filters.cliente.toString());
    if (filters?.empreendimento) params.append('empreendimento', filters.empreendimento.toString());
    if (filters?.tecnico_responsavel) params.append('tecnico_responsavel', filters.tecnico_responsavel.toString());
    if (filters?.search) params.append('search', filters.search);

    const query = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<{ results: OrdemServico[]; count: number }>(`/ordens-servico/${query}`);
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
      return apiFetch<ContaReceber>(`/financeiro/contas-receber/${id}/`);
    },

    create: async (data: Partial<ContaReceber>) => {
      return apiFetch<ContaReceber>('/financeiro/contas-receber/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update: async (id: number, data: Partial<ContaReceber>) => {
      return apiFetch<ContaReceber>(`/financeiro/contas-receber/${id}/`, {
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
        valor_aberto: number;
        valor_recebido: number;
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
      return apiFetch<ContaPagar>(`/financeiro/contas-pagar/${id}/`);
    },

    create: async (data: Partial<ContaPagar>) => {
      return apiFetch<ContaPagar>('/financeiro/contas-pagar/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update: async (id: number, data: Partial<ContaPagar>) => {
      return apiFetch<ContaPagar>(`/financeiro/contas-pagar/${id}/`, {
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
        valor_aberto: number;
        valor_pago: number;
      }>('/financeiro/contas-pagar/resumo/');
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
