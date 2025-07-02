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
} from '../jobs/audit-processing.job';
import { AuditEvent } from '../../events/types/audit-event.types';

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

  constructor(private readonly auditProcessingJob: AuditProcessingJob) {
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
    const { data } = job;
    const startTime = Date.now();

    // Log detalhado de tentativa de processamento
    console.log('🚨🚨🚨 WORKER TENTANDO PROCESSAR JOB:', {
      jobId: job.id,
      jobName: job.name,
      timestamp: new Date().toISOString(),
      data: job.data,
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
      await job.progress(100);

      return result;
    } catch (error) {
      this.updateFailureMetrics();

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
   * Callback quando job está esperando na fila
   */
  @OnQueueWaiting()
  onWaiting(jobId: string) {
    console.log('🚨 EVENTO QUEUE WAITING - JOB ESPERANDO:', jobId);
    this.logger.log(`Job ${jobId} está esperando na fila`);
  }

  /**
   * Callback quando job se torna ativo
   */
  @OnQueueActive()
  onActive(job: Job<AuditJobData>) {
    console.log('🚨 EVENTO QUEUE ACTIVE - JOB INICIOU:', job.id);
    this.logger.debug(
      `Job ${job.id} is now active. Processing: ${job.data.event?.eventType}`,
    );
  }

  /**
   * Callback para progresso do job
   */
  @OnQueueProgress()
  onProgress(job: Job, progress: number) {
    console.log('🚨 EVENTO QUEUE PROGRESS:', job.id, progress);
    this.logger.debug(`Job ${job.id} progress: ${progress}%`);
  }

  /**
   * Callback quando job é completado com sucesso
   */
  @OnQueueCompleted()
  onCompleted(job: Job<AuditJobData>, result: AuditProcessingResult) {
    console.log('🚨 EVENTO QUEUE COMPLETED:', job.id, result);
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
    console.log('🚨 EVENTO QUEUE FAILED:', job.id, error.message);
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
    console.log('🚨 EVENTO QUEUE STALLED - JOB TRAVADO:', job.id);
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

    // TODO: Implementar dead letter queue real
    // Por enquanto, apenas log crítico
    this.logger.error(
      `DEAD LETTER QUEUE: Job ${job.id} could not be processed`,
      {
        jobData: job.data,
        error: error.stack,
      },
    );
  }

  /**
   * Método de teste direto do worker
   */
  async testDirectProcessing() {
    console.log('🚨 TESTANDO PROCESSAMENTO DIRETO DO WORKER');

    // Gera um UUID válido para o teste
    const testUserId = '550e8400-e29b-41d4-a716-446655440000';

    const mockJob = {
      id: 'test-direct-' + Date.now(),
      name: 'process-audit-event',
      data: {
        event: {
          eventType: 'TEST_DIRECT',
          entityName: 'Test',
          entityId: 'test-123',
          userId: testUserId,
          timestamp: new Date(),
          riskLevel: 'LOW',
        },
      },
      progress: async (p) => console.log(`Progress: ${p}%`),
      opts: { attempts: 3 },
      attemptsMade: 0,
    } as any;

    try {
      const result = await this.processAuditEvent(mockJob);
      console.log('🚨 PROCESSAMENTO DIRETO FUNCIONOU:', result);
      return result;
    } catch (error) {
      console.error('🚨 PROCESSAMENTO DIRETO FALHOU:', error);
      throw error;
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
