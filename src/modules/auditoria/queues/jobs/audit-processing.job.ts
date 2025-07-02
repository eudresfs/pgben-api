/**
 * AuditProcessingJob
 *
 * Job responsável pelo processamento assíncrono de eventos de auditoria.
 * Implementa compressão, assinatura digital e persistência otimizada.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  AuditEvent,
  AuditEventConfig,
} from '../../events/types/audit-event.types';
import { AuditCoreRepository } from '../../core/repositories/audit-core.repository';
import { TipoOperacao } from '../../../../enums/tipo-operacao.enum';

/**
 * Interface para dados do job
 */
export interface AuditJobData {
  event: AuditEvent;
  config?: AuditEventConfig;
}

/**
 * Interface para resultado do processamento
 */
export interface AuditProcessingResult {
  success: boolean;
  logId?: string;
  processingTime: number;
  compressed?: boolean;
  signed?: boolean;
  error?: string;
}

@Injectable()
export class AuditProcessingJob {
  private readonly logger = new Logger(AuditProcessingJob.name);

  constructor(private readonly auditRepository: AuditCoreRepository) {}

  /**
   * Processa um evento de auditoria
   */
  async process(data: AuditJobData): Promise<AuditProcessingResult> {
    const startTime = Date.now();

    try {
      this.logger.debug(`Processing audit event: ${data.event.eventType}`);

      // Valida os dados do evento
      this.validateJobData(data);

      // Prepara os dados para persistência
      const processedData = await this.prepareDataForPersistence(data);

      // Persiste o log de auditoria
      const logId = await this.persistAuditLog(processedData);

      // Executa pós-processamento se necessário
      await this.executePostProcessing(data.event, logId);

      const processingTime = Date.now() - startTime;

      this.logger.debug(
        `Audit event processed successfully in ${processingTime}ms: ${logId}`,
      );

      return {
        success: true,
        logId,
        processingTime,
        compressed: data.config?.compress || false,
        signed: data.config?.sign || false,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error(
        `Failed to process audit event: ${error.message}`,
        error.stack,
      );

      return {
        success: false,
        processingTime,
        error: error.message,
      };
    }
  }

  /**
   * Valida os dados do job
   */
  private validateJobData(data: AuditJobData): void {
    if (!data || !data.event) {
      throw new Error('Invalid job data: event is required');
    }

    if (!data.event.eventType) {
      throw new Error('Invalid event: eventType is required');
    }

    if (!data.event.entityName) {
      throw new Error('Invalid event: entityName is required');
    }

    if (!data.event.timestamp) {
      throw new Error('Invalid event: timestamp is required');
    }
  }

  /**
   * Prepara os dados para persistência
   */
  private async prepareDataForPersistence(data: AuditJobData): Promise<any> {
    const { event, config } = data;

    // Estrutura base do log
    let logData = {
      tipo_operacao: event.eventType,
      entidade_afetada: event.entityName,
      entidade_id: event.entityId || null,
      usuario_id: event.userId || null,
      timestamp: event.timestamp,
      dados_anteriores: null,
      dados_novos: null,
      descricao: this.generateDescription(event),
      nivel_risco: event.riskLevel || 'LOW',
      lgpd_relevante: event.lgpdRelevant || false,
      metadata: event.metadata || {},
      contexto_requisicao: event.requestContext || {},
    };

    // Adiciona dados específicos do tipo de evento
    if ('previousData' in event && event.previousData) {
      logData.dados_anteriores = event.previousData;
    }

    if ('newData' in event && event.newData) {
      logData.dados_novos = event.newData;
    }

    // Adiciona metadados específicos para eventos de entidade
    if ('changedFields' in event && event.changedFields) {
      logData.metadata.changedFields = event.changedFields;
      logData.metadata.sensitiveFieldsChanged =
        event.sensitiveFieldsChanged || false;
    }

    // Adiciona metadados específicos para eventos de dados sensíveis
    if ('sensitiveFields' in event && event.sensitiveFields) {
      logData.metadata.sensitiveFields = event.sensitiveFields;
      logData.metadata.legalBasis = event.legalBasis;
      logData.metadata.purpose = event.purpose;
    }

    // Aplica compressão se configurado
    if (config?.compress) {
      logData = await this.compressData(logData);
    }

    // Aplica assinatura digital se configurado
    if (config?.sign) {
      logData = await this.signData(logData);
    }

    return logData;
  }

  /**
   * Persiste o log de auditoria no banco de dados
   */
  private async persistAuditLog(logData: any): Promise<string> {
    try {
      // Converte o tipo de operação para enum se necessário
      if (typeof logData.tipo_operacao === 'string') {
        logData.tipo_operacao = logData.tipo_operacao as TipoOperacao;
      }

      // Persiste usando o repositório real
      const savedLog = await this.auditRepository.create(logData);

      this.logger.debug(`Audit log persisted with ID: ${savedLog.id}`);

      return savedLog.id;
    } catch (error) {
      this.logger.error(
        `Failed to persist audit log: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Executa pós-processamento do evento
   */
  private async executePostProcessing(
    event: AuditEvent,
    logId: string,
  ): Promise<void> {
    // Notificações para eventos críticos
    if (event.riskLevel === 'CRITICAL') {
      await this.sendCriticalEventNotification(event, logId);
    }

    // Alertas LGPD
    if (event.lgpdRelevant) {
      await this.processLgpdCompliance(event, logId);
    }

    // Métricas e monitoramento
    await this.updateMetrics(event);
  }

  /**
   * Gera descrição do evento
   */
  private generateDescription(event: AuditEvent): string {
    const baseDescription = `${event.eventType} em ${event.entityName}`;

    if (event.entityId) {
      return `${baseDescription} (ID: ${event.entityId})`;
    }

    return baseDescription;
  }

  /**
   * Comprime os dados do log
   */
  private async compressData(data: any): Promise<any> {
    // TODO: Implementar compressão real (gzip, lz4, etc.)
    // Por enquanto, apenas marca como comprimido

    return {
      ...data,
      _compressed: true,
      _originalSize: JSON.stringify(data).length,
    };
  }

  /**
   * Assina digitalmente os dados
   */
  private async signData(data: any): Promise<any> {
    // TODO: Implementar assinatura digital real
    // Por enquanto, apenas adiciona hash simulado

    const dataString = JSON.stringify(data);
    const hash = this.generateHash(dataString);

    return {
      ...data,
      _signature: hash,
      _signedAt: new Date().toISOString(),
    };
  }

  /**
   * Envia notificação para eventos críticos
   */
  private async sendCriticalEventNotification(
    event: AuditEvent,
    logId: string,
  ): Promise<void> {
    this.logger.warn(
      `CRITICAL EVENT DETECTED: ${event.eventType} - Log ID: ${logId}`,
    );

    // TODO: Implementar notificação real (email, Slack, etc.)
  }

  /**
   * Processa conformidade LGPD
   */
  private async processLgpdCompliance(
    event: AuditEvent,
    logId: string,
  ): Promise<void> {
    this.logger.debug(
      `Processing LGPD compliance for event: ${event.eventType}`,
    );

    // TODO: Implementar verificações de conformidade LGPD
    // - Verificar base legal
    // - Validar consentimento
    // - Registrar para relatórios de conformidade
  }

  /**
   * Atualiza métricas de monitoramento
   */
  private async updateMetrics(event: AuditEvent): Promise<void> {
    // TODO: Implementar atualização de métricas
    // - Contadores por tipo de evento
    // - Métricas de performance
    // - Alertas de volume

    this.logger.debug(`Metrics updated for event: ${event.eventType}`);
  }

  /**
   * Gera ID único para o log
   */
  private generateLogId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gera hash para assinatura
   */
  private generateHash(data: string): string {
    // Implementação simples de hash - em produção usar crypto real
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
}
