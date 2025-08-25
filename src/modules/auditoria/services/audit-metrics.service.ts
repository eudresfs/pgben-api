import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import * as client from 'prom-client';
import { BaseAuditEvent } from '../events/types/audit-event.types';
import { OperationAuditEvent } from '../events/types/audit-event.types';
import { EntityAuditEvent } from '../events/types/audit-event.types';

/**
 * Serviço responsável por coletar e expor métricas específicas do sistema de auditoria
 * 
 * Este serviço monitora cada etapa do pipeline de auditoria:
 * - Interceptor → EventEmitter → BullMQ → Processor → Database
 * 
 * Métricas coletadas:
 * - Contadores de eventos por tipo e nível de risco
 * - Histogramas de duração de processamento
 * - Contadores de sucessos/falhas em cada etapa
 * - Métricas de performance do pipeline
 */
@Injectable()
export class AuditMetricsService {
  private readonly logger = new Logger(AuditMetricsService.name);
  private registry: client.Registry;

  // Contadores de eventos de auditoria
  private auditEventsTotal: client.Counter<string>;
  private auditEventsProcessed: client.Counter<string>;
  private auditEventsFailed: client.Counter<string>;
  
  // Histogramas de duração
  private auditProcessingDuration: client.Histogram<string>;
  private auditInterceptorDuration: client.Histogram<string>;
  private auditQueueDuration: client.Histogram<string>;
  
  // Contadores por etapa do pipeline
  private auditInterceptorEvents: client.Counter<string>;
  private auditEmitterEvents: client.Counter<string>;
  private auditQueueEvents: client.Counter<string>;
  private auditProcessorEvents: client.Counter<string>;
  private auditDatabaseEvents: client.Counter<string>;
  
  // Métricas de performance
  private auditQueueSize: client.Gauge<string>;
  private auditErrorRate: client.Gauge<string>;
  private auditThroughput: client.Gauge<string>;
  
  // Métricas de conformidade LGPD
  private lgpdComplianceEvents: client.Counter<string>;
  private sensitiveDataAccess: client.Counter<string>;
  
  constructor() {
    this.registry = new client.Registry();
    this.initializeMetrics();
    this.logger.log('Serviço de métricas de auditoria inicializado');
  }

