/**
 * Tipos de dados comuns usados nos schemas da API
 */

/**
 * Interface para respostas paginadas
 */
export interface PaginatedResponse<T> {
  /** Lista de itens da página atual */
  data: T[];
  
  /** Metadados da paginação */
  meta: {
    /** Total de itens */
    total: number;
    
    /** Página atual */
    page: number;
    
    /** Limite de itens por página */
    limit: number;
    
    /** Total de páginas */
    totalPages: number;
  };
}

/**
 * Interface para respostas de erro padronizadas
 */
export interface ErrorResponse {
  /** Código de status HTTP */
  statusCode: number;
  
  /** Mensagem de erro */
  message: string;
  
  /** Tipo de erro */
  error?: string;
  
  /** Timestamp do erro */
  timestamp?: string;
  
  /** Caminho da requisição */
  path?: string;
  
  /** Lista de erros de validação */
  errors?: Array<{
    /** Campo com erro */
    field: string;
    
    /** Mensagem de erro */
    message: string;
    
    /** Tipo de validação */
    validation?: string;
  }>;
}

/**
 * Interface para respostas de sucesso padronizadas
 */
export interface SuccessResponse<T = any> {
  /** Indica se a operação foi bem-sucedida */
  success: boolean;
  
  /** Mensagem de sucesso */
  message: string;
  
  /** Dados retornados */
  data?: T;
}

/**
 * Interface para metadados de paginação
 */
export interface PaginationMeta {
  /** Total de itens */
  total: number;
  
  /** Página atual */
  page: number;
  
  /** Limite de itens por página */
  limit: number;
  
  /** Total de páginas */
  totalPages: number;
}

/**
 * Interface para parâmetros de consulta paginada
 */
export interface PaginationQueryParams {
  /** Número da página (começando em 1) */
  page?: number;
  
  /** Quantidade de itens por página */
  limit?: number;
  
  /** Campo para ordenação */
  sortBy?: string;
  
  /** Direção da ordenação (asc/desc) */
  sortOrder?: 'asc' | 'desc';
}
