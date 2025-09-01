/**
 * Tipos de eventos de auditoria
 *
 * Define as interfaces base para todos os eventos de auditoria
 * do sistema, garantindo tipagem forte e padronização.
 */

/**
 * Enum com todos os tipos de eventos de auditoria
 */
export enum AuditEventType {
  // Eventos de Entidade
  ENTITY_CREATED = 'entity.created',
  ENTITY_UPDATED = 'entity.updated',
  ENTITY_DELETED = 'entity.deleted',
  ENTITY_ACCESSED = 'entity.accessed',

  // Eventos de Segurança
  SUCCESSFUL_LOGIN = 'security.login.success',
  FAILED_LOGIN = 'security.login.failed',
  LOGOUT = 'security.logout',
  PASSWORD_CHANGED = 'security.password.changed',
  PASSWORD_RESET = 'security.password.reset',
  ACCOUNT_LOCKED = 'security.account.locked',
  TOKEN_REFRESH = 'security.token.refresh',
  PERMISSION_CHANGED = 'security.permission.changed',
  SUSPICIOUS_ACTIVITY = 'security.suspicious.activity',
  SECURITY_TOKEN_INVALIDATION = 'security.token.invalidation',

  // Eventos de Sistema
  SYSTEM_ERROR = 'system.error',
  SYSTEM_WARNING = 'system.warning',
  SYSTEM_INFO = 'system.info',
  BACKUP_CREATED = 'system.backup.created',
  MAINTENANCE_START = 'system.maintenance.start',
  MAINTENANCE_END = 'system.maintenance.end',
  BUSINESS_OPERATION = 'business.operation',

  // Eventos de Dados Sensíveis (LGPD)
  SENSITIVE_DATA_ACCESSED = 'lgpd.sensitive.accessed',
  SENSITIVE_DATA_EXPORTED = 'lgpd.sensitive.exported',
  SENSITIVE_DATA_DELETED = 'lgpd.sensitive.deleted',
  SENSITIVE_DATA_ANONYMIZED = 'lgpd.sensitive.anonymized',
  DATA_CONSENT_GIVEN = 'lgpd.consent.given',
  DATA_CONSENT_REVOKED = 'lgpd.consent.revoked',

  // Eventos de Exportação
  EXPORT_STARTED = 'export.started',
  EXPORT_COMPLETED = 'export.completed',
  EXPORT_FAILED = 'export.failed',

  // Eventos de Operação (Global Audit)
  OPERATION_START = 'operation.start',
  OPERATION_SUCCESS = 'operation.success',
  OPERATION_ERROR = 'operation.error',

  // Eventos de Integração
  INTEGRATION_SUCCESS = 'integration.success',
  INTEGRATION_FAILED = 'integration.failed',
  API_CALL_MADE = 'integration.api.call',
}

/**
 * Níveis de risco para eventos de auditoria
 */
export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Interface base para todos os eventos de auditoria
 */
export interface BaseAuditEvent {
  /** ID único do evento */
  eventId: string;
  eventType: AuditEventType;

  /** Nome da entidade afetada */
  entityName?: string;

  /** ID da entidade afetada (opcional) */
  entityId?: string;

  /** ID do usuário que executou a ação */
  userId?: string;

  /** Timestamp do evento */
  timestamp: Date;

  /** Nível de risco da operação */
  riskLevel?: RiskLevel;

  /** Se o evento é relevante para LGPD */
  lgpdRelevant?: boolean;

  /** Metadados adicionais */
  metadata?: Record<string, any>;

  /** Contexto da requisição */
  requestContext?: {
    ip?: string;
    userAgent?: string;
    sessionId?: string;
    endpoint?: string;
    method?: string;
  };

  /** IP do cliente */
  ip?: string;

  /** User Agent */
  userAgent?: string;

  /** ID de correlação para rastreamento */
  correlationId?: string;

  /** Operação realizada */
  operation?: string;
}

/**
 * Interface para eventos de entidade
 */
export interface EntityAuditEvent extends BaseAuditEvent {
  eventType:
    | AuditEventType.ENTITY_CREATED
    | AuditEventType.ENTITY_UPDATED
    | AuditEventType.ENTITY_DELETED
    | AuditEventType.ENTITY_ACCESSED;

