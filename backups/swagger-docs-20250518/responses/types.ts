import { HttpStatus } from '@nestjs/common';

/**
 * Interface para respostas de erro da API
 */
export interface ApiErrorResponse {
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
  errors?: ApiValidationError[];
}

/**
 * Interface para erros de validação
 */
export interface ApiValidationError {
  /** Nome do campo com erro */
  field: string;
  
  /** Mensagem de erro */
  message: string;
  
  /** Tipo de validação que falhou */
  validation?: string;
  
  /** Valor rejeitado */
  rejectedValue?: any;
}

/**
 * Interface para respostas de sucesso padronizadas
 */
export interface ApiSuccessResponse<T = any> {
  /** Indica se a operação foi bem-sucedida */
  success: boolean;
  
  /** Mensagem de sucesso */
  message: string;
  
  /** Dados retornados */
  data?: T;
  
  /** Metadados adicionais */
  meta?: Record<string, any>;
}

/**
 * Interface para respostas paginadas
 */
export interface PaginatedResponse<T> {
  /** Lista de itens da página atual */
  data: T[];
  
  /** Metadados da paginação */
  meta: PaginationMeta;
}

/**
 * Metadados de paginação
 */
export interface PaginationMeta {
  /** Número total de itens */
  total: number;
  
  /** Página atual */
  page: number;
  
  /** Itens por página */
  limit: number;
  
  /** Total de páginas */
  totalPages: number;
  
  /** Tem itens na página anterior? */
  hasPrevPage: boolean;
  
  /** Tem itens na próxima página? */
  hasNextPage: boolean;
  
  /** Link para a página anterior */
  prevPage: number | null;
  
  /** Link para a próxima página */
  nextPage: number | null;
}

/**
 * Parâmetros de consulta paginada
 */
export interface PaginationQueryParams {
  /** Número da página (começando em 1) */
  page?: number;
  
  /** Itens por página */
  limit?: number;
  
  /** Campo para ordenação */
  sortBy?: string;
  
  /** Direção da ordenação */
  sortOrder?: 'asc' | 'desc';
  
  /** Filtros adicionais */
  [key: string]: any;
}

/**
 * Cria um objeto de metadados de paginação
 */
export function createPaginationMeta(
  totalItems: number,
  page: number,
  limit: number
): PaginationMeta {
  const totalPages = Math.ceil(totalItems / limit);
  
  return {
    total: totalItems,
    page,
    limit,
    totalPages,
    hasPrevPage: page > 1,
    hasNextPage: page < totalPages,
    prevPage: page > 1 ? page - 1 : null,
    nextPage: page < totalPages ? page + 1 : null
  };
}

/**
 * Cria uma resposta de sucesso padronizada
 */
export function createSuccessResponse<T>(
  data: T,
  message = 'Operação realizada com sucesso',
  meta?: Record<string, any>
): ApiSuccessResponse<T> {
  return {
    success: true,
    message,
    data,
    meta
  };
}

/**
 * Cria uma resposta de erro padronizada
 */
export function createErrorResponse(
  statusCode: number,
  message: string,
  error?: string,
  errors?: ApiValidationError[],
  path?: string
): ApiErrorResponse {
  return {
    statusCode,
    message,
    error,
    errors,
    path,
    timestamp: new Date().toISOString()
  };
}

/**
 * Cria uma resposta de validação de erro
 */
export function createValidationErrorResponse(
  errors: ApiValidationError[],
  path?: string
): ApiErrorResponse {
  return createErrorResponse(
    HttpStatus.BAD_REQUEST,
    'Erro de validação',
    'Bad Request',
    errors,
    path
  );
}
