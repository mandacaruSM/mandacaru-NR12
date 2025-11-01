export interface Manutencao {
  id: number;
  equipamento: number;
  equipamento_nome?: string;
  tipo: 'preventiva' | 'corretiva';
  data: string;
  horimetro: string; // decimal como string
  tecnico?: number | null;
  tecnico_nome?: string;
  descricao?: string;
  observacoes?: string;
  proxima_manutencao?: string | null;
  anexos?: AnexoManutencao[];
  created_at: string;
  updated_at: string;
}

export interface AnexoManutencao {
  id: number;
  arquivo: string;
  nome_original: string;
  uploaded_at: string;
}

export interface Equipamento {
  id: number;
  codigo: string;
  descricao?: string;
  tipo?: number;
  tipo_nome?: string;
  empreendimento?: number;
  empreendimento_nome?: string;
  numero_serie?: string;
  fabricante?: string;
  modelo?: string;
  ano_fabricacao?: number;
  ativo?: boolean;
}

// Tipo para Operadores (usado em outros módulos)
export interface Operador {
  id: number;
  nome: string;
  cpf?: string;
  telefone?: string;
  email?: string;
}

// Tipo específico para Técnicos (usado em manutenções)
export interface Tecnico {
  id: number;
  nome: string;
  especialidade?: string;
  telefone?: string;
  email?: string;
}
