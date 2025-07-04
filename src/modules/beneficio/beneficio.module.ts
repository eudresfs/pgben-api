import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from '../../shared/shared.module';
import { CacheModule } from '../../shared/cache/cache.module';
import { AuthModule } from '../../auth/auth.module';

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

// Services
import { BeneficioService } from './services/beneficio.service';

import { DadosNatalidadeService } from './services/dados-natalidade.service';
import { DadosAluguelSocialService } from './services/dados-aluguel-social.service';
import { DadosFuneralService } from './services/dados-funeral.service';
import { DadosCestaBasicaService } from './services/dados-cesta-basica.service';
import { DadosBeneficioFactoryService } from './services/dados-beneficio-factory.service';
import { Concessao, HistoricoConcessao } from '../../entities';
import { ConcessaoService } from './services/concessao.service';
import { ValidacaoBeneficioService } from './services/validacao-beneficio.service';
import { ConcessaoController } from './controllers/concessao.controller';

// Interceptors
import { WorkflowInterceptor } from '../../interceptors/workflow.interceptor';

// Repositórios
import { TipoBeneficioRepository } from './repositories/tipo-beneficio.repository';
import { TipoBeneficioSchemaRepository } from './repositories/tipo-beneficio-schema.repository';
import { DadosNatalidadeRepository } from './repositories/dados-natalidade.repository';
import { DadosAluguelSocialRepository } from './repositories/dados-aluguel-social.repository';
import { DadosFuneralRepository } from './repositories/dados-funeral.repository';
import { DadosCestaBasicaRepository } from './repositories/dados-cesta-basica.repository';

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
      Concessao,
      HistoricoConcessao,
    ]),
    // Módulos essenciais
    SharedModule, // Serviços compartilhados
    CacheModule, // Para CacheService usado pelo CacheInterceptor
    forwardRef(() => AuthModule), // Para autenticação e autorização
    forwardRef(() =>
      import('../solicitacao/solicitacao.module').then(
        (m) => m.SolicitacaoModule,
      ),
    ), // Para WorkflowSolicitacaoService
    forwardRef(() =>
      import('../pagamento/pagamento.module').then(
        (m) => m.PagamentoModule,
      ),
    ), // Para PagamentoService usado pelo ConcessaoService
  ],
  controllers: [
    ConcessaoController,
    BeneficioController,
    DadosBeneficioController,
  ],
  providers: [
    ConcessaoService,
    BeneficioService,
    ValidacaoBeneficioService,
    DadosNatalidadeService,
    DadosAluguelSocialService,
    DadosFuneralService,
    DadosCestaBasicaService,
    DadosBeneficioFactoryService,
    WorkflowInterceptor,
    TipoBeneficioRepository,
    TipoBeneficioSchemaRepository,
    DadosNatalidadeRepository,
    DadosAluguelSocialRepository,
    DadosFuneralRepository,
    DadosCestaBasicaRepository,
  ],
  exports: [
    ConcessaoService,
    BeneficioService,
    ValidacaoBeneficioService,
    DadosNatalidadeService,
    DadosAluguelSocialService,
    DadosFuneralService,
    DadosCestaBasicaService,
    DadosBeneficioFactoryService,
  ],
})
export class BeneficioModule {}
