/**
 * Catálogo de Erros - Sistema SEMTAS
 *
 * Este módulo centraliza todas as definições de erro do sistema,
 * fornecendo códigos padronizados, mensagens localizadas e
 * funcionalidades para tratamento consistente de exceções.
 *
 * @see docs/ADRs/catalogo-erros.md
 */

// Exportações principais
export { ERROR_CATALOG, POSTGRES_ERROR_MAP } from './catalog';
export { ErrorDefinition, ErrorCategory, ErrorSeverity } from './catalog';
export { AppError, ErrorContext } from './AppError';
export { CatalogAwareExceptionFilter } from './errorHandler';
export { CatalogAwareExceptionFilter as errorHandler } from './errorHandler';

// Exportações de domínios específicos
export * from './domains';

// Exportações de helpers (legado)
export {
  throwInvalidCpf,
  throwDuplicateCpf,
  throwInvalidNis,
  throwDuplicateNis,
  throwInvalidAge,
  throwInvalidIncome,
  throwIncomeExceedsLimit,
  throwNatalidadeAlreadyReceived,
  throwInvalidBirthDateForNatalidade,
  throwAluguelAlreadyActive,
  throwInvalidPropertyForAluguel,
  throwBenefitNotFound,
  throwInvalidWorkflowTransition,
  throwAzureBlobUploadFailed,
  throwEmailSendFailed,
  throwDatabaseConnectionFailed,
  throwPermissionDenied,
  throwDocumentRequired,
  throwApprovalDeadlineExceeded,
  throwForeignKeyViolation,
  throwUniqueConstraintViolation,
  throwRateLimitExceeded,
  throwMaintenanceMode,
  throwFromPostgresError,
} from './helpers';
