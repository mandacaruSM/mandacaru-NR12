// frontend/src/lib/api.ts
/**
 * Cliente API com autenticação por cookies
 * Inclui renovação automática de tokens
 * VERSÃO COMPLETA - FASE 2
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface FetchOptions extends RequestInit {
  requireAuth?: boolean;
}

// Flag para evitar múltiplas renovações simultâneas
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Renova o access token usando o refresh token do cookie
 */
async function refreshAccessToken(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh/`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        console.log('✅ Token renovado com sucesso');
        return true;
      }

      console.error('❌ Falha ao renovar token:', response.status);
      return false;
    } catch (error) {
      console.error('❌ Erro ao renovar token:', error);
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Função auxiliar para fazer requisições com autenticação
 */
async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { requireAuth = true, ...fetchOptions } = options;

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  const config: RequestInit = {
    ...fetchOptions,
    credentials: 'include', // Envia cookies automaticamente
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  };

  let response = await fetch(url, config);

  // Se receber 401 e precisar de auth, tenta renovar o token
  if (response.status === 401 && requireAuth) {
    console.log('🔄 Token expirado, tentando renovar...');
    
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      // Tenta a requisição novamente
      response = await fetch(url, config);
    } else {
      // Se não conseguiu renovar, redireciona para login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Sessão expirada');
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Erro ${response.status}`);
  }

  return response.json();
}

// ==================== TIPOS ====================

// Autenticação
export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

// Clientes
export interface Cliente {
  id: number;
  tipo_pessoa: 'PF' | 'PJ';
  nome_razao: string;
  documento: string;
  inscricao_estadual?: string;
  email_financeiro?: string;
  telefone?: string;
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

// Empreendimentos
export interface Empreendimento {
  id: number;
  cliente: number;
  cliente_nome?: string;
  nome: string;
  tipo: 'LAVRA' | 'OBRA' | 'PLANTA' | 'OUTRO';
  distancia_km?: string;
  latitude?: number | null;
  longitude?: number | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

// Tipos de Equipamento
export interface TipoEquipamento {
  id: number;
  nome: string;
  descricao?: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

// Equipamentos
export interface Equipamento {
  id: number;
  cliente: number;
  cliente_nome?: string;
  empreendimento: number;
  empreendimento_nome?: string;
  tipo: number;
  tipo_nome?: string;
  codigo: string;
  descricao?: string;
  fabricante?: string;
  modelo?: string;
  ano_fabricacao?: number | null;
  numero_serie?: string;
  tipo_medicao: 'KM' | 'HORA';
  leitura_atual: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

// NR12 - Itens de Checklist
export interface ItemChecklist {
  id?: number;
  modelo?: number;
  ordem: number;
  categoria: 'VISUAL' | 'FUNCIONAL' | 'MEDICAO' | 'LIMPEZA' | 'LUBRIFICACAO' | 'DOCUMENTACAO' | 'SEGURANCA' | 'OUTROS';
  pergunta: string;
  descricao_ajuda?: string;
  tipo_resposta: 'SIM_NAO' | 'CONFORME' | 'NUMERO' | 'TEXTO';
  obrigatorio: boolean;
  requer_observacao_nao_conforme: boolean;
  ativo?: boolean;
  criado_em?: string;
  atualizado_em?: string;
}

// NR12 - Modelos de Checklist
export interface ModeloChecklist {
  id: number;
  tipo_equipamento: number;
  tipo_equipamento_nome?: string;
  nome: string;
  descricao?: string;
  periodicidade: 'DIARIO' | 'SEMANAL' | 'QUINZENAL' | 'MENSAL';
  itens?: ItemChecklist[];
  total_itens?: number;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

// NR12 - Respostas
export interface RespostaItem {
  item_checklist: number;
  resposta: string;
  observacao?: string;
}

// NR12 - Checklists Realizados
export interface ChecklistRealizado {
  id: number;
  modelo: number;
  modelo_nome?: string;
  equipamento: number;
  equipamento_codigo?: string;
  equipamento_descricao?: string;
  operador?: number | null;
  operador_nome?: string;
  usuario?: number | null;
  origem: 'WEB' | 'BOT' | 'MOBILE';
  data_hora_inicio: string;
  data_hora_fim?: string | null;
  leitura_equipamento?: string | null;
  status: 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';
  resultado_geral?: 'APROVADO' | 'APROVADO_RESTRICAO' | 'REPROVADO' | null;
  observacoes_gerais?: string;
  respostas?: RespostaItem[];
  total_respostas?: number;
  total_nao_conformidades?: number;
  criado_em: string;
  atualizado_em: string;
}

// Response paginada
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ==================== AUTENTICAÇÃO ====================

export const authApi = {
  login: async (username: string, password: string) => {
    return apiFetch<{
      detail: string;
      user: User;
    }>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      requireAuth: false,
    });
  },

  logout: async () => {
    return apiFetch<{ detail: string }>('/auth/logout/', {
      method: 'POST',
    });
  },

  refresh: async () => {
    return refreshAccessToken();
  },

