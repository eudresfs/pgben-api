import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../../auth/auth.module'
import { SolicitacaoModule } from '../solicitacao/solicitacao.module'

// Entidades
import { TipoBeneficio } from './entities/tipo-beneficio.entity';
import { RequisitoDocumento } from './entities/requisito-documento.entity';
import { FluxoBeneficio } from './entities/fluxo-beneficio.entity';
import { CampoDinamicoBeneficio } from './entities/campo-dinamico-beneficio.entity';
import { VersaoSchemaBeneficio } from './entities/versao-schema-beneficio.entity';
import { EspecificacaoNatalidade } from './entities/especificacao-natalidade.entity';
import { EspecificacaoAluguelSocial } from './entities/especificacao-aluguel-social.entity';
import { EspecificacaoFuneral } from './entities/especificacao-funeral.entity';
import { EspecificacaoCestaBasica } from './entities/especificacao-cesta-basica.entity';
import { ConfiguracaoRenovacao } from './entities/configuracao-renovacao.entity';
import { Solicitacao } from '../solicitacao/entities/solicitacao.entity';

// Controladores
import { BeneficioController } from './controllers/beneficio.controller';
import { CampoDinamicoController } from './controllers/campo-dinamico.controller';
import { FormularioDinamicoController } from './controllers/formulario-dinamico.controller';
import { ExportacaoController } from '../solicitacao/controllers/exportacao.controller';
import { EspecificacaoNatalidadeController } from './controllers/especificacao-natalidade.controller';
import { EspecificacaoAluguelSocialController } from './controllers/especificacao-aluguel-social.controller';
import { EspecificacaoFuneralController } from './controllers/especificacao-funeral.controller';
import { EspecificacaoCestaBasicaController } from './controllers/especificacao-cesta-basica.controller';
import { FormularioCondicionalController } from './controllers/formulario-condicional.controller';
import { RenovacaoAutomaticaController } from './controllers/renovacao-automatica.controller';

// Serviços
import { BeneficioService } from './services/beneficio.service';
import { CampoDinamicoService } from './services/campo-dinamico.service';
import { ValidacaoDinamicaService } from './services/validacao-dinamica.service';
import { DadosDinamicosService } from './services/dados-dinamicos.service';
import { ExportacaoService } from '../solicitacao/services/exportacao.service';
import { FormularioCondicionalService } from './services/formulario-condicional.service';
import { EspecificacaoNatalidadeService } from './services/especificacao-natalidade.service';
import { EspecificacaoAluguelSocialService } from './services/especificacao-aluguel-social.service';
import { EspecificacaoFuneralService } from './services/especificacao-funeral.service';
import { EspecificacaoCestaBasicaService } from './services/especificacao-cesta-basica.service';
import { RenovacaoAutomaticaService } from './services/renovacao-automatica.service';
import { NotificacaoRenovacaoService } from './services/notificacao-renovacao.service';

// Repositórios
import { TipoBeneficioRepository } from './repositories/tipo-beneficio.repository';
import { CampoDinamicoRepository } from './repositories/campo-dinamico.repository';
import { EspecificacaoNatalidadeRepository } from './repositories/especificacao-natalidade.repository';
import { EspecificacaoAluguelSocialRepository } from './repositories/especificacao-aluguel-social.repository';
import { EspecificacaoFuneralRepository } from './repositories/especificacao-funeral.repository';
import { EspecificacaoCestaBasicaRepository } from './repositories/especificacao-cesta-basica.repository';
import { ConfiguracaoRenovacaoRepository } from './repositories/configuracao-renovacao.repository';

/**
 * Módulo de benefícios
 *
 * Responsável por gerenciar os benefícios do sistema, incluindo tipos de benefícios,
 * requisitos documentais, fluxos de aprovação e campos dinâmicos.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      TipoBeneficio,
      RequisitoDocumento,
      FluxoBeneficio,
      CampoDinamicoBeneficio,
      VersaoSchemaBeneficio,
      EspecificacaoNatalidade,
      EspecificacaoAluguelSocial,
      EspecificacaoFuneral,
      EspecificacaoCestaBasica,
      ConfiguracaoRenovacao,
      Solicitacao,
    ]),
    AuthModule,
    SolicitacaoModule,
  ],
  controllers: [
    BeneficioController,
    CampoDinamicoController,
    FormularioDinamicoController,
    ExportacaoController,
    EspecificacaoNatalidadeController,
    EspecificacaoAluguelSocialController,
    EspecificacaoFuneralController,
    EspecificacaoCestaBasicaController,
    FormularioCondicionalController,
    RenovacaoAutomaticaController,
  ],
  providers: [
    BeneficioService,
    CampoDinamicoService,
    ValidacaoDinamicaService,
    DadosDinamicosService,
    ExportacaoService,
    EspecificacaoNatalidadeService,
    EspecificacaoAluguelSocialService,
    EspecificacaoFuneralService,
    EspecificacaoCestaBasicaService,
    FormularioCondicionalService,
    RenovacaoAutomaticaService,
    NotificacaoRenovacaoService,
    TipoBeneficioRepository,
    CampoDinamicoRepository,
    EspecificacaoNatalidadeRepository,
    EspecificacaoAluguelSocialRepository,
    EspecificacaoFuneralRepository,
    EspecificacaoCestaBasicaRepository,
    ConfiguracaoRenovacaoRepository,
  ],
  exports: [
    BeneficioService,
    CampoDinamicoService,
    ValidacaoDinamicaService,
    DadosDinamicosService,
    EspecificacaoNatalidadeService,
    EspecificacaoAluguelSocialService,
    EspecificacaoFuneralService,
    EspecificacaoCestaBasicaService,
    FormularioCondicionalService,
    RenovacaoAutomaticaService,
    NotificacaoRenovacaoService,
  ],
})
export class BeneficioModule {}
