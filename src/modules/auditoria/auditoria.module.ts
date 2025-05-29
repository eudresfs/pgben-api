import {
  Global,
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
  Logger,
  forwardRef
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleAdapterModule } from '../../shared/schedule/schedule-adapter.module';
import { AuthModule } from '../../auth/auth.module';


// Entidades
import { LogAuditoria } from './entities/log-auditoria.entity';

// Serviços Core
import { AuditoriaService } from './services/auditoria.service';
import { AuditoriaQueueService } from './services/auditoria-queue.service';
import { AuditoriaQueueProcessor } from './services/auditoria-queue.processor';

// Serviços Especializados
import { AuditoriaSignatureService } from './services/auditoria-signature.service';
import { AuditoriaExportacaoService } from './services/auditoria-exportacao.service';
import { AuditoriaMonitoramentoService } from './services/auditoria-monitoramento.service';

// Controladores
import { AuditoriaController } from './controllers/auditoria.controller';
import { AuditoriaExportacaoController } from './controllers/auditoria-exportacao.controller';
import { AuditoriaMonitoramentoController } from './controllers/auditoria-monitoramento.controller';

// Middleware
import { AuditoriaMiddleware } from './middlewares/auditoria.middleware';

// Repositórios
import { LogAuditoriaRepository } from './repositories/log-auditoria.repository';

/**
 * Módulo de Auditoria Unificado
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
 * - Processamento assíncrono via filas
 *
 * Este módulo é global e deve ser importado apenas pelo módulo principal (AppModule).
 * Os serviços são exportados para serem usados em qualquer outro módulo sem necessidade de reimportação.
 */
@Global()
@Module({
  imports: [
    // Configuração do TypeORM para entidades do módulo
    TypeOrmModule.forFeature([LogAuditoria]),
    
    // Configuração assíncrona do BullModule
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
    
    // Módulo de agendamento de tarefas
    ScheduleAdapterModule,
    
    // Módulo de autenticação (para JwtAuthGuard e JwtBlacklistService)
    forwardRef(() => AuthModule),
    
    // Configuração assíncrona do JwtModule
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    AuditoriaController,
    AuditoriaExportacaoController,
    AuditoriaMonitoramentoController,
  ],
  providers: [
    // Serviços Core
    AuditoriaService,
    AuditoriaQueueService,
    AuditoriaQueueProcessor,
    
    // Repositórios
    LogAuditoriaRepository,
    
    // Serviços Especializados
    AuditoriaSignatureService,
    AuditoriaExportacaoService,
    AuditoriaMonitoramentoService,
  ],
  exports: [
    // Exporta os serviços principais para uso em outros módulos
    AuditoriaService,
    AuditoriaQueueService,
    LogAuditoriaRepository,
    AuditoriaSignatureService,
  ],
})
export class AuditoriaModule implements NestModule {
  private readonly logger = new Logger(AuditoriaModule.name);
  /**
   * Configura o middleware de auditoria para todas as rotas da API
   * Restaurado com tratamento de erros
   */
  configure(consumer: MiddlewareConsumer) {
    try {
      consumer
        .apply(AuditoriaMiddleware)
        .exclude(
          { path: 'health', method: RequestMethod.ALL },
          { path: 'metrics', method: RequestMethod.ALL },
          { path: 'api-docs', method: RequestMethod.ALL },
          { path: 'auditoria/monitoramento', method: RequestMethod.ALL }, // Evitar recursão
        )
        .forRoutes({ path: '*', method: RequestMethod.ALL });
        
      this.logger.log('Middleware de auditoria configurado com sucesso');
    } catch (error) {
      this.logger.error(`Erro ao configurar middleware de auditoria: ${error.message}`);
      // Não propagar erro para não bloquear a inicialização da aplicação
    }
  }
}