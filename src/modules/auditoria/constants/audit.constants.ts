/**
 * AuditConstants
 *
 * Constantes centralizadas para o módulo de auditoria.
 * Define valores padrão, configurações e metadados importantes.
 */

import { AuditEventType, RiskLevel } from '../events/types/audit-event.types';

/**
 * Nomes das filas de processamento
 */
export const AUDIT_QUEUE_NAMES = {
  PROCESSING: 'auditoria',
  BATCH_PROCESSING: 'audit-batch-processing',
  CRITICAL: 'audit-critical',
  SENSITIVE: 'audit-sensitive',
} as const;

/**
 * Eventos síncronos do EventEmitter
 */
export const AUDIT_EVENTS = {
  // Eventos genéricos
  AUDIT_EVENT: 'audit.event',

  // Eventos de entidade
  ENTITY_CREATED: 'audit.entity.created',
  ENTITY_UPDATED: 'audit.entity.updated',
  ENTITY_DELETED: 'audit.entity.deleted',
  ENTITY_ACCESSED: 'audit.entity.accessed',

  // Eventos de segurança
  SECURITY_EVENT: 'audit.security.event',
  LOGIN_SUCCESS: 'audit.security.login.success',
  LOGIN_FAILED: 'audit.security.login.failed',
  LOGOUT: 'audit.security.logout',
  PERMISSION_DENIED: 'audit.security.permission.denied',

  // Eventos de dados sensíveis
  SENSITIVE_DATA_ACCESS: 'audit.sensitive.access',
  SENSITIVE_DATA_EXPORT: 'audit.sensitive.export',
  SENSITIVE_DATA_MODIFICATION: 'audit.sensitive.modification',

  // Eventos de sistema
  SYSTEM_EVENT: 'audit.system.event',
  SYSTEM_ERROR: 'audit.system.error',
  SYSTEM_WARNING: 'audit.system.warning',

  // Eventos de interceptor/middleware
  METHOD_EXECUTION: 'audit.method.execution',
  REQUEST_START: 'audit.request.start',
  REQUEST_END: 'audit.request.end',
  REQUEST_ERROR: 'audit.request.error',

  // Eventos configurados
  CONFIGURED_EVENT: 'audit.configured.event',
  AUTO_AUDIT_EVENT: 'audit.auto.event',
} as const;

/**
 * Metadados dos decoradores
 */
export const AUDIT_METADATA_KEYS = {
  AUDIT: 'audit:config',
  SENSITIVE_DATA: 'audit:sensitive-data',
  AUTO_AUDIT: 'audit:auto-audit',
  AUDIT_ENTITY: 'audit:entity',
  SENSITIVE_DATA_ACCESS: 'audit:sensitive-data-access',
  SECURITY_AUDIT: 'audit:security',
  SYSTEM_AUDIT: 'audit:system',
} as const;

/**
 * Campos sensíveis padrão
 */
export const DEFAULT_SENSITIVE_FIELDS = [
  'password',
  'senha',
  'token',
  'secret',
  'key',
  'api_key',
  'apiKey',
  'access_token',
  'refresh_token',
  'cpf',
  'rg',
  'ssn',
  'social_security',
  'credit_card',
  'card_number',
  'cardNumber',
  'cvv',
  'cvc',
  'pin',
  'otp',
  'phone',
  'telefone',
  'email',
  'birth_date',
  'data_nascimento',
  'address',
  'endereco',
  'salary',
  'salario',
  'income',
  'renda',
] as const;

/**
 * Operações de alto risco
 */
export const HIGH_RISK_OPERATIONS = [
  'delete',
  'remove',
  'destroy',
  'purge',
  'truncate',
  'drop',
  'clear',
  'reset',
  'wipe',
] as const;

/**
 * Operações de médio risco
 */
export const MEDIUM_RISK_OPERATIONS = [
  'update',
  'modify',
  'change',
  'edit',
  'patch',
  'put',
  'set',
  'alter',
] as const;

