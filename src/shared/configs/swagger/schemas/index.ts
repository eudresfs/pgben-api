/**
 * Arquivo de barril para exportação de todos os schemas
 * 
 * Este arquivo serve como um ponto de entrada centralizado para todos os schemas
 * utilizados na documentação da API, organizados por domínio e finalidade.
 */

// Schemas comuns - exporta apenas os tipos específicos necessários
export {
  ErrorResponse,
  SuccessResponse,
  PaginatedResponse,
  PaginatedMeta,
  ValidationErrorResponse
} from './common';

// Schemas de domínio
export * from './auth';
export * from './beneficio';
export * from './cidadao';
export * from './documento';

// Tipos de dados comuns - exporta apenas os tipos específicos necessários
export type { PaginationMeta, PaginationQueryParams } from './types';

// Utilitários de validação
export * from './validators';
