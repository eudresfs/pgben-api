/**
 * Módulo de Auditoria - Exports Principais
 *
 * Arquivo de índice que exporta todos os componentes principais
 * do módulo de auditoria para facilitar importações.
 */

// === TIPOS E INTERFACES ===
export * from './events/types/audit-event.types';

// === CONFIGURAÇÕES ===
export * from './config/audit-config';
export * from './constants/audit.constants';

// === CORE SERVICES ===
export { AuditCoreRepository } from './core/repositories/audit-core.repository';
export { AuditCoreService } from './core/services/audit-core.service';
export { AuditCoreModule } from './core/audit-core.module';

// === EVENT SYSTEM ===
export { AuditEventEmitter } from './events/emitters/audit-event.emitter';
export { AuditEventListener } from './listeners/audit-event.listener';
export { AuditEventsModule } from './events/audit-events.module';

// === QUEUE PROCESSING ===
export { AuditProcessor } from './queues/processors/audit.processor';
export { AuditProcessingJob } from './queues/jobs/audit-processing.job';
export { AuditQueuesModule } from './queues/audit-queues.module';

// === DECORATORS ===
export {
  Audit,
  SensitiveData,
  AutoAudit,
  AuditEntity,
  SensitiveDataAccess,
  SecurityAudit,
  SystemAudit,
} from './decorators/audit.decorators';

// === ENTITY DECORATORS ===
export {
  AuditEntity as AuditEntityDecorator,
  AuditEntityCreate,
  AuditEntityUpdate,
  AuditEntityDelete,
  AuditEntityRead,
} from './decorators/audit-entity.decorator';

// === OPERATION DECORATORS ===
export {
  AuditOperation,
  AuditCreate,
  AuditRead,
  AuditUpdate,
  AuditDelete,
  AuditSensitiveAccess,
  AuditExport,
} from './decorators/audit-operation.decorator';

// === INTERCEPTORS E MIDDLEWARE ===
export { AuditInterceptor } from './interceptors/audit.interceptor';
export { AuditMiddleware } from './middleware/audit.middleware';
export { AuditGuard } from './guards/audit.guard';

// === UTILITÁRIOS ===
export { AuditUtils } from './utils/audit.utils';

// === MÓDULO PRINCIPAL ===
export { AuditoriaModule } from './auditoria.module';

// === ENTIDADES (re-export das entidades existentes) ===
export { LogAuditoria } from '../../entities/log-auditoria.entity';

// === INTERFACES DE CONFIGURAÇÃO ===
export interface AuditModuleOptions {
  /**
   * Configurações personalizadas de auditoria
   */
  config?: Partial<import('./config/audit-config').AuditConfig>;

  /**
   * Habilitar processamento assíncrono
   */
  enableAsync?: boolean;

  /**
   * Habilitar interceptor global
   */
  enableGlobalInterceptor?: boolean;

  /**
   * Habilitar middleware global
   */
  enableGlobalMiddleware?: boolean;

  /**
   * Habilitar guard global
   */
  enableGlobalGuard?: boolean;

  /**
   * Configurações de filas personalizadas
   */
  queueConfig?: {
    redis?: {
      host?: string;
      port?: number;
      password?: string;
      db?: number;
    };
    defaultJobOptions?: {
      removeOnComplete?: number;
      removeOnFail?: number;
      attempts?: number;
      backoff?: {
        type: string;
        delay: number;
      };
    };
  };
}

// === TIPOS AUXILIARES ===
export type AuditEventHandler = (
  event: import('./events/types/audit-event.types').BaseAuditEvent,
) => void | Promise<void>;

export type AuditFilter = {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  eventType?: import('./events/types/audit-event.types').AuditEventType;
  riskLevel?: import('./events/types/audit-event.types').RiskLevel;
  entityType?: string;
  entityId?: string;
  ip?: string;
  userAgent?: string;
  page?: number;
  limit?: number;
};

export type AuditStatistics = {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByRisk: Record<string, number>;
  eventsByUser: Record<string, number>;
  eventsToday: number;
  eventsThisWeek: number;
  eventsThisMonth: number;
  averageEventsPerDay: number;
  topUsers: Array<{ userId: string; count: number }>;
  topIPs: Array<{ ip: string; count: number }>;
  errorRate: number;
  performanceMetrics: {
    averageProcessingTime: number;
    slowestOperations: Array<{
      operation: string;
      averageTime: number;
    }>;
  };
};

// === CONSTANTES ÚTEIS ===
export const AUDIT_MODULE_METADATA = {
  OPTIONS: 'AUDIT_MODULE_OPTIONS',
  CONFIG: 'AUDIT_CONFIG',
} as const;

// === FACTORY FUNCTIONS ===
/**
 * Cria uma configuração de auditoria personalizada
 */
export function createAuditConfig(
  overrides?: Partial<import('./config/audit-config').AuditConfig>,
): import('./config/audit-config').AuditConfig {
  const { createAuditConfig } = require('./config/audit-config');
  return createAuditConfig(overrides);
}

/**
 * Cria um filtro de auditoria com valores padrão
 */
export function createAuditFilter(filter?: Partial<AuditFilter>): AuditFilter {
  return {
    page: 1,
    limit: 50,
    ...filter,
  };
}

/**
 * Utilitário para criar eventos de auditoria tipados
 */
export function createAuditEvent<
  T extends import('./events/types/audit-event.types').BaseAuditEvent,
>(eventData: Omit<T, 'timestamp' | 'correlationId'>): T {
  const correlationId =
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);

  return {
    ...eventData,
    timestamp: new Date(),
    correlationId,
  } as unknown as T;
}

// === VALIDADORES ===
/**
 * Valida se um evento de auditoria está bem formado
 */
export function validateAuditEvent(
  event: import('./events/types/audit-event.types').BaseAuditEvent,
): { valid: boolean; errors: string[] } {
  const { AuditUtils } = require('./utils/audit.utils');
  return AuditUtils.validateAuditEvent(event);
}

/**
 * Verifica se dados contêm informações sensíveis
 */
export function containsSensitiveData(data: any): boolean {
  const { AuditUtils } = require('./utils/audit.utils');
  return AuditUtils.containsSensitiveData(data);
}

/**
 * Sanitiza dados sensíveis
 */
export function sanitizeSensitiveData(
  data: any,
  sensitiveFields?: string[],
  maskValue?: string,
): any {
  const { AuditUtils } = require('./utils/audit.utils');
  return AuditUtils.sanitizeSensitiveData(data, sensitiveFields, maskValue);
}
