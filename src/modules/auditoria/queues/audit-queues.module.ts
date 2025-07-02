/**
 * AuditQueuesModule
 *
 * Módulo responsável pela infraestrutura de filas de auditoria.
 * Gerencia BullMQ, processadores e jobs de auditoria.
 */

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AuditProcessor } from './processors/audit.processor';
import { AuditProcessingJob } from './jobs/audit-processing.job';
import { AuditCoreModule } from '../core/audit-core.module';

@Module({
  imports: [
    // Fila para processamento em lote
    BullModule.registerQueue({
      name: 'audit-batch-processing',
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 25,
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    }),

    // Fila para eventos críticos (alta prioridade)
    BullModule.registerQueue({
      name: 'audit-critical',
      defaultJobOptions: {
        removeOnComplete: 200,
        removeOnFail: 100,
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        priority: 10,
      },
    }),

    // Fila para dados sensíveis (LGPD)
    BullModule.registerQueue({
      name: 'audit-sensitive',
      defaultJobOptions: {
        removeOnComplete: 500,
        removeOnFail: 200,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
        priority: 8,
      },
    }),

    // Módulo core para persistência
    AuditCoreModule,
  ],
  providers: [AuditProcessor, AuditProcessingJob],
  exports: [AuditProcessor, AuditProcessingJob, BullModule],
})
export class AuditQueuesModule {}
