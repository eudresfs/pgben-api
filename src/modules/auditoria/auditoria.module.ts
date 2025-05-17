import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
  Global,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleAdapterModule } from '../../shared/schedule/schedule-adapter.module';

// Entidades
import { LogAuditoria } from './entities/log-auditoria.entity';

// Serviços
import { AuditoriaService } from './services/auditoria.service';
import { AuditoriaQueueService } from './services/auditoria-queue.service';
import { AuditoriaQueueProcessor } from './services/auditoria-queue.processor';
import { AuditoriaSignatureService } from './services/auditoria-signature.service';
import { AuditoriaExportacaoService } from './services/auditoria-exportacao.service';
import { AuditoriaMonitoramentoService } from './services/auditoria-monitoramento.service';

// Controladores
import { AuditoriaController } from './controllers/auditoria.controller';
import { AuditoriaExportacaoController } from './controllers/auditoria-exportacao.controller';
import { AuditoriaMonitoramentoController } from './controllers/auditoria-monitoramento.controller';

// Middleware e Interceptores
import { AuditoriaMiddleware } from './middlewares/auditoria.middleware';

// Repositórios
import { LogAuditoriaRepository } from './repositories/log-auditoria.repository';

/**
 * Módulo de Auditoria
 *
 * Responsável por registrar e gerenciar logs de auditoria do sistema,
 * garantindo a rastreabilidade das operações e compliance com LGPD.
 *
 * Funcionalidades:
 * - Registro automático de operações via middleware e interceptores
 * - Proteção contra tampering usando assinaturas JWT
 * - Compressão de dados para otimização de espaço
 * - Particionamento de tabelas para melhor performance
 * - Exportação de logs em diferentes formatos
 * - Monitoramento de performance e integridade
 *
 * Este módulo é global e deve ser importado apenas pelo módulo principal (AppModule).
 * Os serviços são exportados para serem usados em qualquer outro módulo sem necessidade de reimportação.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([LogAuditoria]),
    // Registramos a fila de auditoria
    BullModule.registerQueue({
      name: 'auditoria',
    }),
    ScheduleAdapterModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('AUDIT_SIGNING_KEY') || 
                      configService.get<string>('JWT_SECRET') || 
                      'default-secret-key';
        return {
          secret,
          signOptions: { expiresIn: '100y' },
        };
      },
    }),
  ],
  controllers: [
    AuditoriaController,
    AuditoriaExportacaoController,
    AuditoriaMonitoramentoController,
  ],
  providers: [
    AuditoriaService,
    AuditoriaQueueService,
    AuditoriaQueueProcessor, // Agora usa padrão singleton para evitar duplicação
    AuditoriaSignatureService,
    AuditoriaExportacaoService,
    AuditoriaMonitoramentoService,
    LogAuditoriaRepository,
  ],
  exports: [
    AuditoriaService,
    AuditoriaQueueService,
    AuditoriaSignatureService,
    LogAuditoriaRepository,
  ],
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
        { path: 'auditoria/monitoramento', method: RequestMethod.ALL }, // Evitar recursão
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
