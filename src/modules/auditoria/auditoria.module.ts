/**
 * AuditoriaModule
 *
 * Módulo principal de auditoria consolidado.
 * Integra todos os componentes necessários para o sistema de auditoria:
 * - Core services e repositories
 * - Event emitters e listeners
 * - Queue processors e jobs
 * - Controllers e middleware
 */

import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Entities
import { LogAuditoria } from '../../entities/log-auditoria.entity';

// Guards Module (separado para evitar dependência circular)
import { AuthGuardsModule } from '../../shared/guards/auth-guards.module';
import { ScheduleAdapterModule } from '../../shared/schedule/schedule-adapter.module';

// Core Components
import { AuditCoreRepository } from './core/repositories/audit-core.repository';
import { AuditCoreService } from './core/services/audit-core.service';

// Event Components
import { AuditEventEmitter } from './events/emitters/audit-event.emitter';
import { AuditEventListener } from './listeners/audit-event.listener';

// Queue Components
import { AuditProcessor } from './queues/processors/audit.processor';
import { AuditProcessingJob } from './queues/jobs/audit-processing.job';

// Legacy Services (mantidos para compatibilidade)
import { AuditoriaService } from './services/auditoria.service';
import { AuditoriaSignatureService } from './services/auditoria-signature.service';
import { AuditoriaQueueService } from './services/auditoria-queue.service';
import { AuditoriaExportacaoService } from './services/auditoria-exportacao.service';
import { AuditoriaMonitoramentoService } from './services/auditoria-monitoramento.service';

// Controllers
import { AuditoriaController } from './controllers/auditoria.controller';

// Middleware
import { AuditoriaMiddleware } from './middlewares/auditoria.middleware';

// Legacy Repository
import { LogAuditoriaRepository } from './repositories/log-auditoria.repository';

// Common Services
import { SystemContextService } from '../../common/services/system-context.service';

@Module({
  imports: [
    // TypeORM para entidades
    TypeOrmModule.forFeature([LogAuditoria]),

    // EventEmitter para eventos síncronos
    EventEmitterModule,

    // BullMQ para processamento assíncrono
    BullModule.registerQueueAsync({
      name: 'auditoria',
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const { getBullConfig } = await import('../../config/bull.config');
        const bullConfig = await getBullConfig(configService);
        return {
          redis: bullConfig.redis,
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 50,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          },
        };
      },
      inject: [ConfigService],
    }),

    // JWT para assinatura digital
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),

    // Guards Module (sem dependência circular)
    AuthGuardsModule,
    ScheduleAdapterModule,
  ],
  controllers: [AuditoriaController],
  providers: [
    // Core Components
    AuditCoreRepository,
    AuditCoreService,

    // Event Components
    AuditEventEmitter,
    AuditEventListener,

    // Queue Components
    AuditProcessor,
    AuditProcessingJob,

    // Legacy Services (mantidos para compatibilidade)
    AuditoriaService,
    AuditoriaSignatureService,
    AuditoriaQueueService,
    AuditoriaExportacaoService,
    AuditoriaMonitoramentoService,

    // Middleware
    AuditoriaMiddleware,

    // Legacy Repository
    LogAuditoriaRepository,

    // Common Services
    SystemContextService,
  ],
  exports: [
    // Core Components
    AuditCoreRepository,
    AuditCoreService,

    // Event Components
    AuditEventEmitter,
    AuditEventListener,

    // Queue Components
    AuditProcessor,
    AuditProcessingJob,

    // Legacy Services (para compatibilidade)
    AuditoriaService,
    AuditoriaSignatureService,
    AuditoriaQueueService,
    AuditoriaExportacaoService,
    AuditoriaMonitoramentoService,

    // Middleware
    AuditoriaMiddleware,

    // Legacy Repository
    LogAuditoriaRepository,
  ],
})
export class AuditoriaModule implements OnModuleInit {
  constructor() {
    console.log('🚨 AUDITORIA MODULE INICIALIZADO');
    console.log('🚨 AuditProcessor deve estar registrado agora');
    console.log('✅ AuditoriaModule inicializado - arquitetura consolidada');
  }

  onModuleInit() {
    console.log('🚨 AUDITORIA MODULE INIT COMPLETO');
    console.log('🚨 Todos os providers foram inicializados');
    console.log('🚨 BullModule configurado para fila "auditoria"');
    console.log('🚨 AuditProcessor pronto para consumir jobs');
  }
}
