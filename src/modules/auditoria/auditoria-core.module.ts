import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LogAuditoria } from '../../entities';
import { AuditoriaService } from './services/auditoria.service';
// AuditEventEmitter removido - será fornecido pelo AuditoriaModule principal
import { AuditoriaQueueService } from './services/auditoria-queue.service';
import { LogAuditoriaRepository } from './repositories/log-auditoria.repository';
import { AuditMetricsService } from './services/audit-metrics.service';

/**
 * Módulo Core de Auditoria
 *
 * Este módulo contém apenas os serviços essenciais de auditoria,
 * sem dependências circulares. É um módulo global que deve ser
 * importado apenas pelo módulo principal (AppModule).
 *
 * Separa a lógica central de auditoria das funcionalidades que
 * dependem de autenticação para resolver dependências circulares.
 */
@Global()
@Module({
  imports: [
    // Configuração do TypeORM para entidades do módulo
    TypeOrmModule.forFeature([LogAuditoria]),

    // Configuração do BullModule para a fila de auditoria
    BullModule.registerQueueAsync({
      name: 'auditoria',
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
        },
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 5,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    AuditoriaService,
    AuditoriaQueueService,
    LogAuditoriaRepository,
    AuditMetricsService,
  ],
  exports: [
    AuditoriaService,
    AuditoriaQueueService,
    LogAuditoriaRepository,
    AuditMetricsService,
  ],
})
export class AuditoriaCoreModule {}
