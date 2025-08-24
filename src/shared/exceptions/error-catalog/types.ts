/**
 * Tipos e Enums do Catálogo de Erros
 *
 * Define os tipos básicos utilizados em todo o sistema de erros,
 * separados para evitar dependências circulares.
 *
 * @see docs/ADRs/catalogo-erros.md
 */

import { HttpStatus } from '@nestjs/common';

/**
 * Severidade do erro para classificação e alertas
 */
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Categorias principais de erro do sistema
 */
export enum ErrorCategory {
  VALIDATIONS = 'VALIDATIONS',
  BENEFITS = 'BENEFITS',
  INTEGRATIONS = 'INTEGRATIONS',
  OPERATIONAL_FLOW = 'OPERATIONAL_FLOW',
  SYSTEM = 'SYSTEM',
  BUSINESS = 'BUSINESS',
}

/**
 * Interface para definição estruturada de erros
 */
export interface ErrorDefinition {
  /** Código único do erro */
  code: string;
  /** Mensagem padrão em português */
  message: string;
  /** Status HTTP correspondente */
  httpStatus: HttpStatus;
  /** Categoria do erro */
  category: ErrorCategory;
  /** Severidade do erro */
  severity: ErrorSeverity;
  /** Mensagens localizadas */
  localizedMessages?: Record<string, string>;
  /** Mensagens contextuais específicas para diferentes campos/situações */
  contextualMessages?: Record<string, string>;
  /** Ações sugeridas para resolução */
  suggestedActions?: string[];
  /** Referência legal ou normativa */
  legalReference?: string;
  /** Contexto adicional ou metadados */
  metadata?: Record<string, any>;
}

/**
 * Tipo para códigos de erro de domínio
 */
export type DomainErrorCode = string;
