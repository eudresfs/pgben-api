import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LogAuditoria } from '../../entities';
import { AuditoriaService } from './services/auditoria.service';
import { AuditoriaQueueService } from './services/auditoria-queue.service';
import { LogAuditoriaRepository } from './repositories/log-auditoria.repository';

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

    // Configuração assíncrona do BullModule com ConfigService
    BullModule.registerQueueAsync({
      name: 'auditoria',
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuditoriaService, AuditoriaQueueService, LogAuditoriaRepository],
  exports: [AuditoriaService, AuditoriaQueueService, LogAuditoriaRepository],
})
export class AuditoriaCoreModule {}
