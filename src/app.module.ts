import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { createThrottlerConfig } from './config/throttler.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MonitoringModule } from './shared/monitoring/monitoring.module';
import { AuthModule } from './auth/auth.module';
import { PermissionSharedModule } from './shared/permission/permission-shared.module';
import { AuditoriaSharedModule } from './shared/auditoria/auditoria-shared.module';
import { UsuarioModule } from './modules/usuario/usuario.module';
import { UnidadeModule } from './modules/unidade/unidade.module';
import { CidadaoModule } from './modules/cidadao/cidadao.module';
import { BeneficioModule } from './modules/beneficio/beneficio.module';
import { DocumentoModule } from './modules/documento/documento.module';
import { MetricasModule } from './modules/metricas/metricas.module';
import { AuditModule } from './audit/audit.module';
import { RecursoModule } from './modules/recurso/recurso.module';
import { LogsModule } from './modules/logs/logs.module';
import { PagamentoModule } from './modules/pagamento/pagamento.module';
import { APP_GUARD } from '@nestjs/core';
import { CatalogAwareExceptionFilter } from './shared/exceptions/error-catalog';
import { LoggingModule } from './shared/logging/logging.module';
import { ResilienceModule } from './shared/modules/resilience.module';
import { EmailModule } from './shared/modules/email.module';
import { ConfiguracaoModule } from './modules/configuracao/configuracao.module';
import { NotificacaoModule } from './modules/notificacao/notificacao.module';
import { EasyUploadModule } from './modules/easy-upload/easy-upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
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
    // Configuração do TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: parseInt(configService.get('DB_PORT', '5432')),
        username: configService.get('DB_USER', 'postgres'),
        password: configService.get('DB_PASS', 'postgres'),
        database: configService.get('DB_NAME', 'pgben'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
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
    }),
    // Módulo de documentos (necessário para StorageHealthService)
    DocumentoModule,
    
    // Módulo de monitoramento
    MonitoringModule,

    // Módulos compartilhados
    EmailModule, 
    PermissionSharedModule,
    AuditoriaSharedModule,
    LoggingModule,
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

    // Módulo de docuentos
    DocumentoModule,

    // Módulo de pagamentos
    PagamentoModule,

    // Módulo de auditoria e logging
    AuditModule,

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
    // Aplicar rate limiting globalmente
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {
  constructor() {
    console.log('✅ AppModule inicializado - com autenticação');
  }
} //
