import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
  SituacaoMoradia,
  Contato,
  Endereco,
} from '../../entities';
import { CacheModule } from '../../shared/cache';
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
import { SituacaoMoradiaController } from './controllers/situacao-moradia.controller';
import { SituacaoMoradiaService } from './services/situacao-moradia.service';
import { ContatoController } from './controllers/contato.controller';
import { ContatoService } from './services/contato.service';
import { EnderecoController } from './controllers/endereco.controller';
import { EnderecoService } from './services/endereco.service';
import { AuthModule } from '../../auth/auth.module';
import { NotificacaoModule } from '../notificacao/notificacao.module';
import { AuditEventsModule } from '../auditoria';

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
      SituacaoMoradia,
      Contato,
      Endereco,
    ]),
    CacheModule,
    AuthModule,
    NotificacaoModule,
    AuditEventsModule,
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
    SituacaoMoradiaController,
    ContatoController,
    EnderecoController,
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
    SituacaoMoradiaService,
    ContatoService,
    EnderecoService,
  ],
  exports: [
    TypeOrmModule,
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
    SituacaoMoradiaService,
    ContatoService,
    EnderecoService,
  ],
})
export class CidadaoModule {}