/**
 * Papéis de usuário com privilégios elevados
 */
export const HIGH_PRIVILEGE_ROLES = [
  'admin',
  'administrator',
  'superuser',
  'super_user',
  'root',
  'system',
  'sysadmin',
  'dba',
  'owner',
] as const;

/**
 * Configurações de prioridade das filas
 */
export const QUEUE_PRIORITIES = {
  [RiskLevel.CRITICAL]: 10,
  [RiskLevel.HIGH]: 7,
  [RiskLevel.MEDIUM]: 5,
  [RiskLevel.LOW]: 1,
} as const;

/**
 * Configurações de retenção de dados (em dias)
 */
export const RETENTION_POLICIES = {
  [AuditEventType.SUCCESSFUL_LOGIN]: 2190, // 6 anos
  [AuditEventType.SENSITIVE_DATA_ACCESSED]: 1825, // 5 anos
  [AuditEventType.ENTITY_DELETED]: 1095, // 3 anos
  [AuditEventType.ENTITY_UPDATED]: 730, // 2 anos
  [AuditEventType.ENTITY_CREATED]: 365, // 1 ano
  [AuditEventType.ENTITY_ACCESSED]: 90, // 3 meses
  [AuditEventType.SYSTEM_ERROR]: 365, // 1 ano
  DEFAULT: 90, // 3 meses
  LGPD_RELEVANT: 2555, // ~7 anos para dados fiscais/legais
} as const;

/**
 * Padrões regex para detecção de dados sensíveis
 */
export const SENSITIVE_DATA_PATTERNS = {
  CPF: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/,
  CPF_NUMBERS_ONLY: /\b\d{11}\b/,
  RG: /\b\d{2}\.\d{3}\.\d{3}-\d{1}\b/,
  CREDIT_CARD: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
  PHONE_BR: /\b(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\s?)?\d{4}[\s-]?\d{4}\b/,
  CEP: /\b\d{5}-?\d{3}\b/,
} as const;

/**
 * Configurações de timeout (em milissegundos)
 */
export const TIMEOUTS = {
  SYNC_PROCESSING: 5000, // 5 segundos
  ASYNC_PROCESSING: 30000, // 30 segundos
  BATCH_PROCESSING: 60000, // 1 minuto
  CRITICAL_PROCESSING: 10000, // 10 segundos
  DATABASE_OPERATION: 15000, // 15 segundos
} as const;

/**
 * Limites de processamento
 */
export const PROCESSING_LIMITS = {
  MAX_BATCH_SIZE: 100,
  MAX_RETRY_ATTEMPTS: 3,
  MAX_QUEUE_SIZE: 10000,
  MAX_CONCURRENT_JOBS: 5,
  MAX_EVENT_SIZE_KB: 1024, // 1MB
  MAX_METADATA_SIZE_KB: 256, // 256KB
} as const;

/**
 * Configurações de compressão
 */
export const COMPRESSION_CONFIG = {
  ENABLED: true,
  MIN_SIZE_BYTES: 1024, // Comprimir apenas dados > 1KB
  ALGORITHM: 'gzip',
  LEVEL: 6, // Nível de compressão (1-9)
} as const;

/**
 * Headers HTTP relevantes para auditoria
 */
export const AUDIT_HEADERS = {
  USER_ID: 'x-user-id',
  SESSION_ID: 'x-session-id',
  CORRELATION_ID: 'x-correlation-id',
  REQUEST_ID: 'x-request-id',
  CLIENT_IP: 'x-client-ip',
  FORWARDED_FOR: 'x-forwarded-for',
  REAL_IP: 'x-real-ip',
  USER_AGENT: 'user-agent',
  AUTHORIZATION: 'authorization',
} as const;

/**
 * Códigos de status HTTP que indicam operações sensíveis
 */
export const SENSITIVE_HTTP_STATUS = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Métodos HTTP que requerem auditoria especial
 */
