/**
 * Audit Operation Decorator
 *
 * Decorator específico para auditoria de operações.
 * Permite configuração granular de auditoria para operações específicas.
 */

import { SetMetadata, applyDecorators } from '@nestjs/common';
import { AuditEventType, RiskLevel } from '../events/types/audit-event.types';
import { Audit } from './audit.decorators';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';

/**
 * Interface para configuração do decorator AuditOperation
 */
export interface AuditOperationConfig {
  /** Tipo da operação (CRUD) */
  tipo: TipoOperacao;
  
  /** Nome da entidade afetada */
  entidade: string;
  
  /** Descrição da operação */
  descricao?: string;
  
  /** Nível de risco da operação */
  riskLevel?: RiskLevel;
  
  /** Se deve ser processado assincronamente */
  async?: boolean;
  
  /** Campos sensíveis a serem mascarados */
  sensitiveFields?: string[];
  
  /** Se deve mascarar dados sensíveis */
  maskSensitiveData?: boolean;
  
  /** Se requer consentimento do usuário */
  requiresConsent?: boolean;
}

/**
 * Decorator para auditoria de operações
 *
 * Este decorator permite configuração detalhada de auditoria
 * para operações específicas do sistema.
 *
 * @param config Configuração da auditoria da operação
 *
 * @example
 * ```typescript
 * @AuditOperation({
 *   tipo: TipoOperacao.CREATE,
 *   entidade: 'Unidade',
 *   descricao: 'Criação de nova unidade',
 *   riskLevel: RiskLevel.MEDIUM
 * })
 * async createUnidade(dto: CreateUnidadeDto) {
 *   // implementação
 * }
 * ```
 */
export const AuditOperation = (config: AuditOperationConfig) => {
  // Mapear TipoOperacao para AuditEventType
  const eventTypeMap = {
    [TipoOperacao.CREATE]: AuditEventType.ENTITY_CREATED,
    [TipoOperacao.READ]: AuditEventType.ENTITY_ACCESSED,
    [TipoOperacao.UPDATE]: AuditEventType.ENTITY_UPDATED,
    [TipoOperacao.DELETE]: AuditEventType.ENTITY_DELETED,
    [TipoOperacao.LOGIN]: AuditEventType.SUCCESSFUL_LOGIN,
    [TipoOperacao.LOGOUT]: AuditEventType.LOGOUT,
    [TipoOperacao.FAILED_LOGIN]: AuditEventType.FAILED_LOGIN,
    [TipoOperacao.ACCESS]: AuditEventType.SENSITIVE_DATA_ACCESSED,
    [TipoOperacao.EXPORT]: AuditEventType.SENSITIVE_DATA_EXPORTED,
    [TipoOperacao.ANONYMIZE]: AuditEventType.SENSITIVE_DATA_ANONYMIZED,
  };

  const eventType = eventTypeMap[config.tipo] || AuditEventType.ENTITY_CREATED;

  return applyDecorators(
    Audit({
      eventType,
      entity: config.entidade,
      operation: config.tipo,
      riskLevel: config.riskLevel || RiskLevel.MEDIUM,
      sensitiveFields: config.sensitiveFields,
      async: config.async !== false, // padrão é true
    }),
    SetMetadata('audit:operation', {
      tipo: config.tipo,
      entidade: config.entidade,
      descricao: config.descricao,
      maskSensitiveData: config.maskSensitiveData,
      requiresConsent: config.requiresConsent,
    })
  );
};

/**
 * Decorators pré-configurados para operações CRUD
 */

/**
 * Decorator para operações de criação
 */
export const AuditCreate = (entidade: string, descricao?: string) =>
  AuditOperation({
    tipo: TipoOperacao.CREATE,
    entidade,
    descricao: descricao || `Criação de ${entidade}`,
    riskLevel: RiskLevel.MEDIUM,
  });

/**
 * Decorator para operações de leitura
 */
export const AuditRead = (entidade: string, descricao?: string) =>
  AuditOperation({
    tipo: TipoOperacao.READ,
    entidade,
    descricao: descricao || `Consulta de ${entidade}`,
    riskLevel: RiskLevel.LOW,
  });

/**
 * Decorator para operações de atualização
 */
export const AuditUpdate = (entidade: string, descricao?: string) =>
  AuditOperation({
    tipo: TipoOperacao.UPDATE,
    entidade,
    descricao: descricao || `Atualização de ${entidade}`,
    riskLevel: RiskLevel.MEDIUM,
  });

/**
 * Decorator para operações de exclusão
 */
export const AuditDelete = (entidade: string, descricao?: string) =>
  AuditOperation({
    tipo: TipoOperacao.DELETE,
    entidade,
    descricao: descricao || `Exclusão de ${entidade}`,
    riskLevel: RiskLevel.HIGH,
  });

/**
 * Decorator para operações de acesso a dados sensíveis
 */
export const AuditSensitiveAccess = (entidade: string, descricao?: string) =>
  AuditOperation({
    tipo: TipoOperacao.ACCESS,
    entidade,
    descricao: descricao || `Acesso a dados sensíveis de ${entidade}`,
    riskLevel: RiskLevel.HIGH,
    maskSensitiveData: true,
    requiresConsent: true,
  });

/**
 * Decorator para operações de exportação de dados
 */
export const AuditExport = (entidade: string, descricao?: string) =>
  AuditOperation({
    tipo: TipoOperacao.EXPORT,
    entidade,
    descricao: descricao || `Exportação de dados de ${entidade}`,
    riskLevel: RiskLevel.HIGH,
    maskSensitiveData: true,
  });