  me: async () => {
    return apiFetch<{ user: User }>('/users/me/', {
      method: 'GET',
    });
  },
};
// ==================== CLIENTES ====================

export const clientesApi = {
  list: async (params?: Record<string, any>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<PaginatedResponse<Cliente>>(`/clientes/${query}`);
  },

  get: async (id: number) => {
    return apiFetch<Cliente>(`/clientes/${id}/`);
  },

  create: async (data: Partial<Cliente>) => {
    return apiFetch<Cliente>('/clientes/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: Partial<Cliente>) => {
    return apiFetch<Cliente>(`/clientes/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number) => {
    return apiFetch<void>(`/clientes/${id}/`, {
      method: 'DELETE',
    });
  },
};

// ==================== EMPREENDIMENTOS ====================

export const empreendimentosApi = {
  list: async (params?: Record<string, any>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<PaginatedResponse<Empreendimento>>(`/empreendimentos/${query}`);
  },

  get: async (id: number) => {
    return apiFetch<Empreendimento>(`/empreendimentos/${id}/`);
  },

  create: async (data: Partial<Empreendimento>) => {
    return apiFetch<Empreendimento>('/empreendimentos/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: Partial<Empreendimento>) => {
    return apiFetch<Empreendimento>(`/empreendimentos/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number) => {
    return apiFetch<void>(`/empreendimentos/${id}/`, {
      method: 'DELETE',
    });
  },
};

// ==================== TIPOS DE EQUIPAMENTO ====================

export const tiposEquipamentoApi = {
  list: async (params?: Record<string, any>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<PaginatedResponse<TipoEquipamento>>(`/tipos-equipamento/${query}`);
  },

  get: async (id: number) => {
    return apiFetch<TipoEquipamento>(`/tipos-equipamento/${id}/`);
  },

  create: async (data: Partial<TipoEquipamento>) => {
    return apiFetch<TipoEquipamento>('/tipos-equipamento/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: Partial<TipoEquipamento>) => {
    return apiFetch<TipoEquipamento>(`/tipos-equipamento/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number) => {
    return apiFetch<void>(`/tipos-equipamento/${id}/`, {
      method: 'DELETE',
    });
  },
};

// ==================== EQUIPAMENTOS ====================

export const equipamentosApi = {
  list: async (params?: Record<string, any>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<PaginatedResponse<Equipamento>>(`/equipamentos/${query}`);
  },

  get: async (id: number) => {
    return apiFetch<Equipamento>(`/equipamentos/${id}/`);
  },

  create: async (data: Partial<Equipamento>) => {
    return apiFetch<Equipamento>('/equipamentos/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: Partial<Equipamento>) => {
    return apiFetch<Equipamento>(`/equipamentos/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number) => {
    return apiFetch<void>(`/equipamentos/${id}/`, {
      method: 'DELETE',
    });
  },
};

// ==================== NR12 - MODELOS DE CHECKLIST ====================

const modelosApi = {
  list: async (params?: Record<string, any>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<ModeloChecklist[]>(`/nr12/modelos/${query}`);
  },

  get: async (id: number) => {
    return apiFetch<ModeloChecklist>(`/nr12/modelos/${id}/`);
  },

  create: async (data: Partial<ModeloChecklist>) => {
    return apiFetch<ModeloChecklist>(`/nr12/modelos/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: Partial<ModeloChecklist>) => {
    return apiFetch<ModeloChecklist>(`/nr12/modelos/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number) => {
    return apiFetch<void>(`/nr12/modelos/${id}/`, {
      method: 'DELETE',
    });
  },

  duplicar: async (id: number) => {
    return apiFetch<ModeloChecklist>(`/nr12/modelos/${id}/duplicar/`, {
      method: 'POST',
    });
  },
};

// ==================== NR12 - ITENS DE CHECKLIST ====================

const itensApi = {
  list: async (modeloId: number) => {
    return apiFetch<PaginatedResponse<ItemChecklist>>(`/nr12/modelos/${modeloId}/itens/`);
  },

  get: async (modeloId: number, itemId: number) => {
    return apiFetch<ItemChecklist>(`/nr12/modelos/${modeloId}/itens/${itemId}/`);
  },

  create: async (modeloId: number, data: Partial<ItemChecklist>) => {
    return apiFetch<ItemChecklist>(`/nr12/modelos/${modeloId}/itens/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (modeloId: number, itemId: number, data: Partial<ItemChecklist>) => {
    return apiFetch<ItemChecklist>(`/nr12/modelos/${modeloId}/itens/${itemId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (modeloId: number, itemId: number) => {
    return apiFetch<void>(`/nr12/modelos/${modeloId}/itens/${itemId}/`, {
      method: 'DELETE',
    });
  },
};

// ==================== NR12 - CHECKLISTS REALIZADOS ====================

const checklistsApi = {
  list: async (params?: Record<string, any>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<ChecklistRealizado[]>(`/nr12/checklists/${query}`);
  },

  get: async (id: number) => {
    return apiFetch<ChecklistRealizado>(`/nr12/checklists/${id}/`);
  },

  create: async (data: Partial<ChecklistRealizado>) => {
    return apiFetch<ChecklistRealizado>(`/nr12/checklists/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: Partial<ChecklistRealizado>) => {
    return apiFetch<ChecklistRealizado>(`/nr12/checklists/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number) => {
    return apiFetch<void>(`/nr12/checklists/${id}/`, {
      method: 'DELETE',
    });
  },

  finalizar: async (id: number) => {
    return apiFetch<ChecklistRealizado>(`/nr12/checklists/${id}/finalizar/`, {
      method: 'POST',
    });
  },

  estatisticas: async (params?: Record<string, any>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<any>(`/nr12/checklists/estatisticas/${query}`);
  },
};

// ==================== EXPORTAÇÕES ====================

// Exportação agrupada NR12 (para compatibilidade com código existente)
export const nr12Api = {
  modelos: modelosApi,
  itens: itensApi,
  checklists: checklistsApi,
};

// Exportação default
export default {
  auth: authApi,
  clientes: clientesApi,
  empreendimentos: empreendimentosApi,
  tiposEquipamento: tiposEquipamentoApi,
  equipamentos: equipamentosApi,
  nr12: nr12Api,
};