/**
 * Arquivo de índice para centralizar todas as exportações dos utilitários comuns do sistema.
 * Este arquivo facilita as importações e resolve problemas de dependências circulares.
 */

// Utilitários de transformação de filtros
export {
  transformToStringArray,
  transformToUUIDArray,
  transformToEnumArray,
  sanitizeString,
  sanitizeStringArray,
  transformToBoolean,
  transformToNumber,
  isValidISODate,
  transformToDateString,
  removeEmptyValues,
  gerarChaveCache
} from './filtros-transform.util';