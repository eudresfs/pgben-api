import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CidadaoController } from './controllers/cidadao.controller';
import { CidadaoService } from './services/cidadao.service';
import { CidadaoRepository } from './repositories/cidadao.repository';
import { RegraConflitoPapelRepository } from './repositories/regra-conflito-papel.repository';
import {
  Cidadao,
  PapelCidadao,
  ComposicaoFamiliar,
  HistoricoConversaoPapel,
  RegraConflitoPapel,
  InfoBancaria,
  DadosSociais,
} from '../../entities';
import { CacheModule } from '../../shared/cache';
import { CidadaoAuditInterceptor } from './interceptors/cidadao-audit.interceptor';
import { PapelCidadaoService } from './services/papel-cidadao.service';
import { PapelCidadaoController } from './controllers/papel-cidadao.controller';
import { VerificacaoPapelService } from './services/verificacao-papel.service';
import { HistoricoConversaoPapelService } from './services/historico-conversao-papel.service';
import { VerificacaoPapelController } from './controllers/verificacao-papel.controller';
import { PapelConflitoController } from './controllers/papel-conflito.controller';
import { RegraConflitoPapelController } from './controllers/regra-conflito-papel.controller';
import { InfoBancariaController } from './controllers/info-bancaria.controller';
import { InfoBancariaService } from './services/info-bancaria.service';
import { InfoBancariaRepository } from './repositories/info-bancaria.repository';
import { DadosSociaisController } from './controllers/dados-sociais.controller';
import { DadosSociaisService } from './services/dados-sociais.service';
import { ComposicaoFamiliarController } from './controllers/composicao-familiar.controller';
import { ComposicaoFamiliarService } from './services/composicao-familiar.service';
// import { DiagnosticoController } from './controllers/diagnostico.controller'; // Movido para módulo separado
import { AuthModule } from '../../auth/auth.module';
import { NotificacaoModule } from '../notificacao/notificacao.module';

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
      RegraConflitoPapel,
      InfoBancaria,
      DadosSociais,
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
    RegraConflitoPapelController,
    InfoBancariaController,
    DadosSociaisController,
    ComposicaoFamiliarController,
    // DiagnosticoController // Movido para módulo separado
  ],
  providers: [
    Logger,
    CidadaoService,
    CidadaoRepository,
    PapelCidadaoService,
    VerificacaoPapelService,
    HistoricoConversaoPapelService,
    RegraConflitoPapelRepository,
    InfoBancariaService,
    InfoBancariaRepository,
    DadosSociaisService,
    ComposicaoFamiliarService,
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
    RegraConflitoPapelRepository,
    InfoBancariaService,
    InfoBancariaRepository,
    DadosSociaisService,
    ComposicaoFamiliarService,
  ],
})
export class CidadaoModule {}