  /** Dados anteriores (para updates e deletes) */
  previousData?: Record<string, any>;

  /** Dados novos (para creates e updates) */
  newData?: Record<string, any>;

  /** Campos que foram alterados (para updates) */
  changedFields?: string[];

  /** Se algum campo sensível foi alterado */
  sensitiveFieldsChanged?: boolean;
}

/**
 * Interface para eventos de segurança
 */
export interface SecurityAuditEvent extends BaseAuditEvent {
  eventType:
    | AuditEventType.SUCCESSFUL_LOGIN
    | AuditEventType.FAILED_LOGIN
    | AuditEventType.LOGOUT
    | AuditEventType.PASSWORD_CHANGED
    | AuditEventType.PASSWORD_RESET
    | AuditEventType.ACCOUNT_LOCKED
    | AuditEventType.TOKEN_REFRESH
    | AuditEventType.PERMISSION_CHANGED
    | AuditEventType.SUSPICIOUS_ACTIVITY
    | AuditEventType.SECURITY_TOKEN_INVALIDATION;

  riskLevel: RiskLevel;
}

/**
 * Interface para eventos de sistema
 */
export interface SystemAuditEvent extends BaseAuditEvent {
  eventType:
    | AuditEventType.SYSTEM_ERROR
    | AuditEventType.SYSTEM_WARNING
    | AuditEventType.SYSTEM_INFO
    | AuditEventType.BACKUP_CREATED
    | AuditEventType.MAINTENANCE_START
    | AuditEventType.MAINTENANCE_END;
}

/**
 * Interface para eventos de dados sensíveis (LGPD)
 */
export interface SensitiveDataAuditEvent extends BaseAuditEvent {
  eventType:
    | AuditEventType.SENSITIVE_DATA_ACCESSED
    | AuditEventType.SENSITIVE_DATA_EXPORTED
    | AuditEventType.SENSITIVE_DATA_DELETED
    | AuditEventType.SENSITIVE_DATA_ANONYMIZED
    | AuditEventType.DATA_CONSENT_GIVEN
    | AuditEventType.DATA_CONSENT_REVOKED;

  lgpdRelevant: true;
  riskLevel: RiskLevel.HIGH | RiskLevel.CRITICAL;

  /** Campos sensíveis afetados */
  sensitiveFields?: string[];

  /** Base legal para o processamento */
  legalBasis?: string;

  /** Finalidade do processamento */
  purpose?: string;
}

/**
 * Interface para eventos de operação (Global Interceptor)
 */
export interface OperationAuditEvent extends BaseAuditEvent {
  eventType:
    | AuditEventType.OPERATION_START
    | AuditEventType.OPERATION_SUCCESS
    | AuditEventType.OPERATION_ERROR;

  /** Controlador que processou a requisição */
  controller?: string;

  /** Método que processou a requisição */
  method?: string;

  /** URL da requisição */
  url?: string;

  /** Método HTTP */
  httpMethod?: string;

  /** Duração da operação em ms */
  duration?: number;

  /** Parâmetros da requisição */
  params?: Record<string, any>;

  /** Query parameters */
  query?: Record<string, any>;

  /** Corpo da requisição (sanitizado) */
  body?: any;

  /** Resposta (sanitizada) */
  response?: any;

  /** Erro (se houver) */
  error?: {
    message: string;
    status: number;
    stack?: string;
  };
}

/**
 * Union type para todos os eventos de auditoria
 */
export type AuditEvent =
  | EntityAuditEvent
  | SecurityAuditEvent
  | SystemAuditEvent
  | SensitiveDataAuditEvent
  | OperationAuditEvent
  | BaseAuditEvent;

/**
 * Interface para configuração de eventos
 */
export interface AuditEventConfig {
  /** Se deve processar o evento de forma síncrona */
  synchronous?: boolean;

  /** Prioridade do job na fila */
  priority?: number;

  /** Delay antes de processar (em ms) */
  delay?: number;

  /** Número de tentativas em caso de falha */
  attempts?: number;

  /** Se deve comprimir os dados */
  compress?: boolean;

  /** Se deve assinar digitalmente */
  sign?: boolean;
}
