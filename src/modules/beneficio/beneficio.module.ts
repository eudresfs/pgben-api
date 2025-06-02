import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../../auth/auth.module'
import { SolicitacaoModule } from '../solicitacao/solicitacao.module'

// Entidades
import { 
  TipoBeneficio, 
  RequisitoDocumento, 
  FluxoBeneficio, 
  CampoDinamicoBeneficio, 
  VersaoSchemaBeneficio, 
  DadosNatalidade, 
  DadosAluguelSocial, 
  DadosFuneral, 
  DadosCestaBasica, 
  ConfiguracaoRenovacao, 
  Solicitacao 
} from '../../entities';

// Controladores
import { BeneficioController } from './controllers/beneficio.controller';
import { CampoDinamicoController } from './controllers/campo-dinamico.controller';
import { FormularioDinamicoController } from './controllers/formulario-dinamico.controller';
import { ExportacaoController } from '../solicitacao/controllers/exportacao.controller';
import { DadosNatalidadeController } from './controllers/dados-natalidade.controller';
import { DadosAluguelSocialController } from './controllers/dados-aluguel-social.controller';
import { DadosFuneralController } from './controllers/dados-funeral.controller';
import { DadosCestaBasicaController } from './controllers/dados-cesta-basica.controller';
import { FormularioCondicionalController } from './controllers/formulario-condicional.controller';
import { RenovacaoAutomaticaController } from './controllers/renovacao-automatica.controller';

// Serviços
import { BeneficioService } from './services/beneficio.service';
import { CampoDinamicoService } from './services/campo-dinamico.service';
import { ValidacaoDinamicaService } from './services/validacao-dinamica.service';
import { DadosDinamicosService } from './services/dados-dinamicos.service';
import { ExportacaoService } from '../solicitacao/services/exportacao.service';
import { FormularioCondicionalService } from './services/formulario-condicional.service';
import { DadosNatalidadeService } from './services/dados-natalidade.service';
import { DadosAluguelSocialService } from './services/dados-aluguel-social.service';
import { DadosFuneralService } from './services/dados-funeral.service';
import { DadosCestaBasicaService } from './services/dados-cesta-basica.service';
import { RenovacaoAutomaticaService } from './services/renovacao-automatica.service';
import { NotificacaoRenovacaoService } from './services/notificacao-renovacao.service';

// Repositórios
import { TipoBeneficioRepository } from './repositories/tipo-beneficio.repository';
import { CampoDinamicoRepository } from './repositories/campo-dinamico.repository';
import { DadosNatalidadeRepository } from './repositories/dados-natalidade.repository';
import { DadosAluguelSocialRepository } from './repositories/dados-aluguel-social.repository';
import { DadosFuneralRepository } from './repositories/dados-funeral.repository';
import { DadosCestaBasicaRepository } from './repositories/dados-cesta-basica.repository';
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
      DadosNatalidade,
      DadosAluguelSocial,
      DadosFuneral,
      DadosCestaBasica,
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
    DadosNatalidadeController,
    DadosAluguelSocialController,
    DadosFuneralController,
    DadosCestaBasicaController,
    FormularioCondicionalController,
    RenovacaoAutomaticaController,
  ],
  providers: [
    BeneficioService,
    CampoDinamicoService,
    ValidacaoDinamicaService,
    DadosDinamicosService,
    ExportacaoService,
    DadosNatalidadeService,
    DadosAluguelSocialService,
    DadosFuneralService,
    DadosCestaBasicaService,
    FormularioCondicionalService,
    RenovacaoAutomaticaService,
    NotificacaoRenovacaoService,
    TipoBeneficioRepository,
    CampoDinamicoRepository,
    DadosNatalidadeRepository,
    DadosAluguelSocialRepository,
    DadosFuneralRepository,
    DadosCestaBasicaRepository,
    ConfiguracaoRenovacaoRepository,
  ],
  exports: [
    BeneficioService,
    CampoDinamicoService,
    ValidacaoDinamicaService,
    DadosDinamicosService,
    DadosNatalidadeService,
    DadosAluguelSocialService,
    DadosFuneralService,
    DadosCestaBasicaService,
    FormularioCondicionalService,
    RenovacaoAutomaticaService,
    NotificacaoRenovacaoService,
  ],
})
export class BeneficioModule {}
