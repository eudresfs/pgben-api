import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { RelatorioModule } from './modules/relatorio/relatorio.module';
import { NotificacaoModule } from './modules/notificacao/notificacao.module';
// Módulos que serão implementados futuramente
// import { AuditoriaModule } from './modules/auditoria/auditoria.module';
// import { OcorrenciaModule } from './modules/ocorrencia/ocorrencia.module';

@Module({
  imports: [
    // Configuração do ambiente
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // Configuração do TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_DATABASE', 'pgben'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('NODE_ENV') === 'development',
      }),
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
    RelatorioModule,
    NotificacaoModule,
    // AuditoriaModule,
    // OcorrenciaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
