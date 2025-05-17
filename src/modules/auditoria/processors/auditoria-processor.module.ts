import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LogAuditoria } from '../entities/log-auditoria.entity';
import { AuditoriaQueueProcessor } from '../services/auditoria-queue.processor';
import { BullQueueModule } from '../../../shared/bull/bull.module';

/**
 * Módulo responsável exclusivamente pelo registro do processador de auditoria.
 * Este módulo deve ser importado APENAS UMA VEZ em toda a aplicação, no AppModule.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([LogAuditoria]),
    BullQueueModule.registerQueue('auditoria'),
  ],
  providers: [AuditoriaQueueProcessor],
})
export class AuditoriaProcessorModule {}
