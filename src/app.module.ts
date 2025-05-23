import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
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
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
import { MetricasModule } from './modules/metricas/metricas.module'; 
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

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
      }),
    }),
    // Módulo de monitoramento
    MonitoringModule,
    
    // Módulos compartilhados
    PermissionSharedModule,
    AuditoriaSharedModule,

    // Módulo de autenticação
    AuthModule,

    // Módulo de usuários
    UsuarioModule,

    // Módulo de unidades
    UnidadeModule,

    // Módulo de cidadãos
    CidadaoModule, // Reativado com a solução de dependência circular

    // Módulo de benefícios
    BeneficioModule,

    // Módulo de docuentos
    DocumentoModule,

    // Módulo de métricas
    MetricasModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Aplicar rate limiting globalmente
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Aplicar autenticação JWT globalmente
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {
  constructor() {
    console.log('✅ AppModule inicializado - com autenticação');
  }
}// 