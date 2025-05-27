import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CidadaoController } from './controllers/cidadao.controller';
import { CidadaoService } from './services/cidadao.service';
import { CidadaoRepository } from './repositories/cidadao.repository';
import { RegraConflitoPapelRepository } from './repositories/regra-conflito-papel.repository';
import { Cidadao } from './entities/cidadao.entity';
import { PapelCidadao } from './entities/papel-cidadao.entity';
import { ComposicaoFamiliar } from './entities/composicao-familiar.entity';
import { HistoricoConversaoPapel } from './entities/historico-conversao-papel.entity';
import { RegraConflitoPapel } from './entities/regra-conflito-papel.entity';
import { CacheModule } from '../../shared/cache';
import { CidadaoAuditInterceptor } from './interceptors/cidadao-audit.interceptor';
import { PapelCidadaoService } from './services/papel-cidadao.service';
import { PapelCidadaoController } from './controllers/papel-cidadao.controller';
import { VerificacaoPapelService } from './services/verificacao-papel.service';
import { HistoricoConversaoPapelService } from './services/historico-conversao-papel.service';
import { VerificacaoPapelController } from './controllers/verificacao-papel.controller';
import { PapelConflitoController } from './controllers/papel-conflito.controller';
import { RegraConflitoPapelController } from './controllers/regra-conflito-papel.controller';
import { AuthModule } from '@/auth/auth.module';
import { NotificacaoModule } from '../notificacao/notificacao.module';
// Usando o módulo compartilhado para evitar dependência circular

/**
 * Módulo de cidadãos
 *
 * Responsável por gerenciar os cidadãos/beneficiários do sistema,
 * incluindo cadastro, consulta e composição familiar.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cidadao, 
      PapelCidadao, 
      ComposicaoFamiliar, 
      HistoricoConversaoPapel,
      RegraConflitoPapel
    ]),
    CacheModule,
    AuthModule,
    NotificacaoModule,
    // AuditoriaSharedModule é global, não precisa ser importado
  ],
  controllers: [
    CidadaoController, 
    PapelCidadaoController, 
    VerificacaoPapelController,
    PapelConflitoController,
    RegraConflitoPapelController
  ],
  providers: [
    CidadaoService,
    CidadaoRepository,
    PapelCidadaoService,
    VerificacaoPapelService,
    HistoricoConversaoPapelService,
    RegraConflitoPapelRepository,
    {
      provide: APP_INTERCEPTOR,
      useClass: CidadaoAuditInterceptor,
    },
  ],
  exports: [
    CidadaoService, 
    CidadaoRepository, 
    PapelCidadaoService,
    VerificacaoPapelService,
    HistoricoConversaoPapelService,
    RegraConflitoPapelRepository
  ],
})
export class CidadaoModule {}
