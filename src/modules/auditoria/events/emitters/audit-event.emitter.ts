/**
 * AuditEventEmitter
 * 
 * Emissor de eventos de auditoria que substitui o AuditoriaService.
 * Utiliza EventEmitter2 para emissão síncrona e BullMQ para processamento assíncrono.
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  AuditEvent,
  AuditEventType,
  EntityAuditEvent,
  SecurityAuditEvent,
  SystemAuditEvent,
  SensitiveDataAuditEvent,
  AuditEventConfig,
  RiskLevel,
} from '../types/audit-event.types';

@Injectable()
export class AuditEventEmitter {
  private readonly logger = new Logger(AuditEventEmitter.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue('auditoria') private readonly auditQueue: Queue,
  ) {}

  /**
   * Emite um evento de auditoria
   */
  async emit(event: AuditEvent, config?: AuditEventConfig): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Validação básica
      this.validateEvent(event);
      
      // Enriquece o evento com dados padrão
      const enrichedEvent = this.enrichEvent(event);
      
      // Emite evento síncrono para listeners imediatos
      this.eventEmitter.emit(enrichedEvent.eventType, enrichedEvent);
      
      // Determina se deve processar de forma síncrona
      const shouldProcessSync = config?.synchronous || this.shouldProcessSynchronously(enrichedEvent);
      
      if (shouldProcessSync) {
        // Processamento síncrono para eventos críticos
        this.eventEmitter.emit('audit.process.sync', enrichedEvent);
      } else {
        // Adiciona à fila para processamento assíncrono
        await this.addToQueue(enrichedEvent, config);
      }
      
      const duration = Date.now() - startTime;
      this.logger.debug(`Event emitted in ${duration}ms: ${enrichedEvent.eventType}`);
      
    } catch (error) {
      this.logger.error(`Failed to emit audit event: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Emite evento de criação de entidade
   */
  async emitEntityCreated(
    entityName: string,
    entityId: string,
    newData: Record<string, any>,
    userId?: string,
    config?: AuditEventConfig,
  ): Promise<void> {
    const event: EntityAuditEvent = {
      eventType: AuditEventType.ENTITY_CREATED,
      entityName,
      entityId,
      userId,
      timestamp: new Date(),
      newData,
      riskLevel: RiskLevel.LOW,
      lgpdRelevant: this.containsSensitiveData(newData),
    };

    await this.emit(event, config);
  }

  /**
   * Emite evento de atualização de entidade
   */
  async emitEntityUpdated(
    entityName: string,
    entityId: string,
    previousData: Record<string, any>,
    newData: Record<string, any>,
    userId?: string,
    config?: AuditEventConfig,
  ): Promise<void> {
    const changedFields = this.getChangedFields(previousData, newData);
    const sensitiveFieldsChanged = this.hasSensitiveFieldsChanged(changedFields);

    const event: EntityAuditEvent = {
      eventType: AuditEventType.ENTITY_UPDATED,
      entityName,
      entityId,
      userId,
      timestamp: new Date(),
      previousData,
      newData,
      changedFields,
      sensitiveFieldsChanged,
      riskLevel: sensitiveFieldsChanged ? RiskLevel.MEDIUM : RiskLevel.LOW,
      lgpdRelevant: sensitiveFieldsChanged || this.containsSensitiveData(newData),
    };

    await this.emit(event, config);
  }

  /**
   * Emite evento de exclusão de entidade
   */
  async emitEntityDeleted(
    entityName: string,
    entityId: string,
    previousData: Record<string, any>,
    userId?: string,
    config?: AuditEventConfig,
  ): Promise<void> {
    const event: EntityAuditEvent = {
      eventType: AuditEventType.ENTITY_DELETED,
      entityName,
      entityId,
      userId,
      timestamp: new Date(),
      previousData,
      riskLevel: RiskLevel.MEDIUM,
      lgpdRelevant: this.containsSensitiveData(previousData),
    };

    await this.emit(event, config);
  }

  /**
   * Emite evento de acesso a entidade
   */
  async emitEntityAccessed(
    entityName: string,
    entityId: string,
    userId?: string,
    config?: AuditEventConfig,
  ): Promise<void> {
    const event: EntityAuditEvent = {
      eventType: AuditEventType.ENTITY_ACCESSED,
      entityName,
      entityId,
      userId,
      timestamp: new Date(),
      riskLevel: RiskLevel.LOW,
      lgpdRelevant: this.isEntitySensitive(entityName),
    };

    await this.emit(event, config);
  }

  /**
   * Emite evento de segurança
   */
  async emitSecurityEvent(
    eventType: SecurityAuditEvent['eventType'],
    userId?: string,
    metadata?: Record<string, any>,
    config?: AuditEventConfig,
  ): Promise<void> {
    const event: SecurityAuditEvent = {
      eventType,
      entityName: 'security',
      userId,
      timestamp: new Date(),
      riskLevel: this.getSecurityEventRiskLevel(eventType),
      lgpdRelevant: true,
      metadata,
    };

    await this.emit(event, { ...config, synchronous: true }); // Eventos de segurança são sempre síncronos
  }

  /**
   * Emite evento de dados sensíveis
   */
  async emitSensitiveDataEvent(
    eventType: SensitiveDataAuditEvent['eventType'],
    entityName: string,
    entityId: string,
    userId: string,
    sensitiveFields: string[],
    legalBasis?: string,
    purpose?: string,
    config?: AuditEventConfig,
  ): Promise<void> {
    const event: SensitiveDataAuditEvent = {
      eventType,
      entityName,
      entityId,
      userId,
      timestamp: new Date(),
      riskLevel: RiskLevel.HIGH,
      lgpdRelevant: true,
      sensitiveFields,
      legalBasis,
      purpose,
    };

    await this.emit(event, { ...config, synchronous: true }); // Eventos LGPD são sempre síncronos
  }

  /**
   * Emite evento de sistema
   */
  async emitSystemEvent(
    eventType: SystemAuditEvent['eventType'],
    metadata?: Record<string, any>,
    config?: AuditEventConfig,
  ): Promise<void> {
    const event: SystemAuditEvent = {
      eventType,
      entityName: 'system',
      timestamp: new Date(),
      riskLevel: RiskLevel.LOW,
      lgpdRelevant: false,
      metadata,
    };

    await this.emit(event, config);
  }

  /**
   * Valida se o evento está bem formado
   */
  private validateEvent(event: AuditEvent): void {
    if (!event.eventType) {
      throw new Error('Event type is required');
    }
    
    if (!event.entityName) {
      throw new Error('Entity name is required');
    }
    
    if (!event.timestamp) {
      throw new Error('Timestamp is required');
    }
  }

  /**
   * Enriquece o evento com dados padrão
   */
  private enrichEvent(event: AuditEvent): AuditEvent {
    return {
      ...event,
      timestamp: event.timestamp || new Date(),
      riskLevel: event.riskLevel || RiskLevel.LOW,
      lgpdRelevant: event.lgpdRelevant ?? false,
    };
  }

  /**
   * Determina se o evento deve ser processado de forma síncrona
   */
  private shouldProcessSynchronously(event: AuditEvent): boolean {
    // Eventos críticos ou de segurança devem ser processados sincronamente
    return (
      event.riskLevel === RiskLevel.CRITICAL ||
      event.eventType.startsWith('security.') ||
      event.eventType.startsWith('lgpd.') ||
      event.lgpdRelevant === true
    );
  }

  /**
   * Adiciona evento à fila para processamento assíncrono
   */
  private async addToQueue(event: AuditEvent, config?: AuditEventConfig): Promise<void> {
    const jobOptions = {
      priority: config?.priority || this.getEventPriority(event),
      delay: config?.delay || 0,
      attempts: config?.attempts || 3,
      removeOnComplete: 100,
      removeOnFail: 50,
    };

    await this.auditQueue.add('process-audit-event', {
      event,
      config,
    }, jobOptions);
  }

  /**
   * Obtém a prioridade do evento para a fila
   */
  private getEventPriority(event: AuditEvent): number {
    switch (event.riskLevel) {
      case RiskLevel.CRITICAL:
        return 1;
      case RiskLevel.HIGH:
        return 2;
      case RiskLevel.MEDIUM:
        return 3;
      case RiskLevel.LOW:
      default:
        return 4;
    }
  }

  /**
   * Verifica se os dados contêm informações sensíveis
   */
  private containsSensitiveData(data: Record<string, any>): boolean {
    const sensitiveFields = ['cpf', 'rg', 'email', 'telefone', 'endereco', 'senha', 'password'];
    return Object.keys(data || {}).some(key => 
      sensitiveFields.some(field => key.toLowerCase().includes(field))
    );
  }

  /**
   * Obtém os campos que foram alterados
   */
  private getChangedFields(previousData: Record<string, any>, newData: Record<string, any>): string[] {
    const changedFields: string[] = [];
    
    for (const key in newData) {
      if (JSON.stringify(previousData[key]) !== JSON.stringify(newData[key])) {
        changedFields.push(key);
      }
    }
    
    return changedFields;
  }

  /**
   * Verifica se campos sensíveis foram alterados
   */
  private hasSensitiveFieldsChanged(changedFields: string[]): boolean {
    const sensitiveFields = ['cpf', 'rg', 'email', 'telefone', 'endereco', 'senha', 'password'];
    return changedFields.some(field => 
      sensitiveFields.some(sensitive => field.toLowerCase().includes(sensitive))
    );
  }

  /**
   * Verifica se a entidade é sensível
   */
  private isEntitySensitive(entityName: string): boolean {
    const sensitiveEntities = ['user', 'citizen', 'beneficiary', 'usuario', 'cidadao', 'beneficiario'];
    return sensitiveEntities.some(entity => entityName.toLowerCase().includes(entity));
  }

  /**
   * Obtém o nível de risco para eventos de segurança
   */
  private getSecurityEventRiskLevel(eventType: SecurityAuditEvent['eventType']): RiskLevel {
    switch (eventType) {
      case AuditEventType.FAILED_LOGIN:
      case AuditEventType.ACCOUNT_LOCKED:
      case AuditEventType.SUSPICIOUS_ACTIVITY:
        return RiskLevel.HIGH;
      case AuditEventType.PASSWORD_CHANGED:
      case AuditEventType.PASSWORD_RESET:
      case AuditEventType.PERMISSION_CHANGED:
        return RiskLevel.MEDIUM;
      case AuditEventType.SUCCESSFUL_LOGIN:
      case AuditEventType.LOGOUT:
      case AuditEventType.TOKEN_REFRESH:
      default:
        return RiskLevel.LOW;
    }
  }
}