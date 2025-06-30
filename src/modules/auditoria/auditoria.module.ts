/**
 * AuditoriaModule
 * 
 * Módulo principal de auditoria refatorado com arquitetura event-driven.
 * Utiliza EventEmitter + BullMQ para processamento assíncrono.
 * 
 * Funcionalidades:
 * - Arquitetura event-driven com EventEmitter
 * - Processamento assíncrono com BullMQ
 * - Core isolado sem dependências circulares
 * - Conformidade com LGPD
 * - Performance otimizada (<50ms)
 */

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

// Entities
import { LogAuditoria } from './entities/log-auditoria.entity';

// Módulos refatorados
import { AuditCoreModule } from './core/audit-core.module';
import { AuditEventsModule } from './events/audit-events.module';
import { AuditQueuesModule } from './queues/audit-queues.module';
import { ScheduleAdapterModule } from '../../shared/schedule/schedule-adapter.module';
import { AuthModule } from '../../auth/auth.module';

// Legacy Services (mantidos para compatibilidade)
import { AuditoriaService } from './services/auditoria.service';
import { AuditEventEmitter } from './events/emitters/audit-event.emitter';
import { AuditoriaSignatureService } from './services/auditoria-signature.service';
import { AuditoriaQueueService } from './services/auditoria-queue.service';
import { AuditoriaExportacaoService } from './services/auditoria-exportacao.service';
import { AuditoriaMonitoramentoService } from './services/auditoria-monitoramento.service';

// Controllers
import { AuditoriaController } from './controllers/auditoria.controller';

// Middleware
import { AuditoriaMiddleware } from './middlewares/auditoria.middleware';

// Repositories
import { LogAuditoriaRepository } from './repositories/log-auditoria.repository';

@Module({
  imports: [
    // Entity registration
    TypeOrmModule.forFeature([LogAuditoria]),
    
    // Módulos refatorados
    AuditCoreModule,
    AuditEventsModule,
    AuditQueuesModule,
    ScheduleAdapterModule,
    forwardRef(() => AuthModule),
    
    // JWT para assinatura digital
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'audit-secret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [
    AuditoriaController,
  ],
  providers: [
    // Legacy Services (mantidos para compatibilidade)
    AuditoriaService,
    AuditEventEmitter,
    AuditoriaSignatureService,
    AuditoriaQueueService,
    AuditoriaExportacaoService,
    AuditoriaMonitoramentoService,
    
    // Middleware
    AuditoriaMiddleware,
    
    // Repositories
    LogAuditoriaRepository,
  ],
  exports: [
    // Módulos refatorados
    AuditCoreModule,
    AuditEventsModule,
    AuditQueuesModule,
    
    // Legacy Services (mantidos para compatibilidade)
    AuditoriaService,
    AuditoriaSignatureService,
    AuditoriaQueueService,
    AuditoriaExportacaoService,
    AuditoriaMonitoramentoService,
    AuditoriaMiddleware,
    LogAuditoriaRepository,
  ],
})
export class AuditoriaModule {
}
