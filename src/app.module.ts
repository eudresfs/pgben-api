import { Module, Logger, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { SharedBullModule } from './shared/bull/bull.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { createThrottlerConfig } from './config/throttler.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MonitoringModule } from './shared/monitoring/monitoring.module';
import { AuthModule } from './auth/auth.module';
import { PermissionSharedModule } from './shared/permission/permission-shared.module';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
import { UsuarioModule } from './modules/usuario/usuario.module';
import { UnidadeModule } from './modules/unidade/unidade.module';
import { CidadaoModule } from './modules/cidadao/cidadao.module';
import { BeneficioModule } from './modules/beneficio/beneficio.module';
import { DocumentoModule } from './modules/documento/documento.module';
import { MetricasModule } from './modules/metricas/metricas.module';
import { RecursoModule } from './modules/recurso/recurso.module';
import { LogsModule } from './modules/logs/logs.module';
import { PagamentoModule } from './modules/pagamento/pagamento.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { CatalogAwareExceptionFilter } from './shared/exceptions/error-catalog';
import { LoggingModule } from './shared/logging/logging.module';
import { ResilienceModule } from './shared/modules/resilience.module';
import { EmailModule } from './shared/modules/email.module';
import { ConfiguracaoModule } from './modules/configuracao/configuracao.module';
import { NotificacaoModule } from './modules/notificacao/notificacao.module';
import { EasyUploadModule } from './modules/easy-upload/easy-upload.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { addTransactionalDataSource } from 'typeorm-transactional';
import { DataSource } from 'typeorm';
import { ScopeContextInterceptor } from './common/interceptors/scope-context.interceptor';
import { RequestContextHolder } from './common/services/request-context-holder.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // EventEmitter global para eventos de auditoria
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 50,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    // Cache para relatórios e autenticação
    CacheModule.register({
      isGlobal: true,
      ttl: 3600, // tempo de vida do cache: 1 hora
      max: 100, // máximo de 100 itens no cache
    }),
    // Rate limiting - configuração robusta com múltiplos throttlers
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: createThrottlerConfig,
    }),
    // Configuração do agendamento de tarefas
    ScheduleModule.forRoot(),
    // Bull Queue Module para processamento assíncrono
    // Configurado com tratamento de erro para evitar crash da aplicação
    SharedBullModule,
    // Configuração do TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.get('DB_HOST', 'localhost'),
        port: parseInt(configService.get('DB_PORT', '5432')),
        username: configService.get('DB_USER', 'postgres'),
        password: configService.get('DB_PASS', 'postgres'),
        database: configService.get('DB_NAME', 'pgben') as string,
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        autoLoadEntities: true,
        synchronize: false,
        logging: configService.get('NODE_ENV') === 'development',
        maxQueryExecutionTime: 10000,
        extra: {
          max: parseInt(configService.get('DB_POOL_MAX', '20')),
          min: parseInt(configService.get('DB_POOL_MIN', '5')),
          idleTimeoutMillis: parseInt(
            configService.get('DB_POOL_IDLE', '30000'),
          ),
          connectionTimeoutMillis: parseInt(
            configService.get('DB_POOL_CONN_TIMEOUT', '5000'),
          ),
          allowExitOnIdle: false,
        },
      }),
      async dataSourceFactory(options) {
        if (!options) {
          throw new Error('Invalid options passed');
        }
        
        const dataSource = new DataSource(options);
        
        // Verificar se o DataSource já foi adicionado para evitar erro de duplicação
        try {
          return addTransactionalDataSource(dataSource);
        } catch (error) {
          // Se o DataSource já existe, apenas retornar o DataSource criado
          if (error.message?.includes('has already added')) {
            const logger = new Logger('TypeOrmModule');
            logger.warn('DataSource já existe, reutilizando conexão existente');
            return dataSource;
          }
          throw error;
        }
      },
    }),
    // Módulo de documentos (necessário para StorageHealthService)
    DocumentoModule,

    // Módulo de monitoramento
    MonitoringModule,

    // Módulos compartilhados
    EmailModule,
    PermissionSharedModule,
    LoggingModule,

    // Módulo de auditoria consolidado
    AuditoriaModule,
    // ResilienceModule, // Temporariamente desabilitado - depende do Redis

    // Módulo de autenticação
    AuthModule,

    // Módulo de usuários
    UsuarioModule,

    // Módulo de unidades
    UnidadeModule,

    // Módulo de cidadãos
    CidadaoModule,

    // Módulo de benefícios
    BeneficioModule,

    // Módulo de pagamentos
    PagamentoModule,

    // Módulo de métricas
    MetricasModule,

    // Módulo de recursos de primeira instância
    RecursoModule,

    // Módulo de logs de auditoria
    LogsModule,

    // Módulo de configuração
    ConfiguracaoModule,

    // Módulo de notificações
    NotificacaoModule,

    // Módulo de upload facilitado
    // EasyUploadModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    CatalogAwareExceptionFilter,
    RequestContextHolder,
    // Aplicar rate limiting globalmente
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Aplicar interceptor de escopo globalmente
    {
      provide: APP_INTERCEPTOR,
      useClass: ScopeContextInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  constructor() {
    console.log('✅ AppModule inicializado - com autenticação e ScopedRepository');
  }

  /**
   * Configura middlewares globais
   * 
   * @description
   * Middlewares removidos em favor do ScopeContextInterceptor
   * que executa após o processamento do JWT pelo AuthGuard.
   */
  configure(consumer: MiddlewareConsumer) {
    // Middlewares removidos - usando interceptor para contexto de escopo
  }
}
