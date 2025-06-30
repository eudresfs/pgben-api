/**
 * AuditEventsModule
 * 
 * Módulo responsável pela infraestrutura de eventos de auditoria.
 * Gerencia EventEmitter, BullMQ e processamento de eventos.
 */

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuditEventEmitter } from './emitters/audit-event.emitter';
import { AuditProcessor } from '../queues/processors/audit.processor';
import { AuditProcessingJob } from '../queues/jobs/audit-processing.job';
import { AuditCoreModule } from '../core/audit-core.module';

@Module({
  imports: [
    // BullMQ para processamento assíncrono
    BullModule.registerQueue({
      name: 'auditoria',
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
    
    // Módulo core para persistência
    AuditCoreModule,
  ],
  providers: [
    AuditEventEmitter,
    AuditProcessor,
    AuditProcessingJob,
  ],
  exports: [
    AuditEventEmitter,
    AuditProcessor,
    AuditProcessingJob,
  ],
})
export class AuditEventsModule {}