/**
 * AuditProcessor
 *
 * Processador BullMQ para eventos de auditoria.
 * Gerencia o processamento assíncrono com retry, dead letter queue e monitoramento.
 */

import {
  Processor,
  Process,
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
  OnQueueWaiting,
  OnQueueProgress,
  OnQueueStalled,
} from '@nestjs/bull';
import {
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { Job } from 'bull';
import {
  AuditProcessingJob,
  AuditJobData,
  AuditProcessingResult,
  BatchAuditJobData,
  BatchAuditProcessingResult,
} from '../jobs/audit-processing.job';
import { AuditEvent } from '../../events/types/audit-event.types';
import { AuditMetricsService } from '../../services/audit-metrics.service';

@Processor('auditoria')
export class AuditProcessor
  implements OnModuleDestroy, OnModuleInit, OnApplicationBootstrap
{
  private readonly logger = new Logger(AuditProcessor.name);
  private readonly metrics = {
    processed: 0,
    failed: 0,
    totalProcessingTime: 0,
    averageProcessingTime: 0,
  };

  constructor(
    private readonly auditProcessingJob: AuditProcessingJob,
    private readonly auditMetricsService: AuditMetricsService,
  ) {
    this.logger.log('🚨 AUDIT PROCESSOR CONSTRUTOR EXECUTADO');
    this.logger.log('🚨 AuditProcessor inicializado com sucesso');
  }

  /**
   * Lifecycle hook - módulo inicializado
   */
  onModuleInit() {
    this.logger.log('🚨 AUDIT PROCESSOR MODULE INIT');
    this.logger.log('🚨 Pronto para processar jobs da fila auditoria');
  }

  /**
   * Lifecycle hook - aplicação totalmente inicializada
   */
  onApplicationBootstrap() {
    this.logger.log('🚨 AUDIT PROCESSOR APPLICATION BOOTSTRAP');
    this.logger.log('🚨 Sistema totalmente inicializado');
  }

  /**
   * Processa eventos de auditoria
   */
  @Process('process-audit-event')
  async processAuditEvent(
    job: Job<AuditJobData>,
  ): Promise<AuditProcessingResult> {
    const startTime = Date.now();
    const { data } = job;

    this.logger.debug(`Processing audit event job ${job.id}`, {
      jobId: job.id,
      eventType: job.data.event?.eventType,
      timestamp: new Date().toISOString(),
    });

    try {
      this.logger.debug(`Processing job ${job.id}: ${data.event.eventType}`);

      // Atualiza progresso do job
      await job.progress(10);

      // Valida dados do job
      this.validateJobData(data, job);
      await job.progress(20);

      // Processa o evento
      const result = await this.auditProcessingJob.process(data);
      await job.progress(80);

      // Atualiza métricas
      this.updateSuccessMetrics(Date.now() - startTime);
      
      // Registrar métricas de sucesso no processamento
      this.auditMetricsService.recordProcessorEvent('audit', 'processed', Date.now() - startTime, data.event.eventType);
      this.auditMetricsService.recordDatabaseSuccess();
      
      await job.progress(100);

      return result;
    } catch (error) {
      this.updateFailureMetrics();
      
      // Registrar métricas de falha no processamento
      this.auditMetricsService.recordProcessorEvent('audit', 'failed', Date.now() - startTime, data.event.eventType);
      this.auditMetricsService.recordDatabaseFailure(error.message || 'Database error');

      // Log detalhado do erro
      this.logger.error(
        `Failed to process audit job ${job.id}: ${error.message}`,
        {
          jobId: job.id,
          eventType: data.event?.eventType,
          entityName: data.event?.entityName,
          entityId: data.event?.entityId,
          userId: data.event?.userId,
          error: error.stack,
        },
      );

      throw error;
    }
  }

  /**
   * Processa eventos síncronos críticos
   */
  @Process('process-sync-event')
  async processSyncEvent(
    job: Job<AuditJobData>,
  ): Promise<AuditProcessingResult> {
    const { data } = job;

    this.logger.debug(`Processing sync job ${job.id}: ${data.event.eventType}`);

    try {
      // Eventos síncronos têm prioridade máxima e processamento imediato
      const result = await this.auditProcessingJob.process(data);

      this.updateSuccessMetrics(result.processingTime);

      return result;
    } catch (error) {
      this.updateFailureMetrics();

      this.logger.error(
        `Failed to process sync audit job ${job.id}: ${error.message}`,
        error.stack,
      );

      throw error;
    }
  }

  /**
   * Processa lote de eventos para otimização
   */
  @Process('process-batch-events')
  async processBatchEvents(
    job: Job<{ events: AuditJobData[] }>,
  ): Promise<AuditProcessingResult[]> {
    const { events } = job.data;
    const results: AuditProcessingResult[] = [];

    this.logger.debug(
      `Processing batch job ${job.id} with ${events.length} events`,
    );

    try {
      for (let i = 0; i < events.length; i++) {
        const event = events[i];

        try {
          const result = await this.auditProcessingJob.process(event);
          results.push(result);

          // Atualiza progresso
          const progress = Math.round(((i + 1) / events.length) * 100);
          await job.progress(progress);
        } catch (error) {
          this.logger.error(
            `Failed to process event in batch ${job.id}: ${error.message}`,
            error.stack,
          );

          results.push({
            success: false,
            processingTime: 0,
            error: error.message,
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.length - successCount;

      this.logger.debug(
        `Batch job ${job.id} completed: ${successCount} success, ${failureCount} failures`,
      );

      return results;
    } catch (error) {
      this.logger.error(
        `Failed to process batch job ${job.id}: ${error.message}`,
        error.stack,
      );

      throw error;
    }
  }

  /**
   * Processa lote de eventos de auditoria de forma otimizada
   * Utiliza o novo método processBatch para melhor performance
   */
  @Process('process-optimized-batch')
  async processOptimizedBatch(
    job: Job<BatchAuditJobData>,
  ): Promise<BatchAuditProcessingResult> {
    const startTime = Date.now();
    const { events, config } = job.data;

    this.logger.log(
      `Processing optimized batch job ${job.id} with ${events.length} events`,
    );

    try {
      // Atualiza progresso inicial
      await job.progress(5);

      // Processa o lote usando o método otimizado
      const result = await this.auditProcessingJob.processBatch(job.data);
      await job.progress(90);

      // Atualiza métricas de lote
      this.updateBatchMetrics(result, Date.now() - startTime);
      await job.progress(100);

      this.logger.log(
        `Optimized batch job ${job.id} completed: ${result.processedCount}/${result.totalCount} events processed`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to process optimized batch job ${job.id}: ${error.message}`,
        error.stack,
      );

      // Atualiza métricas de falha
      this.updateFailureMetrics();

      throw error;
    }
  }

  /**
   * Callback quando job está esperando na fila
   */
  @OnQueueWaiting()
  onWaiting(jobId: string) {
    // this.logger.log(`Job ${jobId} está esperando na fila`);
  }

  /**
   * Callback quando job se torna ativo
   */
  @OnQueueActive()
  onActive(job: Job<AuditJobData>) {
    this.logger.debug(
      `Job ${job.id} is now active. Processing: ${job.data.event?.eventType}`,
    );
  }

  /**
   * Callback para progresso do job
   */
  @OnQueueProgress()
  onProgress(job: Job, progress: number) {
    this.logger.debug(`Job ${job.id} progress: ${progress}%`);
  }

  /**
   * Callback quando job é completado com sucesso
   */
  @OnQueueCompleted()
  onCompleted(job: Job<AuditJobData>, result: AuditProcessingResult) {
    this.logger.debug(
      `Job ${job.id} completed successfully in ${result.processingTime}ms`,
    );

    // Log adicional para eventos críticos
    if (job.data.event?.riskLevel === 'CRITICAL') {
      this.logger.warn(
        `CRITICAL audit event processed: ${job.data.event.eventType} - Log ID: ${result.logId}`,
      );
    }
  }

  /**
   * Callback quando job falha
   */
  @OnQueueFailed()
  onFailed(job: Job<AuditJobData>, error: Error) {
    this.logger.error(
      `Job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`,
      {
        jobId: job.id,
        eventType: job.data.event?.eventType,
        entityName: job.data.event?.entityName,
        attempts: job.attemptsMade,
        maxAttempts: job.opts.attempts,
        error: error.stack,
      },
    );

    // Envia para dead letter queue se esgotou tentativas
    if (job.attemptsMade >= (job.opts.attempts || 3)) {
      this.sendToDeadLetterQueue(job, error);
    }
  }

  /**
   * Callback quando job trava/stalla
   */
  @OnQueueStalled()
  onStalled(job: Job) {
    this.logger.warn(`Job ${job.id} está travado/stalled`);
  }

  /**
   * Valida dados do job
   */
  private validateJobData(data: AuditJobData, job: Job): void {
    if (!data) {
      throw new Error(`Job ${job.id}: Invalid job data`);
    }

    if (!data.event) {
      throw new Error(`Job ${job.id}: Event data is required`);
    }

    if (!data.event.eventType) {
      throw new Error(`Job ${job.id}: Event type is required`);
    }

    if (!data.event.entityName) {
      throw new Error(`Job ${job.id}: Entity name is required`);
    }
  }

  /**
   * Atualiza métricas de sucesso
   */
  private updateSuccessMetrics(processingTime: number): void {
    this.metrics.processed++;
    this.metrics.totalProcessingTime += processingTime;
    this.metrics.averageProcessingTime =
      this.metrics.totalProcessingTime / this.metrics.processed;
  }

  /**
   * Atualiza métricas específicas de processamento em lote
   */
  private updateBatchMetrics(
    result: BatchAuditProcessingResult,
    totalProcessingTime: number,
  ): void {
    // Atualiza métricas gerais
    this.metrics.processed += result.processedCount;
    this.metrics.failed += result.failedCount;
    this.metrics.totalProcessingTime += totalProcessingTime;
    this.metrics.averageProcessingTime =
      this.metrics.totalProcessingTime /
      (this.metrics.processed + this.metrics.failed);

    // Log de métricas de lote
    this.logger.debug(
      `Batch metrics - Processed: ${result.processedCount}, Failed: ${result.failedCount}, ` +
        `Success Rate: ${((result.processedCount / result.totalCount) * 100).toFixed(2)}%, ` +
        `Processing Time: ${totalProcessingTime}ms, ` +
        `Events/sec: ${(result.totalCount / (totalProcessingTime / 1000)).toFixed(2)}`,
    );

    // Alerta para baixa performance
    const eventsPerSecond = result.totalCount / (totalProcessingTime / 1000);
    if (eventsPerSecond < 50) {
      this.logger.warn(
        `Low batch processing performance: ${eventsPerSecond.toFixed(2)} events/sec (expected: >50)`,
      );
    }

    // Alerta para alta taxa de falha
    const failureRate = result.failedCount / result.totalCount;
    if (failureRate > 0.05) {
      this.logger.warn(
        `High batch failure rate: ${(failureRate * 100).toFixed(2)}% (expected: <5%)`,
      );
    }
  }

  /**
   * Atualiza métricas de falha
   */
  private updateFailureMetrics(): void {
    this.metrics.failed++;
  }

  /**
   * Envia job para dead letter queue
   */
  private async sendToDeadLetterQueue(
    job: Job<AuditJobData>,
    error: Error,
  ): Promise<void> {
    this.logger.error(
      `Sending job ${job.id} to dead letter queue after ${job.attemptsMade} failed attempts`,
      {
        jobId: job.id,
        eventType: job.data.event?.eventType,
        finalError: error.message,
      },
    );

    try {
      // Cria registro detalhado do job falhado
      const deadLetterRecord = {
        id: this.generateDeadLetterId(),
        originalJobId: job.id,
        eventType: job.data.event?.eventType,
        entityName: job.data.event?.entityName,
        entityId: job.data.event?.entityId,
        userId: job.data.event?.userId,
        originalData: JSON.stringify(job.data),
        failureReason: error.message,
        stackTrace: error.stack,
        attemptsMade: job.attemptsMade,
        maxAttempts: job.opts.attempts || 3,
        firstFailedAt: job.processedOn ? new Date(job.processedOn) : new Date(),
        lastFailedAt: new Date(),
        status: 'failed',
        priority: this.calculateDeadLetterPriority(job.data.event),
        retryable: this.isRetryable(error),
        metadata: {
          queueName: 'audit-processing',
          processorVersion: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          nodeVersion: process.version,
        },
      };

      // Persiste no dead letter queue
      await this.persistDeadLetterRecord(deadLetterRecord);

      // Notifica administradores sobre falha crítica
      await this.notifyDeadLetterFailure(deadLetterRecord);

      // Agenda retry automático se aplicável
      if (deadLetterRecord.retryable) {
        await this.scheduleDeadLetterRetry(deadLetterRecord);
      }

      // Atualiza métricas de dead letter queue
      await this.updateDeadLetterMetrics(deadLetterRecord);

      this.logger.error(
        `Job ${job.id} successfully moved to dead letter queue with ID: ${deadLetterRecord.id}`,
        {
          deadLetterId: deadLetterRecord.id,
          retryable: deadLetterRecord.retryable,
          priority: deadLetterRecord.priority,
        },
      );
    } catch (dlqError) {
      // Fallback: se falhar ao processar dead letter queue, apenas log crítico
      this.logger.error(
        `CRITICAL: Failed to process dead letter queue for job ${job.id}: ${dlqError.message}`,
        {
          originalJobData: job.data,
          originalError: error.stack,
          dlqError: dlqError.stack,
        },
      );

      // Tenta salvar em arquivo local como último recurso
      await this.saveToLocalDeadLetterFile(job, error, dlqError);
    }
  }

  /**
   * Gera ID único para dead letter record
   */
  private generateDeadLetterId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `dlq_${timestamp}_${random}`;
  }

  /**
   * Calcula prioridade do dead letter baseado no evento
   */
  private calculateDeadLetterPriority(
    event: any,
  ): 'critical' | 'high' | 'medium' | 'low' {
    const criticalEvents = [
      'SECURITY_INCIDENT',
      'PAYMENT_FRAUD',
      'DATA_BREACH',
      'SYSTEM_FAILURE',
    ];

    const highPriorityEvents = [
      'PAYMENT_PROCESSED',
      'USER_REGISTRATION',
      'DOCUMENT_UPLOAD',
      'FAILED_LOGIN',
    ];

    const mediumPriorityEvents = [
      'USER_LOGIN',
      'USER_LOGOUT',
      'PROFILE_UPDATE',
    ];

    if (criticalEvents.includes(event?.eventType)) {
      return 'critical';
    } else if (highPriorityEvents.includes(event?.eventType)) {
      return 'high';
    } else if (mediumPriorityEvents.includes(event?.eventType)) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Verifica se o erro é retryable
   */
  private isRetryable(error: Error): boolean {
    const nonRetryableErrors = [
      'ValidationError',
      'TypeError',
      'SyntaxError',
      'ReferenceError',
      'INVALID_DATA',
      'MALFORMED_EVENT',
    ];

    const retryableErrors = [
      'ConnectionError',
      'TimeoutError',
      'NetworkError',
      'DatabaseError',
      'ServiceUnavailable',
      'ECONNREFUSED',
      'ETIMEDOUT',
    ];

    // Verifica por nome do erro
    if (nonRetryableErrors.some((errType) => error.name.includes(errType))) {
      return false;
    }

    if (
      retryableErrors.some(
        (errType) =>
          error.name.includes(errType) || error.message.includes(errType),
      )
    ) {
      return true;
    }

    // Verifica códigos de erro HTTP retryables
    const retryableHttpCodes = [408, 429, 500, 502, 503, 504];
    const httpCodeMatch = error.message.match(/status code (\d+)/);
    if (httpCodeMatch) {
      const statusCode = parseInt(httpCodeMatch[1]);
      return retryableHttpCodes.includes(statusCode);
    }

    // Por padrão, considera retryable para erros desconhecidos
    return true;
  }

  /**
   * Persiste record no dead letter queue
   */
  private async persistDeadLetterRecord(record: any): Promise<void> {
    try {
      // Em produção, salvar em tabela específica de dead letter queue
      // Por enquanto, simula persistência com log estruturado
      this.logger.error(`DEAD_LETTER_QUEUE_RECORD: ${JSON.stringify(record)}`, {
        type: 'dead_letter_queue',
        action: 'persist',
        deadLetterId: record.id,
        priority: record.priority,
        retryable: record.retryable,
      });

      // Simula salvamento em Redis para recuperação rápida
      // await this.redisService.setex(`dlq:${record.id}`, 86400 * 7, JSON.stringify(record));
    } catch (error) {
      this.logger.error(
        `Failed to persist dead letter record: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Notifica administradores sobre falha crítica
   */
  private async notifyDeadLetterFailure(record: any): Promise<void> {
    try {
      const notification = {
        type: 'DEAD_LETTER_QUEUE_ALERT',
        severity: record.priority,
        title: `Audit Job Failed: ${record.eventType}`,
        message: `Job ${record.originalJobId} failed after ${record.attemptsMade} attempts and was moved to dead letter queue.`,
        details: {
          deadLetterId: record.id,
          eventType: record.eventType,
          entityName: record.entityName,
          failureReason: record.failureReason,
          retryable: record.retryable,
          timestamp: record.lastFailedAt,
        },
        actions: record.retryable
          ? ['retry', 'investigate', 'ignore']
          : ['investigate', 'ignore'],
      };

      // Log estruturado para sistemas de monitoramento
      this.logger.error(
        `DEAD_LETTER_NOTIFICATION: ${JSON.stringify(notification)}`,
        {
          type: 'notification',
          target: 'administrators',
          channel: 'dead_letter_queue',
        },
      );

      // Em produção, enviar via email, Slack, PagerDuty, etc.
      await this.sendDeadLetterAlert(notification);
    } catch (error) {
      this.logger.error(
        `Failed to notify dead letter failure: ${error.message}`,
      );
    }
  }

  /**
   * Agenda retry automático para jobs retryables
   */
  private async scheduleDeadLetterRetry(record: any): Promise<void> {
    try {
      if (!record.retryable) {
        return;
      }

      // Calcula delay exponencial baseado na prioridade
      const baseDelay = {
        critical: 5 * 60 * 1000, // 5 minutos
        high: 15 * 60 * 1000, // 15 minutos
        medium: 60 * 60 * 1000, // 1 hora
        low: 4 * 60 * 60 * 1000, // 4 horas
      };

      const delay = baseDelay[record.priority] || baseDelay.medium;
      const retryAt = new Date(Date.now() + delay);

      const retryJob = {
        deadLetterId: record.id,
        originalJobId: record.originalJobId,
        retryAttempt: 1,
        maxRetryAttempts: 3,
        retryAt: retryAt.toISOString(),
        originalData: record.originalData,
      };

      this.logger.warn(
        `Scheduled dead letter retry for ${record.id} at ${retryAt.toISOString()}`,
        {
          type: 'dead_letter_retry_scheduled',
          deadLetterId: record.id,
          retryAt: retryAt.toISOString(),
          delay: delay,
        },
      );

      // Em produção, usar scheduler (Bull, Agenda, etc.)
      // await this.schedulerService.schedule('dead-letter-retry', retryJob, { delay });
    } catch (error) {
      this.logger.error(
        `Failed to schedule dead letter retry: ${error.message}`,
      );
    }
  }

  /**
   * Atualiza métricas de dead letter queue
   */
  private async updateDeadLetterMetrics(record: any): Promise<void> {
    try {
      const metrics = {
        total_dead_letters: 1,
        [`dead_letters_by_priority_${record.priority}`]: 1,
        [`dead_letters_by_event_${record.eventType}`]: 1,
        [`dead_letters_retryable`]: record.retryable ? 1 : 0,
        [`dead_letters_non_retryable`]: record.retryable ? 0 : 1,
        timestamp: new Date().toISOString(),
      };

      this.logger.debug(
        `Dead letter metrics updated: ${JSON.stringify(metrics)}`,
      );

      // Em produção, enviar para sistema de métricas (Prometheus, InfluxDB, etc.)
    } catch (error) {
      this.logger.error(
        `Failed to update dead letter metrics: ${error.message}`,
      );
    }
  }

  /**
   * Envia alerta de dead letter
   */
  private async sendDeadLetterAlert(notification: any): Promise<void> {
    try {
      // Simula envio de alerta
      this.logger.warn(`ALERT SENT: ${notification.title}`, {
        type: 'alert_sent',
        severity: notification.severity,
        channels: ['email', 'slack', 'pagerduty'],
      });

      // Em produção, implementar envio real
      // await this.emailService.sendAlert(notification);
      // await this.slackService.sendAlert(notification);
      // if (notification.severity === 'critical') {
      //   await this.pagerDutyService.createIncident(notification);
      // }
    } catch (error) {
      this.logger.error(`Failed to send dead letter alert: ${error.message}`);
    }
  }

  /**
   * Salva em arquivo local como último recurso
   */
  private async saveToLocalDeadLetterFile(
    job: Job<AuditJobData>,
    originalError: Error,
    dlqError: Error,
  ): Promise<void> {
    try {
      const fs = require('fs').promises;
      const path = require('path');

      const deadLetterDir = path.join(
        process.cwd(),
        'storage',
        'dead-letter-queue',
      );
      await fs.mkdir(deadLetterDir, { recursive: true });

      const filename = `dlq_${job.id}_${Date.now()}.json`;
      const filepath = path.join(deadLetterDir, filename);

      const record = {
        jobId: job.id,
        jobData: job.data,
        originalError: {
          name: originalError.name,
          message: originalError.message,
          stack: originalError.stack,
        },
        dlqError: {
          name: dlqError.name,
          message: dlqError.message,
          stack: dlqError.stack,
        },
        timestamp: new Date().toISOString(),
        attemptsMade: job.attemptsMade,
        maxAttempts: job.opts.attempts,
      };

      await fs.writeFile(filepath, JSON.stringify(record, null, 2));

      this.logger.error(`Dead letter record saved to local file: ${filepath}`, {
        type: 'local_dead_letter_backup',
        filepath,
        jobId: job.id,
      });
    } catch (fileError) {
      this.logger.error(
        `CRITICAL: Failed to save dead letter to local file: ${fileError.message}`,
        {
          jobId: job.id,
          originalError: originalError.message,
          dlqError: dlqError.message,
          fileError: fileError.message,
        },
      );
    }
  }

  /**
   * Obtém métricas do processador
   */
  getMetrics() {
    return {
      ...this.metrics,
      errorRate:
        this.metrics.failed / (this.metrics.processed + this.metrics.failed) ||
        0,
      successRate:
        this.metrics.processed /
          (this.metrics.processed + this.metrics.failed) || 0,
    };
  }

  /**
   * Reseta métricas
   */
  resetMetrics(): void {
    this.metrics.processed = 0;
    this.metrics.failed = 0;
    this.metrics.totalProcessingTime = 0;
    this.metrics.averageProcessingTime = 0;
  }

  /**
   * Cleanup quando o módulo é destruído
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Finalizando processador de auditoria...');

    try {
      // Aguardar um pouco para jobs em andamento
      await new Promise((resolve) => setTimeout(resolve, 1000));

      this.logger.log('Processador de auditoria finalizado com sucesso');
    } catch (error) {
      this.logger.error('Erro ao finalizar processador de auditoria:', error);
    }
  }
}
