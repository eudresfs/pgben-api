/**
 * AuditEventListener
 *
 * Listener para eventos de auditoria síncronos.
 * Processa eventos emitidos pelo EventEmitter2 de forma síncrona.
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AuditCoreService } from '../core/services/audit-core.service';

import {
  BaseAuditEvent,
  EntityAuditEvent,
  SecurityAuditEvent,
  SystemAuditEvent,
  SensitiveDataAuditEvent,
  AuditEventType,
  RiskLevel,
  AuditEvent,
} from '../events/types/audit-event.types';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';

@Injectable()
export class AuditEventListener {
  private readonly logger = new Logger(AuditEventListener.name);

  constructor(private readonly auditCoreService: AuditCoreService) {}

  /**
   * Processa eventos genéricos de auditoria
   */
  // @ts-ignore: TS1270 - Decorator compatibility issue with TypeScript 5.x
  @OnEvent('audit.generic')
  async handleGenericAuditEvent(event: BaseAuditEvent): Promise<void> {
    try {
      await this.auditCoreService.createAuditLog({
        tipo_operacao: this.mapEventTypeToTipoOperacao(event.eventType),
        entidade_afetada: event.entityName || 'Sistema',
        entidade_id: event.entityId,
        usuario_id: event.userId,
        descricao: `Evento genérico: ${event.eventType}`,
        data_hora: event.timestamp,
        ip_origem: event.requestContext?.ip,
        user_agent: event.requestContext?.userAgent,
        endpoint: event.requestContext?.endpoint,
        metodo_http: event.requestContext?.method,
        dados_novos: event.metadata,
      });
    } catch (error) {
      this.logger.error('Erro ao processar evento genérico de auditoria', {
        error: error.message,
        event,
      });
    }
  }

  /**
   * Processa eventos de entidade
   */
  // @ts-ignore: TS1270 - Decorator compatibility issue with TypeScript 5.x
  @OnEvent('audit.entity')
  async handleEntityEvent(event: EntityAuditEvent): Promise<void> {
    try {
      await this.auditCoreService.createAuditLog({
        tipo_operacao: this.mapEventTypeToTipoOperacao(event.eventType),
        entidade_afetada: event.entityName,
        entidade_id: event.entityId,
        usuario_id: event.userId,
        descricao: `${event.eventType} em ${event.entityName}`,
        data_hora: new Date(),
        ip_origem: event.requestContext?.ip,
        user_agent: event.requestContext?.userAgent,
        endpoint: event.requestContext?.endpoint,
        metodo_http: event.requestContext?.method,
        dados_novos: event.newData,
      });
      this.logger.debug(
        `Evento de entidade processado: ${event.entityName} - ${event.eventType}`,
      );
    } catch (error) {
      this.logger.error('Erro ao processar evento de entidade:', error);
    }
  }

  /**
   * Processa eventos de criação de entidade
   */
  // @ts-ignore: TS1270 - Decorator compatibility issue with TypeScript 5.x
  @OnEvent('audit.entity.created')
  async handleEntityCreated(event: EntityAuditEvent): Promise<void> {
    try {
      const riskLevel = event.sensitiveFieldsChanged
        ? RiskLevel.HIGH
        : RiskLevel.LOW;

      await this.auditCoreService.createAuditLog({
        tipo_operacao: this.mapEventTypeToTipoOperacao(event.eventType),
        entidade_afetada: event.entityName,
        entidade_id: event.entityId,
        usuario_id: event.userId,
        descricao: `Entidade criada: ${event.entityName}`,
        nivel_risco: riskLevel,
        lgpd_relevante: event.lgpdRelevant,
        metadata: event.metadata,
        data_hora: event.timestamp,
        ip_origem: event.requestContext?.ip,
        user_agent: event.requestContext?.userAgent,
        endpoint: event.requestContext?.endpoint,
        metodo_http: event.requestContext?.method,
        dados_novos: event.newData,
      });

      this.logger.debug(
        `Entidade criada: ${event.entityName} (ID: ${event.entityId})`,
      );
    } catch (error) {
      this.logger.error('Erro ao processar criação de entidade:', error);
    }
  }

  /**
   * Processa eventos de atualização de entidade
   */
  // @ts-ignore: TS1270 - Decorator compatibility issue with TypeScript 5.x
  @OnEvent('audit.entity.updated')
  async handleEntityUpdated(event: EntityAuditEvent): Promise<void> {
    try {
      // Calcula o nível de risco baseado nos campos alterados
      const riskLevel = this.calculateUpdateRiskLevel(event);

      await this.auditCoreService.createAuditLog({
        tipo_operacao: this.mapEventTypeToTipoOperacao(event.eventType),
        entidade_afetada: event.entityName,
        entidade_id: event.entityId,
        usuario_id: event.userId,
        descricao: `Entidade atualizada: ${event.entityName} - Campos: ${event.changedFields?.join(', ')}`,
        nivel_risco: riskLevel,
        lgpd_relevante: event.lgpdRelevant,
        metadata: event.metadata,
        data_hora: event.timestamp,
        ip_origem: event.requestContext?.ip,
        user_agent: event.requestContext?.userAgent,
        endpoint: event.requestContext?.endpoint,
        metodo_http: event.requestContext?.method,
        dados_anteriores: event.previousData,
        dados_novos: event.newData,
      });

      this.logger.debug(
        `Entidade atualizada: ${event.entityName} - Campos: ${event.changedFields?.join(', ')}`,
      );
    } catch (error) {
      this.logger.error('Erro ao processar atualização de entidade:', error);
    }
  }

  /**
   * Processa eventos de exclusão de entidade
   */
  // @ts-ignore: TS1270 - Decorator compatibility issue with TypeScript 5.x
  @OnEvent('audit.entity.deleted')
  async handleEntityDeleted(event: EntityAuditEvent): Promise<void> {
    try {
      // Exclusões sempre têm risco alto
      await this.auditCoreService.createAuditLog({
        tipo_operacao: this.mapEventTypeToTipoOperacao(event.eventType),
        entidade_afetada: event.entityName,
        entidade_id: event.entityId,
        usuario_id: event.userId,
        descricao: `Entidade excluída: ${event.entityName}`,
        nivel_risco: RiskLevel.HIGH,
        lgpd_relevante: event.lgpdRelevant,
        metadata: event.metadata,
        data_hora: event.timestamp,
        ip_origem: event.requestContext?.ip,
        user_agent: event.requestContext?.userAgent,
        endpoint: event.requestContext?.endpoint,
        metodo_http: event.requestContext?.method,
        dados_anteriores: event.previousData,
      });

      this.logger.warn(
        `Entidade excluída: ${event.entityName} - ID: ${event.entityId}`,
      );
    } catch (error) {
      this.logger.error('Erro ao processar exclusão de entidade:', error);
    }
  }

  /**
   * Processa eventos de acesso a entidade
   */
  // @ts-ignore: TS1270 - Decorator compatibility issue with TypeScript 5.x
  @OnEvent('audit.entity.accessed')
  async handleEntityAccessed(event: EntityAuditEvent): Promise<void> {
    try {
      const riskLevel = event.sensitiveFieldsChanged
        ? RiskLevel.MEDIUM
        : RiskLevel.LOW;

      await this.auditCoreService.createAuditLog({
        tipo_operacao: this.mapEventTypeToTipoOperacao(event.eventType),
        entidade_afetada: event.entityName,
        entidade_id: event.entityId,
        usuario_id: event.userId,
        descricao: `Entidade acessada: ${event.entityName}`,
        nivel_risco: riskLevel,
        lgpd_relevante: event.lgpdRelevant,
        metadata: event.metadata,
        data_hora: event.timestamp,
        ip_origem: event.requestContext?.ip,
        user_agent: event.requestContext?.userAgent,
        endpoint: event.requestContext?.endpoint,
        metodo_http: event.requestContext?.method,
        dados_sensiveis_acessados: event.sensitiveFieldsChanged
          ? ['dados_sensíveis']
          : undefined,
      });

      this.logger.debug(
        `Entidade acessada: ${event.entityName} - ID: ${event.entityId}`,
      );
    } catch (error) {
      this.logger.error('Erro ao processar acesso a entidade:', error);
    }
  }

  /**
   * Processa eventos de segurança
   */
  // @ts-ignore: TS1270 - Decorator compatibility issue with TypeScript 5.x
  @OnEvent('audit.security')
  async handleSecurityEvent(event: SecurityAuditEvent): Promise<void> {
    try {
      // Eventos de segurança sempre têm risco alto
      await this.auditCoreService.createAuditLog({
        tipo_operacao: this.mapEventTypeToTipoOperacao(event.eventType),
        entidade_afetada: 'Sistema',
        entidade_id: event.entityId,
        usuario_id: event.userId,
        descricao: `Evento de segurança: ${event.eventType}`,
        nivel_risco: RiskLevel.HIGH,
        lgpd_relevante: event.lgpdRelevant,
        metadata: event.metadata,
        data_hora: event.timestamp,
        ip_origem: event.requestContext?.ip,
        user_agent: event.requestContext?.userAgent,
        endpoint: event.requestContext?.endpoint,
        metodo_http: event.requestContext?.method,
        dados_novos: {
          metadata: event.metadata,
        },
      });

      this.logger.warn(
        `Evento de segurança: ${event.eventType} - Usuário: ${event.userId}`,
      );
    } catch (error) {
      this.logger.error('Erro ao processar evento de segurança:', error);
    }
  }

  /**
   * Processa eventos de dados sensíveis
   */
  // @ts-ignore: TS1270 - Decorator compatibility issue with TypeScript 5.x
  @OnEvent('audit.sensitive')
  async handleSensitiveDataEvent(
    event: SensitiveDataAuditEvent,
  ): Promise<void> {
    try {
      // Dados sensíveis sempre têm risco alto para compliance LGPD
      await this.auditCoreService.createAuditLog({
        tipo_operacao: this.mapEventTypeToTipoOperacao(event.eventType),
        entidade_afetada: event.entityName || 'DadosSensíveis',
        entidade_id: event.entityId,
        usuario_id: event.userId,
        descricao: `Acesso a dados sensíveis: ${event.eventType} - Campos: ${event.sensitiveFields?.join(', ')}`,
        nivel_risco: RiskLevel.HIGH,
        lgpd_relevante: true,
        metadata: event.metadata,
        data_hora: event.timestamp,
        ip_origem: event.requestContext?.ip,
        user_agent: event.requestContext?.userAgent,
        endpoint: event.requestContext?.endpoint,
        metodo_http: event.requestContext?.method,
        dados_sensiveis_acessados: event.sensitiveFields,
        dados_novos: {
          purpose: event.purpose,
          legalBasis: event.legalBasis,
          metadata: event.metadata,
        },
      });

      this.logger.warn(
        `Acesso a dados sensíveis: ${event.eventType} - Campos: ${event.sensitiveFields?.join(', ')}`,
      );
    } catch (error) {
      this.logger.error('Erro ao processar evento de dados sensíveis:', error);
    }
  }

  /**
   * Processa eventos de sistema
   */
  // @ts-ignore: TS1270 - Decorator compatibility issue with TypeScript 5.x
  @OnEvent('audit.system')
  async handleSystemEvent(event: SystemAuditEvent): Promise<void> {
    try {
      const riskLevel =
        event.eventType === AuditEventType.SYSTEM_ERROR
          ? RiskLevel.HIGH
          : RiskLevel.LOW;

      await this.auditCoreService.createAuditLog({
        tipo_operacao: this.mapEventTypeToTipoOperacao(event.eventType),
        entidade_afetada: 'Sistema',
        entidade_id: event.entityId,
        usuario_id: event.userId || 'sistema',
        descricao: `Evento de sistema: ${event.eventType}`,
        nivel_risco: riskLevel,
        lgpd_relevante: event.lgpdRelevant,
        metadata: event.metadata,
        data_hora: event.timestamp,
        ip_origem: event.requestContext?.ip,
        user_agent: event.requestContext?.userAgent,
        endpoint: event.requestContext?.endpoint,
        metodo_http: event.requestContext?.method,
        dados_novos: {
          metadata: event.metadata,
        },
      });

      this.logger.debug(`Evento de sistema: ${event.eventType}`);
    } catch (error) {
      this.logger.error('Erro ao processar evento de sistema:', error);
    }
  }

  /**
   * Processa eventos de método
   */
  // @ts-ignore: TS1270 - Decorator compatibility issue with TypeScript 5.x
  @OnEvent('audit.method')
  async handleMethodEvent(event: BaseAuditEvent): Promise<void> {
    try {
      await this.auditCoreService.createAuditLog({
        tipo_operacao: this.mapEventTypeToTipoOperacao(event.eventType),
        entidade_afetada: event.entityName || 'Método',
        entidade_id: event.entityId,
        usuario_id: event.userId,
        descricao: `Método auditado: ${event.metadata?.controller}.${event.metadata?.method}`,
        data_hora: event.timestamp,
        ip_origem: event.requestContext?.ip,
        user_agent: event.requestContext?.userAgent,
        endpoint: event.requestContext?.endpoint,
        metodo_http: event.requestContext?.method,
        dados_novos: event.metadata,
      });

      this.logger.debug(
        `Método auditado: ${event.metadata?.controller}.${event.metadata?.method}`,
      );
    } catch (error) {
      this.logger.error('Erro ao processar evento de método:', error);
    }
  }

  /**
   * Processa eventos de requisição (middleware)
   */
  // @ts-ignore: TS1270 - Decorator compatibility issue with TypeScript 5.x
  @OnEvent('audit.request')
  async handleRequestEvent(event: BaseAuditEvent): Promise<void> {
    try {
      await this.auditCoreService.createAuditLog({
        tipo_operacao: this.mapEventTypeToTipoOperacao(event.eventType),
        entidade_afetada: 'Requisição',
        entidade_id: event.entityId,
        usuario_id: event.userId,
        descricao: `Requisição auditada: ${event.metadata?.method} ${event.metadata?.url}`,
        data_hora: event.timestamp,
        ip_origem: event.requestContext?.ip,
        user_agent: event.requestContext?.userAgent,
        endpoint: event.requestContext?.endpoint,
        metodo_http: event.requestContext?.method,
        dados_novos: event.metadata,
      });

      this.logger.debug(
        `Requisição auditada: ${event.metadata?.method} ${event.metadata?.url}`,
      );
    } catch (error) {
      this.logger.error('Erro ao processar evento de requisição:', error);
    }
  }

  /**
   * Processa eventos configurados (decorator @Audit)
   */
  // @ts-ignore: TS1270 - Decorator compatibility issue with TypeScript 5.x
  @OnEvent('audit.configured')
  async handleConfiguredEvent(event: BaseAuditEvent): Promise<void> {
    try {
      await this.auditCoreService.createAuditLog({
        tipo_operacao: this.mapEventTypeToTipoOperacao(event.eventType),
        entidade_afetada:
          event.entityName || event.metadata?.entity || 'Configurado',
        entidade_id: event.entityId,
        usuario_id: event.userId,
        descricao: `Evento configurado: ${event.metadata?.entity} - ${event.metadata?.operation}`,
        data_hora: event.timestamp,
        ip_origem: event.requestContext?.ip,
        user_agent: event.requestContext?.userAgent,
        endpoint: event.requestContext?.endpoint,
        metodo_http: event.requestContext?.method,
        dados_novos: event.metadata,
      });

      this.logger.debug(
        `Evento configurado processado: ${event.metadata?.entity} - ${event.metadata?.operation}`,
      );
    } catch (error) {
      this.logger.error('Erro ao processar evento configurado:', error);
    }
  }

  /**
   * Processa eventos automáticos (decorator @AutoAudit)
   */
  // @ts-ignore: TS1270 - Decorator compatibility issue with TypeScript 5.x
  @OnEvent('audit.auto')
  async handleAutoEvent(event: BaseAuditEvent): Promise<void> {
    try {
      await this.auditCoreService.createAuditLog({
        tipo_operacao: this.mapEventTypeToTipoOperacao(event.eventType),
        entidade_afetada: event.entityName || 'AutoAudit',
        entidade_id: event.entityId,
        usuario_id: event.userId,
        descricao: `Evento automático: ${event.metadata?.controller}.${event.metadata?.method}`,
        data_hora: event.timestamp,
        ip_origem: event.requestContext?.ip,
        user_agent: event.requestContext?.userAgent,
        endpoint: event.requestContext?.endpoint,
        metodo_http: event.requestContext?.method,
        dados_novos: event.metadata,
        nivel_risco: event.riskLevel || RiskLevel.LOW,
      });

      this.logger.debug(
        `Evento automático processado: ${event.metadata?.controller}.${event.metadata?.method}`,
      );
    } catch (error) {
      this.logger.error('Erro ao processar evento automático:', error);
    }
  }

  /**
   * Calcula o nível de risco para atualizações baseado nos campos alterados
   */
  private calculateUpdateRiskLevel(event: EntityAuditEvent): RiskLevel {
    const changedFields = event.changedFields || [];

    // Campos críticos que elevam o risco
    const criticalFields = [
      'password',
      'email',
      'role',
      'permissions',
      'status',
    ];
    const sensitiveFields = ['cpf', 'rg', 'phone', 'address', 'salary'];

    const hasCriticalChanges = changedFields.some((field) =>
      criticalFields.includes(field.toLowerCase()),
    );

    const hasSensitiveChanges = changedFields.some((field) =>
      sensitiveFields.includes(field.toLowerCase()),
    );

    if (hasCriticalChanges) {
      return RiskLevel.HIGH;
    }

    if (hasSensitiveChanges) {
      return RiskLevel.MEDIUM;
    }

    return RiskLevel.LOW;
  }

  /**
   * Processa eventos de ação do usuário
   */
  // @ts-ignore: TS1270 - Decorator compatibility issue with TypeScript 5.x
  @OnEvent('audit.user.action')
  async handleUserActionEvent(event: any): Promise<void> {
    try {
      await this.auditCoreService.createAuditLog({
        tipo_operacao: event.action || 'USER_ACTION',
        entidade_afetada: event.entityName || 'Usuario',
        entidade_id: event.entityId,
        usuario_id: event.userId,
        descricao: event.description || `Ação do usuário: ${event.action}`,
        nivel_risco: event.riskLevel || RiskLevel.LOW,
        lgpd_relevante: event.lgpdRelevant || false,
        metadata: event.metadata,
        data_hora: event.timestamp || new Date(),
        ip_origem: event.clientInfo?.ip,
        user_agent: event.clientInfo?.userAgent,
        endpoint: event.clientInfo?.endpoint,
        metodo_http: event.clientInfo?.method,
        dados_novos: {
          action: event.action,
          details: event.details,
          ...event.metadata,
        },
      });
    } catch (error) {
      this.logger.error('Erro ao processar evento de ação do usuário', {
        error: error.message,
        event,
      });
    }
  }

  /**
   * Processa eventos síncronos de auditoria
   */
  // @ts-ignore: TS1270 - Decorator compatibility issue with TypeScript 5.x
  @OnEvent('audit.process.sync')
  async handleProcessSync(event: AuditEvent): Promise<void> {
    try {
      // Verificar se é um EntityAuditEvent para acessar previousData e newData
      const isEntityEvent = 'previousData' in event || 'newData' in event;
      const entityEvent = isEntityEvent ? (event as any) : null;

      await this.auditCoreService.createAuditLog({
        tipo_operacao: this.mapEventTypeToTipoOperacao(event.eventType),
        entidade_afetada: event.entityName,
        entidade_id: event.entityId,
        usuario_id: event.userId,
        descricao: `Sincronização de processo: ${event.eventType}`,
        nivel_risco: event.riskLevel || RiskLevel.LOW,
        ip_origem: event.requestContext?.ip,
        user_agent: event.requestContext?.userAgent,
        endpoint: event.requestContext?.endpoint,
        metodo_http: event.requestContext?.method,
        dados_anteriores: entityEvent?.previousData,
        dados_novos: entityEvent?.newData,
        lgpd_relevante: event.lgpdRelevant || false,
        metadata: event.metadata,
      });
    } catch (error) {
      console.error('Erro ao processar evento audit.process.sync:', error);
    }
  }

  /**
   * Processa eventos de segurança com padrão específico
   */
  // @ts-ignore: TS1270 - Decorator compatibility issue with TypeScript 5.x
  @OnEvent('audit.security.event')
  async handleSecurityEventSpecific(event: any): Promise<void> {
    try {
      await this.auditCoreService.createAuditLog({
        tipo_operacao: event.eventType || 'SECURITY_EVENT',
        entidade_afetada: event.entityName || 'Sistema',
        entidade_id: event.entityId,
        usuario_id: event.userId,
        descricao:
          event.description || `Evento de segurança: ${event.eventType}`,
        nivel_risco:
          event.severity === 'HIGH'
            ? RiskLevel.HIGH
            : event.severity === 'MEDIUM'
              ? RiskLevel.MEDIUM
              : RiskLevel.LOW,
        lgpd_relevante: event.lgpdRelevant || false,
        metadata: event.metadata,
        data_hora: event.timestamp || new Date(),
        ip_origem: event.clientInfo?.ip,
        user_agent: event.clientInfo?.userAgent,
        endpoint: event.clientInfo?.endpoint,
        metodo_http: event.clientInfo?.method,
        dados_novos: {
          eventType: event.eventType,
          severity: event.severity,
          details: event.details,
          ...event.metadata,
        },
      });
    } catch (error) {
      this.logger.error('Erro ao processar evento específico de segurança', {
        error: error.message,
        event,
      });
    }
  }

  /**
   * Mapeia o tipo de evento para o tipo de operação
   */
  private mapEventTypeToTipoOperacao(eventType: AuditEventType): TipoOperacao {
    switch (eventType) {
      case AuditEventType.ENTITY_CREATED:
        return TipoOperacao.CREATE;
      case AuditEventType.ENTITY_UPDATED:
        return TipoOperacao.UPDATE;
      case AuditEventType.ENTITY_DELETED:
        return TipoOperacao.DELETE;
      case AuditEventType.ENTITY_ACCESSED:
        return TipoOperacao.READ;
      case AuditEventType.SENSITIVE_DATA_ACCESSED:
        return TipoOperacao.ACCESS;
      case AuditEventType.SENSITIVE_DATA_EXPORTED:
        return TipoOperacao.EXPORT;
      case AuditEventType.SYSTEM_ERROR:
      case AuditEventType.SYSTEM_WARNING:
      case AuditEventType.SYSTEM_INFO:
        return TipoOperacao.ACCESS;
      default:
        return TipoOperacao.ACCESS;
    }
  }
}
