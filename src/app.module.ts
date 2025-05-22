import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleAdapterModule } from './shared/schedule/schedule-adapter.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SharedModule } from './shared/shared.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UsuarioModule } from './modules/usuario/usuario.module';
import { UnidadeModule } from './modules/unidade/unidade.module';
import { CidadaoModule } from './modules/cidadao/cidadao.module';
import { BeneficioModule } from './modules/beneficio/beneficio.module';
import { SolicitacaoModule } from './modules/solicitacao/solicitacao.module';
import { DocumentoModule } from './modules/documento/documento.module';
import { RelatoriosUnificadoModule } from './modules/relatorios-unificado/relatorios-unificado.module';
import { NotificacaoModule } from './modules/notificacao/notificacao.module';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
import { MetricasModule } from './modules/metricas/metricas.module';
import { BullModule } from '@nestjs/bull';
import { getBullConfig } from './config/bull.config';

@Module({
  imports: [
    // Configuração do ambiente
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // Rate limiting - configuração atualizada para compatibilidade com versões recentes
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('THROTTLE_TTL', 60),
            limit: config.get<number>('THROTTLE_LIMIT', 10),
          },
        ],
      }),
    }),
    
    // Configuração do agendador de tarefas personalizado
    ScheduleAdapterModule,

    // Cache para relatórios
    CacheModule.register({
      isGlobal: true,
      ttl: 3600, // tempo de vida do cache: 1 hora
      max: 100, // máximo de 100 itens no cache
    }),

    // Configuração do TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get('DB_USER', 'postgres'),
        password: configService.get('DB_PASS', 'postgres'),
        database: configService.get('DB_NAME', 'pgben'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        logging: configService.get('NODE_ENV') === 'development',
        // Melhorias de segurança e performance para TypeORM
        ssl: configService.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
        poolSize: configService.get<number>('DB_POOL_SIZE', 10),
        connectionTimeoutMillis: 5000,
      }),
    }),

    // Configuração centralizada do Bull
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getBullConfig,
    }),

    // Módulos compartilhados
    SharedModule,

    // Módulos de segurança e observabilidade
    AuditoriaModule,
    MetricasModule,

    // Módulos da aplicação
    AuthModule,        // ← Movido para cima conforme Teste 1.4
    UsuarioModule,     // ← Movido para baixo conforme Teste 1.4
    UnidadeModule,
    CidadaoModule,
    BeneficioModule,
    SolicitacaoModule,
    DocumentoModule,
    RelatoriosUnificadoModule,
    NotificacaoModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Aplicar rate limiting globalmente
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}