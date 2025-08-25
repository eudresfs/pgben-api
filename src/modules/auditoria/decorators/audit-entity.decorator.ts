/**
 * Audit Entity Decorator
 *
 * Decorator específico para auditoria de entidades.
 * Simplifica a aplicação de auditoria em operações de entidades.
 */

import { SetMetadata, applyDecorators } from '@nestjs/common';
import { AuditEventType, RiskLevel } from '../events/types/audit-event.types';
import { Audit } from './audit.decorators';

/**
 * Interface para configuração do decorator AuditEntity
 */
export interface AuditEntityConfig {
  /** Nome da entidade sendo auditada */
  entity: string;
  
  /** Operação sendo realizada */
  operation: string;
  
  /** Nível de risco da operação */
  riskLevel?: RiskLevel;
  
  /** Se deve ser processado assincronamente */
  async?: boolean;
  
  /** Campos sensíveis a serem mascarados */
  sensitiveFields?: string[];
  
  /** Descrição personalizada da operação */
  description?: string;
}

/**
 * Decorator para auditoria de entidades
 *
 * Este decorator simplifica a aplicação de auditoria em operações
 * relacionadas a entidades específicas do sistema.
 *
 * @param config Configuração da auditoria da entidade
 *
 * @example
 * ```typescript
 * @AuditEntity({
 *   entity: 'Unidade',
 *   operation: 'create',
 *   riskLevel: RiskLevel.MEDIUM
 * })
 * async createUnidade(dto: CreateUnidadeDto) {
 *   // implementação
 * }
 * ```
 */
export const AuditEntity = (config: AuditEntityConfig) => {
  return applyDecorators(
    Audit({
      eventType: AuditEventType.ENTITY_CREATED,
      entity: config.entity,
      operation: config.operation,
      riskLevel: config.riskLevel || RiskLevel.MEDIUM,
      sensitiveFields: config.sensitiveFields,
      async: config.async !== false, // padrão é true
    }),
    SetMetadata('audit:entity', {
      name: config.entity,
      operation: config.operation,
      description: config.description,
    })
  );
};

/**
 * Decorators pré-configurados para operações comuns de entidades
 */

/**
 * Decorator para criação de entidades
 */
export const AuditEntityCreate = (entity: string, description?: string) =>
  AuditEntity({
    entity,
    operation: 'create',
    riskLevel: RiskLevel.MEDIUM,
    description: description || `Criação de ${entity}`,
  });

/**
 * Decorator para atualização de entidades
 */
export const AuditEntityUpdate = (entity: string, description?: string) =>
  AuditEntity({
    entity,
    operation: 'update',
    riskLevel: RiskLevel.MEDIUM,
    description: description || `Atualização de ${entity}`,
  });

/**
 * Decorator para exclusão de entidades
 */
export const AuditEntityDelete = (entity: string, description?: string) =>
  AuditEntity({
    entity,
    operation: 'delete',
    riskLevel: RiskLevel.HIGH,
    description: description || `Exclusão de ${entity}`,
  });

/**
 * Decorator para consulta de entidades
 */
export const AuditEntityRead = (entity: string, description?: string) =>
  AuditEntity({
    entity,
    operation: 'read',
    riskLevel: RiskLevel.LOW,
    description: description || `Consulta de ${entity}`,
  });