  /**
   * Inicializa todas as métricas de auditoria
   */
  private initializeMetrics(): void {
    // Contadores de eventos
    this.auditEventsTotal = new client.Counter({
      name: 'audit_events_total',
      help: 'Total de eventos de auditoria gerados',
      labelNames: ['event_type', 'risk_level', 'source'],
      registers: [this.registry],
    });

    this.auditEventsProcessed = new client.Counter({
      name: 'audit_events_processed_total',
      help: 'Total de eventos de auditoria processados com sucesso',
      labelNames: ['event_type', 'processor'],
      registers: [this.registry],
    });

    this.auditEventsFailed = new client.Counter({
      name: 'audit_events_failed_total',
      help: 'Total de eventos de auditoria que falharam no processamento',
      labelNames: ['event_type', 'error_type', 'stage'],
      registers: [this.registry],
    });

    // Histogramas de duração
    this.auditProcessingDuration = new client.Histogram({
      name: 'audit_processing_duration_seconds',
      help: 'Duração do processamento de eventos de auditoria',
      labelNames: ['event_type', 'stage'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.auditInterceptorDuration = new client.Histogram({
      name: 'audit_interceptor_duration_seconds',
      help: 'Duração da captura de eventos no interceptor',
      labelNames: ['operation', 'risk_level'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [this.registry],
    });

    this.auditQueueDuration = new client.Histogram({
      name: 'audit_queue_duration_seconds',
      help: 'Tempo de permanência na fila de processamento',
      labelNames: ['event_type'],
      buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 300],
      registers: [this.registry],
    });

    // Contadores por etapa do pipeline
    this.auditInterceptorEvents = new client.Counter({
      name: 'audit_interceptor_events_total',
      help: 'Eventos capturados pelo interceptor',
      labelNames: ['operation', 'method', 'risk_level'],
      registers: [this.registry],
    });

    this.auditEmitterEvents = new client.Counter({
      name: 'audit_emitter_events_total',
      help: 'Eventos emitidos pelo event emitter',
      labelNames: ['event_type', 'status'],
      registers: [this.registry],
    });

    this.auditQueueEvents = new client.Counter({
      name: 'audit_queue_events_total',
      help: 'Eventos adicionados à fila BullMQ',
      labelNames: ['queue_name', 'status'],
      registers: [this.registry],
    });

    this.auditProcessorEvents = new client.Counter({
      name: 'audit_processor_events_total',
      help: 'Eventos processados pelo worker',
      labelNames: ['processor', 'status'],
      registers: [this.registry],
    });

    this.auditDatabaseEvents = new client.Counter({
      name: 'audit_database_events_total',
      help: 'Eventos persistidos no banco de dados',
      labelNames: ['table', 'operation', 'status'],
      registers: [this.registry],
    });

    // Métricas de performance
    this.auditQueueSize = new client.Gauge({
      name: 'audit_queue_size',
      help: 'Tamanho atual da fila de auditoria',
      labelNames: ['queue_name'],
      registers: [this.registry],
    });

    this.auditErrorRate = new client.Gauge({
      name: 'audit_error_rate',
      help: 'Taxa de erro do sistema de auditoria (0-1)',
      labelNames: ['component'],
      registers: [this.registry],
    });

    this.auditThroughput = new client.Gauge({
      name: 'audit_throughput_events_per_second',
      help: 'Taxa de processamento de eventos por segundo',
      labelNames: ['component'],
      registers: [this.registry],
    });

    // Métricas de conformidade LGPD
    this.lgpdComplianceEvents = new client.Counter({
      name: 'lgpd_compliance_events_total',
      help: 'Eventos relacionados à conformidade LGPD',
      labelNames: ['event_type', 'data_category', 'compliance_status'],
      registers: [this.registry],
    });

    this.sensitiveDataAccess = new client.Counter({
      name: 'sensitive_data_access_total',
      help: 'Acessos a dados sensíveis auditados',
      labelNames: ['entity', 'field', 'access_type', 'user_role'],
      registers: [this.registry],
    });
  }

  /**
   * Registra evento capturado pelo interceptor
   */
  recordInterceptorEvent(
    operation: string,
    method: string,
    riskLevel: string,
    duration: number,
  ): void {
    this.auditInterceptorEvents.inc({
      operation,
      method,
      risk_level: riskLevel,
    });

    this.auditInterceptorDuration.observe(
      { operation, risk_level: riskLevel },
      duration,
    );
  }

  /**
   * Registra evento emitido pelo event emitter
   */
  recordEmitterEvent(eventType: string, status: 'success' | 'failed'): void {
    this.auditEmitterEvents.inc({ event_type: eventType, status });
  }

  /**
   * Registra evento adicionado à fila
   */
  recordQueueEvent(
    queueName: string,
    status: 'added' | 'failed',
    duration?: number,
  ): void {
    this.auditQueueEvents.inc({ queue_name: queueName, status });
    
    if (duration !== undefined) {
      this.auditQueueDuration.observe({ event_type: queueName }, duration);
    }
  }

  /**
   * Registra evento processado pelo worker
   */
  recordProcessorEvent(
    processor: string,
    status: 'processed' | 'failed',
    duration: number,
    eventType?: string,
  ): void {
    this.auditProcessorEvents.inc({ processor, status });
    
    if (eventType) {
      this.auditProcessingDuration.observe(
        { event_type: eventType, stage: 'processor' },
        duration,
      );
    }
  }

  /**
   * Registra evento persistido no banco
   */
  recordDatabaseEvent(
    table: string,
    operation: string,
    status: 'success' | 'failed',
  ): void {
    this.auditDatabaseEvents.inc({ table, operation, status });
  }

  /**
   * Atualiza métricas de performance
   */
  updatePerformanceMetrics(
    queueSize: number,
    errorRate: number,
    throughput: number,
    component: string,
  ): void {
    this.auditQueueSize.set({ queue_name: component }, queueSize);
    this.auditErrorRate.set({ component }, errorRate);
    this.auditThroughput.set({ component }, throughput);
  }

  /**
   * Registra evento de conformidade LGPD
   */
  recordLGPDComplianceEvent(
    eventType: string,
    dataCategory: string,
    complianceStatus: 'compliant' | 'non_compliant' | 'pending',
  ): void {
    this.lgpdComplianceEvents.inc({
      event_type: eventType,
      data_category: dataCategory,
      compliance_status: complianceStatus,
    });
  }

  /**
   * Registra acesso a dados sensíveis
   */
  recordSensitiveDataAccess(
    entity: string,
    field: string,
    accessType: 'read' | 'write' | 'delete',
    userRole: string,
  ): void {
    this.sensitiveDataAccess.inc({
      entity,
      field,
      access_type: accessType,
      user_role: userRole,
    });
  }

  /**
   * Event listener para eventos de auditoria
   */
  @OnEvent('audit.**')
  handleAuditEvent(event: BaseAuditEvent): void {
    this.auditEventsTotal.inc({
      event_type: event.eventType,
      risk_level: event.riskLevel,
      source: 'event_emitter',
    });

    // Registrar métricas específicas baseadas no tipo de evento
    if (event.eventType.startsWith('OPERATION_')) {
      const operationEvent = event as OperationAuditEvent;
      this.recordInterceptorEvent(
        operationEvent.metadata.operation,
        operationEvent.metadata.method,
        operationEvent.riskLevel,
        operationEvent.metadata.duration || 0,
      );
    }

    if (event.eventType.startsWith('ENTITY_')) {
      const entityEvent = event as EntityAuditEvent;
      this.recordDatabaseEvent(
        entityEvent.metadata.entityName,
        entityEvent.metadata.operation,
        'success',
      );
    }
  }

  /**
   * Obtém todas as métricas de auditoria
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Obtém o registry para integração com outros sistemas
   */
  getRegistry(): client.Registry {
    return this.registry;
  }

  /**
   * Registra sucesso na persistência no banco de dados
   */
  recordDatabaseSuccess(): void {
    try {
      this.auditDatabaseEvents.inc({
        table: 'audit_logs',
        operation: 'insert',
        status: 'success',
      });
    } catch (error) {
      this.logger.error('Erro ao registrar sucesso no banco de dados', error.stack);
    }
  }

  /**
   * Registra falha na persistência no banco de dados
   * 
   * @param errorType - Tipo do erro ocorrido
   */
  recordDatabaseFailure(errorType: string): void {
    try {
      this.auditEventsFailed.inc({
        event_type: 'database_operation',
        error_type: errorType,
        stage: 'database',
      });
    } catch (error) {
      this.logger.error('Erro ao registrar falha no banco de dados', error.stack);
    }
  }

  /**
   * Reseta todas as métricas (útil para testes)
   */
  resetMetrics(): void {
    this.registry.clear();
    this.initializeMetrics();
    this.logger.log('Métricas de auditoria resetadas');
  }
}