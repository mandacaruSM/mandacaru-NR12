// Tipos para o módulo de Abastecimento

export interface Abastecimento {
  id: number;
  equipamento: number;
  equipamento_codigo: string;
  equipamento_descricao: string;
  data: string; // YYYY-MM-DD
  horimetro_km: string; // decimal como string
  tipo_combustivel: 'DIESEL' | 'GASOLINA' | 'ETANOL' | 'GNV' | 'OUTRO';
  tipo_combustivel_display: string;
  quantidade_litros: string; // decimal como string
  valor_total: string; // decimal como string
  valor_unitario: string | null; // decimal como string
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

export interface AbastecimentoForm {
  equipamento: number;
  data: string;
  horimetro_km: string;
  tipo_combustivel: string;
  quantidade_litros: string;
  valor_total: string;
  local?: string;
  local_estoque?: number | null;
  produto?: number | null;
  operador?: number | null;
  observacoes?: string;
  numero_nota?: string;
  nota_fiscal?: File | null;
}

export interface AbastecimentoFilters {
  equipamento?: number;
  data_inicio?: string;
  data_fim?: string;
  tipo_combustivel?: string;
  local_estoque?: number;
  produto?: number;
  operador?: number;
}

// Tipos para Almoxarifado

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
  tipo: 'PECA' | 'COMBUSTIVEL' | 'INSUMO';
  tipo_display: string;
  categoria: number;
  categoria_nome: string;
  unidade: number;
  unidade_sigla: string;
  ativo: boolean;
  densidade_kg_l?: string | null;
}

export interface ProdutoList {
  id: number;
  codigo: string;
  nome: string;
  tipo: string;
  tipo_display: string;
  categoria_nome: string;
  unidade_sigla: string;
  ativo: boolean;
}

export interface LocalEstoque {
  id: number;
  nome: string;
  tipo: 'ALMOX' | 'TANQUE' | 'POSTO';
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
  saldo: string; // decimal como string
  unidade: string;
}

export interface MovimentoEstoque {
  id: number;
  produto: number;
  produto_nome: string;
  produto_codigo: string;
  local: number;
  local_nome: string;
  tipo: 'ENTRADA' | 'SAIDA' | 'AJUSTE';
  tipo_display: string;
  quantidade: string; // decimal como string
  data_hora: string;
  documento: string;
  observacao: string;
  criado_por?: number | null;
  criado_por_nome?: string | null;
  abastecimento?: number | null;
}

export interface MovimentoEstoqueForm {
  produto: number;
  local: number;
  tipo: 'ENTRADA' | 'SAIDA' | 'AJUSTE';
  quantidade: string;
  documento?: string;
  observacao?: string;
}
