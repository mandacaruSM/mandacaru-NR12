// frontend/src/lib/api.ts - CORRIGIDO
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface FetchOptions extends RequestInit {
  requireAuth?: boolean;
  skipRedirect?: boolean; // ✅ NOVO: permite desabilitar redirect automático
}

/**
 * Wrapper para fetch com tratamento de erros e autenticação automática
 * ✅ CORRIGIDO: Não faz mais redirect automático no 401
 */
async function apiFetch<T>(
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
    const response = await fetch(`${API_BASE}${endpoint}`, config);

    // ✅ CORREÇÃO: Apenas lança erro, NÃO faz redirect
    if (response.status === 401 && requireAuth) {
      // Deixa o AuthContext decidir o que fazer com o erro
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
// OPERADORES E SUPERVISORES - TIPOS
// ============================================

export interface Operador {
  id: number;
  nome_completo: string;
  cpf: string;
  data_nascimento: string;
  email: string;
  telefone: string;
  foto: string | null;
  
  // Telegram
  telegram_chat_id: string | null;
  telegram_username: string;
  telegram_vinculado_em: string | null;
  telegram_vinculado: boolean;
  codigo_vinculacao: string | null;
  codigo_valido_ate: string | null;
  
  // Endereço
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  
  // Status e datas
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
  
  // Campos computados
  clientes_nomes: string[];
  total_equipamentos: number;
  total_checklists: number;
  taxa_aprovacao: number;
}

export interface OperadorDetalhado extends Operador {
  clientes: any[];
  equipamentos_autorizados_detalhes: any[];
  checklists_recentes: any[];
  estatisticas: {
    total_checklists: number;
    taxa_aprovacao: number;
    total_equipamentos: number;
    total_clientes: number;
  };
}

export interface Supervisor {
  id: number;
  nome_completo: string;
  cpf: string;
  data_nascimento: string;
  email: string;
  telefone: string;
  foto: string | null;
  
  // Telegram
  telegram_chat_id: string | null;
  telegram_username: string;
  telegram_vinculado_em: string | null;
  telegram_vinculado: boolean;
  codigo_vinculacao: string | null;
  codigo_valido_ate: string | null;
  
  // Status
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
  
  // Campos computados
  clientes_nomes: string[];
  total_operadores: number;
}

export interface CodigoVinculacao {
  codigo: string;
  valido_ate: string;
  instrucoes: string;
}

export interface EstatisticasOperador {
  total_checklists: number;
  taxa_aprovacao: number;
  checklists_aprovados: number;
  checklists_reprovados: number;
  equipamentos_autorizados: number;
  clientes_vinculados: number;
  telegram_vinculado: boolean;
}

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
// OPERADORES E SUPERVISORES - TIPOS
// ============================================

export interface Operador {
  id: number;
  nome_completo: string;
  cpf: string;
  data_nascimento: string;
  email: string;
  telefone: string;
  foto: string | null;
  
  // Telegram
  telegram_chat_id: string | null;
  telegram_username: string;
  telegram_vinculado_em: string | null;
  telegram_vinculado: boolean;
  codigo_vinculacao: string | null;
  codigo_valido_ate: string | null;
  
  // Endereço
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  
  // Status e datas
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
  
  // Campos computados
  clientes_nomes: string[];
  total_equipamentos: number;
  total_checklists: number;
  taxa_aprovacao: number;
}

export interface OperadorDetalhado extends Operador {
  clientes: any[];
  equipamentos_autorizados_detalhes: any[];
  checklists_recentes: any[];
  estatisticas: {
    total_checklists: number;
    taxa_aprovacao: number;
    total_equipamentos: number;
    total_clientes: number;
  };
}

export interface Supervisor {
  id: number;
  nome_completo: string;
  cpf: string;
  data_nascimento: string;
  email: string;
  telefone: string;
  foto: string | null;
  
  // Telegram
  telegram_chat_id: string | null;
  telegram_username: string;
  telegram_vinculado_em: string | null;
  telegram_vinculado: boolean;
  codigo_vinculacao: string | null;
  codigo_valido_ate: string | null;
  
  // Status
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
  
  // Campos computados
  clientes_nomes: string[];
  total_operadores: number;
}

export interface CodigoVinculacao {
  codigo: string;
  valido_ate: string;
  instrucoes: string;
}

export interface EstatisticasOperador {
  total_checklists: number;
  taxa_aprovacao: number;
  checklists_aprovados: number;
  checklists_reprovados: number;
  equipamentos_autorizados: number;
  clientes_vinculados: number;
  telegram_vinculado: boolean;
}

// ============================================
// OPERADORES API
// ============================================

export const operadoresApi = {
  /**
   * Lista operadores com filtros opcionais
   */
  list: async (filters?: {
    cliente?: number;
    ativo?: boolean;
    telegram_vinculado?: boolean;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.cliente) params.append('cliente', filters.cliente.toString());
    if (filters?.ativo !== undefined) params.append('ativo', filters.ativo.toString());
    if (filters?.telegram_vinculado !== undefined) {
      params.append('telegram_vinculado', filters.telegram_vinculado.toString());
    }
    if (filters?.search) params.append('search', filters.search);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<PaginatedResponse<Operador>>(`/operadores/${query}`);
  },

  /**
   * Busca operador por ID (com detalhes)
   */
  get: async (id: number) => {
    return apiFetch<OperadorDetalhado>(`/operadores/${id}/`);
  },

  /**
   * Cria novo operador
   */
  create: async (data: Partial<Operador> & { clientes_ids?: number[] }) => {
    return apiFetch<Operador>('/operadores/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Atualiza operador
   */
  update: async (id: number, data: Partial<Operador> & { clientes_ids?: number[] }) => {
    return apiFetch<Operador>(`/operadores/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Exclui operador
   */
  delete: async (id: number) => {
    return apiFetch<void>(`/operadores/${id}/`, {
      method: 'DELETE',
    });
  },

  /**
   * Gera código de 8 dígitos para vincular Telegram
   */
  gerarCodigoVinculacao: async (id: number) => {
    return apiFetch<CodigoVinculacao>(`/operadores/${id}/gerar_codigo_vinculacao/`, {
      method: 'POST',
    });
  },

  /**
   * Remove vinculação do Telegram
   */
  desvincularTelegram: async (id: number) => {
    return apiFetch<{ detail: string }>(`/operadores/${id}/desvincular_telegram/`, {
      method: 'POST',
    });
  },

  /**
   * Lista equipamentos autorizados para o operador
   */
  equipamentos: async (id: number) => {
    return apiFetch<Equipamento[]>(`/operadores/${id}/equipamentos/`);
  },

  /**
   * Autoriza operador a usar um equipamento
   */
  vincularEquipamento: async (
    id: number, 
    equipamento_id: number, 
    observacoes?: string,
    data_validade?: string
  ) => {
    return apiFetch<{ detail: string; autorizacao_id: number }>(`/operadores/${id}/vincular_equipamento/`, {
      method: 'POST',
      body: JSON.stringify({ equipamento_id, observacoes, data_validade }),
    });
  },

  /**
   * Remove autorização de equipamento
   */
  desvincularEquipamento: async (id: number, equipamento_id: number) => {
    return apiFetch<{ detail: string }>(`/operadores/${id}/desvincular_equipamento/`, {
      method: 'POST',
      body: JSON.stringify({ equipamento_id }),
    });
  },

  /**
   * Busca estatísticas do operador
   */
  estatisticas: async (id: number) => {
    return apiFetch<EstatisticasOperador>(`/operadores/${id}/estatisticas/`);
  },
};

// ============================================
// SUPERVISORES API
// ============================================

export const supervisoresApi = {
  /**
   * Lista supervisores com filtros opcionais
   */
  list: async (filters?: {
    cliente?: number;
    ativo?: boolean;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.cliente) params.append('cliente', filters.cliente.toString());
    if (filters?.ativo !== undefined) params.append('ativo', filters.ativo.toString());
    if (filters?.search) params.append('search', filters.search);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<PaginatedResponse<Supervisor>>(`/supervisores/${query}`);
  },

  /**
   * Busca supervisor por ID
   */
  get: async (id: number) => {
    return apiFetch<Supervisor>(`/supervisores/${id}/`);
  },

  /**
   * Cria novo supervisor
   */
  create: async (data: Partial<Supervisor>) => {
    return apiFetch<Supervisor>('/supervisores/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Atualiza supervisor
   */
  update: async (id: number, data: Partial<Supervisor>) => {
    return apiFetch<Supervisor>(`/supervisores/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Exclui supervisor
   */
  delete: async (id: number) => {
    return apiFetch<void>(`/supervisores/${id}/`, {
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

// ============================================
// NR12 API
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
  operador_nome: string;
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
  // MODELOS
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

  // ITENS
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

  // CHECKLISTS
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

  // RESPOSTAS
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

  export default {
    auth: authApi,
    clientes: clientesApi,
    empreendimentos: empreendimentosApi,
    tiposEquipamento: tiposEquipamentoApi,
    equipamentos: equipamentosApi,
    nr12: nr12Api,
    operadores: operadoresApi,      // ✅ NOVO
    supervisores: supervisoresApi,  // ✅ NOVO
  };