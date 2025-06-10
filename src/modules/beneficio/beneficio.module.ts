import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from '../../shared/shared.module';
import { CacheModule } from '../../shared/cache/cache.module';
import { AuthModule } from '../../auth/auth.module';
import { SolicitacaoModule } from '../solicitacao/solicitacao.module';

// Entidades
import {
  TipoBeneficio,
  TipoBeneficioSchema,
  RequisitoDocumento,
  FluxoBeneficio,
  CampoDinamicoBeneficio,
  DadosNatalidade,
  DadosAluguelSocial,
  DadosFuneral,
  DadosCestaBasica,
  ConfiguracaoRenovacao,
  Solicitacao,
} from '../../entities';

// Controladores
import { BeneficioController } from './controllers/beneficio.controller';
import { DadosBeneficioController } from './controllers/dados-beneficio.controller';
import { RenovacaoAutomaticaController } from './controllers/renovacao-automatica.controller';

// Services
import { BeneficioService } from './services/beneficio.service';
import { ValidacaoDinamicaService } from './services/validacao-dinamica.service';

import { DadosNatalidadeService } from './services/dados-natalidade.service';
import { DadosAluguelSocialService } from './services/dados-aluguel-social.service';
import { DadosFuneralService } from './services/dados-funeral.service';
import { DadosCestaBasicaService } from './services/dados-cesta-basica.service';
import { DadosBeneficioFactoryService } from './services/dados-beneficio-factory.service';
import { RenovacaoAutomaticaService } from './services/renovacao-automatica.service';
import { NotificacaoRenovacaoService } from './services/notificacao-renovacao.service';

// Repositórios
import { TipoBeneficioRepository } from './repositories/tipo-beneficio.repository';
import { TipoBeneficioSchemaRepository } from './repositories/tipo-beneficio-schema.repository';
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
      TipoBeneficioSchema,
      RequisitoDocumento,
      FluxoBeneficio,
      CampoDinamicoBeneficio,
      DadosNatalidade,
      DadosAluguelSocial,
      DadosFuneral,
      DadosCestaBasica,
      ConfiguracaoRenovacao,
      Solicitacao,
    ]),
    // Módulos essenciais
    SharedModule, // Serviços compartilhados
    CacheModule, // Para CacheService usado pelo CacheInterceptor
    forwardRef(() => AuthModule), // Para autenticação e autorização
    forwardRef(() => SolicitacaoModule), // Para WorkflowSolicitacaoService
  ],
  controllers: [
    BeneficioController,
    DadosBeneficioController,
    RenovacaoAutomaticaController,
  ],
  providers: [
    BeneficioService,
    ValidacaoDinamicaService,
    DadosNatalidadeService,
    DadosAluguelSocialService,
    DadosFuneralService,
    DadosCestaBasicaService,
    DadosBeneficioFactoryService,
    RenovacaoAutomaticaService,
    NotificacaoRenovacaoService,
    TipoBeneficioRepository,
    TipoBeneficioSchemaRepository,
    CampoDinamicoRepository,
    DadosNatalidadeRepository,
    DadosAluguelSocialRepository,
    DadosFuneralRepository,
    DadosCestaBasicaRepository,
    ConfiguracaoRenovacaoRepository,
  ],
  exports: [
    BeneficioService,
    ValidacaoDinamicaService,
    DadosNatalidadeService,
    DadosAluguelSocialService,
    DadosFuneralService,
    DadosCestaBasicaService,
    DadosBeneficioFactoryService,
    RenovacaoAutomaticaService,
    NotificacaoRenovacaoService,
  ],
})
export class BeneficioModule {}
