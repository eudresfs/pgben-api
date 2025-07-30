import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CidadaoController } from './controllers/cidadao.controller';
import { CidadaoService } from './services/cidadao.service';
import { CidadaoRepository } from './repositories/cidadao.repository';
import {
  Cidadao,
  ComposicaoFamiliar,
  InfoBancaria,
  DadosSociais,
  SituacaoMoradia,
  Contato,
  Endereco,
  Solicitacao,
} from '../../entities';
import { CacheModule } from '../../shared/cache';
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
import { createScopedRepositoryProvider } from '../../common/providers/scoped-repository.provider';

/**
 * Módulo de cidadãos
 *
 * Responsável por gerenciar os cidadãos/beneficiários do sistema,
 * incluindo cadastro, consulta e composição familiar.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cidadao, // Adicionado para resolver dependência do DadosSociaisService
      ComposicaoFamiliar,
      InfoBancaria,
      DadosSociais,
      SituacaoMoradia,
      Contato,
      Endereco,
      Solicitacao, // Adicionado para validação cruzada com composição familiar
    ]),
    CacheModule,
    AuthModule,
    NotificacaoModule,
  ],
  controllers: [
    CidadaoController,
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
    createScopedRepositoryProvider(Cidadao),
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
