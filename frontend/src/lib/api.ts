// frontend/src/lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface FetchOptions extends RequestInit {
  requireAuth?: boolean;
}

/**
 * Wrapper para fetch com tratamento de erros e autenticação automática
 */
async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { requireAuth = true, ...fetchOptions } = options;

  const config: RequestInit = {
    ...fetchOptions,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);

    if (response.status === 401 && requireAuth) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Não autenticado');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
      throw new Error(error.detail || `Erro ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return null as T;
  } catch (error) {
    console.error('API Error:', error);
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
    return apiFetch<User>('/users/me/');
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
    return apiFetch<{ results: Cliente[]; count: number }>(`/clientes/${params}`);
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

// ============================================
// EMPREENDIMENTOS API
// ============================================

export interface Empreendimento {
  id: number;
  cliente: number;
  cliente_nome: string;
  nome: string;
  tipo: 'LAVRA' | 'OBRA' | 'PLANTA' | 'OUTRO';
  distancia_km: string;
  latitude: string | null;
  longitude: string | null;
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
    return apiFetch<{ results: Empreendimento[]; count: number }>(`/empreendimentos/${query}`);
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
    return apiFetch<{ results: TipoEquipamento[]; count: number }>('/tipos-equipamento/');
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
    return apiFetch<{ results: Equipamento[]; count: number }>(`/equipamentos/${query}`);
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

export default apiFetch;