import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleAdapterModule } from './shared/schedule/schedule-adapter.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SharedModule } from './shared/shared.module';
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

    // Módulos da aplicação
    AuthModule,
    UsuarioModule,
    UnidadeModule,
    CidadaoModule,
    BeneficioModule,
    SolicitacaoModule,
    DocumentoModule,
    RelatoriosUnificadoModule,
    NotificacaoModule,

    // Módulos de segurança e observabilidade
    AuditoriaModule, // Módulo global de auditoria
    MetricasModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
