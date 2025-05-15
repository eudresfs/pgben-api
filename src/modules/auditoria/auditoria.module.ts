import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { LogAuditoria } from './entities/log-auditoria.entity';
import { AuditoriaService } from './services/auditoria.service';
import { AuditoriaController } from './controllers/auditoria.controller';
import { AuditoriaMiddleware } from './middlewares/auditoria.middleware';
import { AuditoriaQueueService } from './services/auditoria-queue.service';
import { AuditoriaQueueProcessor } from './services/auditoria-queue.processor';

/**
 * Módulo de Auditoria
 * 
 * Responsável por registrar e gerenciar logs de auditoria do sistema,
 * garantindo a rastreabilidade das operações e compliance com LGPD.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([LogAuditoria]),
    BullModule.registerQueue({
      name: 'auditoria',
    }),
  ],
  controllers: [AuditoriaController],
  providers: [AuditoriaService, AuditoriaQueueService, AuditoriaQueueProcessor],
  exports: [AuditoriaService, AuditoriaQueueService],
})
export class AuditoriaModule implements NestModule {
  /**
   * Configura o middleware de auditoria para todas as rotas da API
   */
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuditoriaMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.ALL },
        { path: 'metrics', method: RequestMethod.ALL },
        { path: 'api-docs', method: RequestMethod.ALL },
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