export const AUDIT_HTTP_METHODS = {
  HIGH_RISK: ['DELETE', 'PUT'],
  MEDIUM_RISK: ['POST', 'PATCH'],
  LOW_RISK: ['GET', 'HEAD', 'OPTIONS'],
} as const;

/**
 * Configurações de conformidade LGPD
 */
export const LGPD_CONFIG = {
  ENABLED: true,
  CONSENT_REQUIRED_OPERATIONS: [
    AuditEventType.SENSITIVE_DATA_ACCESSED,
    AuditEventType.ENTITY_CREATED,
    AuditEventType.ENTITY_UPDATED,
  ],
  DATA_SUBJECT_RIGHTS: [
    'access',
    'rectification',
    'erasure',
    'portability',
    'restriction',
    'objection',
  ],
  RETENTION_PERIOD_DAYS: 2555, // ~7 anos
  ANONYMIZATION_DELAY_DAYS: 30,
} as const;

/**
 * Configurações de monitoramento e métricas
 */
export const MONITORING_CONFIG = {
  METRICS_ENABLED: true,
  HEALTH_CHECK_INTERVAL_MS: 30000, // 30 segundos
  PERFORMANCE_THRESHOLD_MS: 1000, // 1 segundo
  ERROR_RATE_THRESHOLD: 0.05, // 5%
  QUEUE_SIZE_ALERT_THRESHOLD: 1000,
  MEMORY_USAGE_ALERT_THRESHOLD: 0.8, // 80%
} as const;

/**
 * Mensagens de erro padrão
 */
export const ERROR_MESSAGES = {
  INVALID_EVENT_TYPE: 'Tipo de evento inválido',
  INVALID_RISK_LEVEL: 'Nível de risco inválido',
  MISSING_REQUIRED_FIELD: 'Campo obrigatório ausente',
  EVENT_TOO_LARGE: 'Evento excede o tamanho máximo permitido',
  QUEUE_FULL: 'Fila de processamento está cheia',
  PROCESSING_TIMEOUT: 'Timeout no processamento do evento',
  DATABASE_ERROR: 'Erro na operação de banco de dados',
  SERIALIZATION_ERROR: 'Erro na serialização do evento',
  VALIDATION_ERROR: 'Erro na validação do evento',
  PERMISSION_DENIED: 'Permissão negada para operação de auditoria',
} as const;

/**
 * Configurações de desenvolvimento/debug
 */
export const DEBUG_CONFIG = {
  ENABLED: process.env.NODE_ENV === 'development',
  LOG_LEVEL: process.env.AUDIT_LOG_LEVEL || 'info',
  VERBOSE_LOGGING: process.env.AUDIT_VERBOSE === 'true',
  PERFORMANCE_LOGGING: process.env.AUDIT_PERFORMANCE === 'true',
  MOCK_EXTERNAL_SERVICES: process.env.NODE_ENV === 'test',
} as const;

/**
 * Versão do módulo de auditoria
 */
export const AUDIT_MODULE_VERSION = '1.0.0';

/**
 * Configurações de cache
 */
export const CACHE_CONFIG = {
  ENABLED: true,
  TTL_SECONDS: 300, // 5 minutos
  MAX_ENTRIES: 1000,
  CACHE_KEY_PREFIX: 'audit:',
} as const;

/**
 * Tipos de dados que devem ser sempre auditados
 */
export const ALWAYS_AUDIT_ENTITIES = [
  'User',
  'Usuario',
  'Account',
  'Conta',
  'Permission',
  'Permissao',
  'Role',
  'Papel',
  'Setting',
  'Configuracao',
  'AuditLog',
  'LogAuditoria',
] as const;

/**
 * Configurações de assinatura digital
 */
export const DIGITAL_SIGNATURE_CONFIG = {
  ENABLED: true,
  ALGORITHM: 'RS256',
  KEY_SIZE: 2048,
  HASH_ALGORITHM: 'SHA256',
  SIGN_CRITICAL_EVENTS: true,
  VERIFY_ON_READ: false, // Verificar apenas quando necessário
} as const;
