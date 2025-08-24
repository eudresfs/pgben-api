/**
 * Audit Decorators
 *
 * Decorators para auditoria automática de métodos e classes.
 * Implementa interceptação transparente para emissão de eventos.
 */

import { SetMetadata, applyDecorators } from '@nestjs/common';
import { AuditEventType, RiskLevel } from '../events/types/audit-event.types';

// Metadata keys
export const AUDIT_METADATA_KEY = 'audit:config';
export const SENSITIVE_DATA_METADATA_KEY = 'audit:sensitive';
export const AUTO_AUDIT_METADATA_KEY = 'audit:auto';
export const SECURITY_AUDIT_METADATA_KEY = 'audit:security';

// Interfaces para configuração dos decorators
export interface AuditDecoratorConfig {
  eventType: AuditEventType;
  entity?: string;
  operation?: string;
  riskLevel?: RiskLevel;
  sensitiveFields?: string[];
  async?: boolean;
  skipIf?: (context: any) => boolean;
}

export interface SensitiveDataConfig {
  fields: string[];
  maskInLogs?: boolean;
  requiresConsent?: boolean;
  retentionDays?: number;
}

export interface AutoAuditConfig {
  enabled: boolean;
  includeRequest?: boolean;
  includeResponse?: boolean;
  excludeFields?: string[];
  async?: boolean;
}

export interface SecurityAuditConfig {
  requiresAuth?: boolean;
  requiredRoles?: string[];
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  riskLevel?: RiskLevel;
}

/**
 * Decorator para auditoria manual de métodos específicos
 *
 * @param config Configuração da auditoria
 *
 * @example
 * ```typescript
 * @Audit({
 *   eventType: AuditEventType.ENTITY_CREATED,
 *   entity: 'User',
 *   operation: 'create',
 *   riskLevel: RiskLevel.MEDIUM
 * })
 * async createUser(userData: CreateUserDto) {
 *   // implementação
 * }
 * ```
 */
export const Audit = (config: AuditDecoratorConfig) => {
  return SetMetadata(AUDIT_METADATA_KEY, config);
};

/**
 * Decorator para marcar dados sensíveis (LGPD)
 *
 * @param config Configuração de dados sensíveis
 *
 * @example
 * ```typescript
 * @SensitiveData({
 *   fields: ['cpf', 'email', 'telefone'],
 *   maskInLogs: true,
 *   requiresConsent: true
 * })
 * async getUserData(userId: string) {
 *   // implementação
 * }
 * ```
 */
export const SensitiveData = (config: SensitiveDataConfig) => {
  return SetMetadata(SENSITIVE_DATA_METADATA_KEY, config);
};

/**
 * Decorator para auditoria automática de controladores
 *
 * @param config Configuração da auditoria automática
 *
 * @example
 * ```typescript
 * @AutoAudit({
 *   enabled: true,
 *   includeRequest: true,
 *   includeResponse: false,
 *   async: true
 * })
 * @Controller('users')
 * export class UsersController {
 *   // todos os métodos serão auditados automaticamente
 * }
 * ```
 */
export const AutoAudit = (config: AutoAuditConfig) => {
  return SetMetadata(AUTO_AUDIT_METADATA_KEY, config);
};

/**
 * Decorator combinado para auditoria de entidades
 *
 * @param entity Nome da entidade
 * @param operation Operação realizada
 * @param options Opções adicionais
 *
 * @example
 * ```typescript
 * @AuditEntity('User', 'create', { async: true, riskLevel: RiskLevel.HIGH })
 * async createUser(userData: CreateUserDto) {
 *   // implementação
 * }
 * ```
 */
export const AuditEntity = (
  entity: string,
  operation: string,
  options?: Partial<AuditDecoratorConfig>,
) => {
  const config: AuditDecoratorConfig = {
    eventType: AuditEventType.ENTITY_CREATED,
    entity,
    operation,
    riskLevel: RiskLevel.MEDIUM,
    async: true,
    ...options,
  };

  return Audit(config);
};

/**
 * Decorator para auditoria de acesso a dados sensíveis
 *
 * @param fields Campos sensíveis
 * @param options Opções adicionais
 *
 * @example
 * ```typescript
 * @SensitiveDataAccess(['cpf', 'rg'], { requiresConsent: true })
 * async getCitizenData(cpf: string) {
 *   // implementação
 * }
 * ```
 */
export const SensitiveDataAccess = (
  fields: string[],
  options?: Partial<SensitiveDataConfig>,
) => {
  const config: SensitiveDataConfig = {
    fields,
    maskInLogs: true,
    requiresConsent: false,
    retentionDays: 2555, // 7 anos LGPD
    ...options,
  };

  return applyDecorators(
    SensitiveData(config),
    Audit({
      eventType: AuditEventType.SENSITIVE_DATA_ACCESSED,
      riskLevel: RiskLevel.HIGH,
      sensitiveFields: fields,
      async: true,
    }),
  );
};

/**
 * Decorator para auditoria de operações de segurança
 *
 * @param operation Operação de segurança
 * @param riskLevel Nível de risco
 *
 * @example
 * ```typescript
 * @SecurityAudit('login', RiskLevel.HIGH)
 * async login(credentials: LoginDto) {
 *   // implementação
 * }
 * ```
 */
export const SecurityAudit = (
  operation: string,
  riskLevel: RiskLevel = RiskLevel.HIGH,
) => {
  return Audit({
    eventType: AuditEventType.SUSPICIOUS_ACTIVITY,
    operation,
    riskLevel,
    async: false, // Eventos de segurança são síncronos
  });
};

/**
 * Decorator para auditoria de operações do sistema
 *
 * @param operation Operação do sistema
 * @param async Se deve ser processado assincronamente
 *
 * @example
 * ```typescript
 * @SystemAudit('backup', true)
 * async performBackup() {
 *   // implementação
 * }
 * ```
 */
export const SystemAudit = (operation: string, async: boolean = true) => {
  return Audit({
    eventType: AuditEventType.SYSTEM_ERROR,
    operation,
    riskLevel: RiskLevel.LOW,
    async,
  });
};
