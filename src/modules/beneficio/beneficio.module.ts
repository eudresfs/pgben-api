import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from '../../shared/shared.module';
import { CacheModule } from '../../shared/cache/cache.module';
import { AuthModule } from '../../auth/auth.module';
import { CommonModule } from '../../common/common.module';
import { DocumentoModule } from '../documento/documento.module';
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
  DadosAtaude,
  DadosCestaBasica,
  ConfiguracaoRenovacao,
  Solicitacao,
  Cidadao,
  Usuario,
} from '../../entities';
import { ResultadoBeneficioCessado } from '../../entities/resultado-beneficio-cessado.entity';
import { DocumentoComprobatorio } from '../../entities/documento-comprobatorio.entity';

// Controladores
import { BeneficioController } from './controllers/beneficio.controller';
import { DadosBeneficioController } from './controllers/dados-beneficio.controller';
import { ResultadoBeneficioCessadoController } from './controllers/resultado-beneficio-cessado.controller';
import { RenovacaoController } from './controllers/renovacao.controller';

// Services
import { BeneficioService } from './services/beneficio.service';
import { BeneficioEventosService } from './services/beneficio-eventos.service';
import { DadosNatalidadeService } from './services/dados-natalidade.service';
import { DadosAluguelSocialService } from './services/dados-aluguel-social.service';
import { DadosAtaudeService } from './services/dados-ataude.service';
import { DadosCestaBasicaService } from './services/dados-cesta-basica.service';
import { DadosBeneficioFactoryService } from './services/dados-beneficio-factory.service';
import { RenovacaoService } from './services/renovacao.service';
import { RenovacaoValidationService } from './services/renovacao-validation.service';
import { DocumentoReutilizacaoService } from './services/documento-reutilizacao.service';
import { Concessao, HistoricoConcessao } from '../../entities';
import { ConcessaoService } from './services/concessao.service';
import { ValidacaoBeneficioService } from './services/validacao-beneficio.service';
import { ResultadoBeneficioCessadoService } from './services/resultado-beneficio-cessado.service';
import { ValidacaoResultadoBeneficioService } from './services/validacao-resultado-beneficio.service';
import { ConcessaoController } from './controllers/concessao.controller';

// Listeners
import { BeneficioEventListener } from './listeners/beneficio-event.listener';

// Interceptors e Pipes
import { ResultadoBeneficioValidationInterceptor } from './interceptors/resultado-beneficio-validation.interceptor';
import { ResultadoBeneficioValidationPipe } from './pipes/resultado-beneficio-validation.pipe';

// Repositórios
import { TipoBeneficioRepository } from './repositories/tipo-beneficio.repository';
import { DadosNatalidadeRepository } from './repositories/dados-natalidade.repository';
import { DadosAluguelSocialRepository } from './repositories/dados-aluguel-social.repository';
import { DadosAtaudeRepository } from './repositories/dados-ataude.repository';
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
      DadosAtaude,
      DadosCestaBasica,
      ConfiguracaoRenovacao,
      Solicitacao,
      Concessao,
      HistoricoConcessao,
      Cidadao,
      Usuario,
      ResultadoBeneficioCessado,
      DocumentoComprobatorio,
    ]),
    // Módulos essenciais
    CommonModule, // Para FiltrosAvancadosService usado pelo ConcessaoService
    SharedModule, // Serviços compartilhados
    CacheModule, // Para CacheService usado pelo CacheInterceptor
    DocumentoModule, // Para StorageProviderFactory usado pelo ResultadoBeneficioCessadoService
    forwardRef(() => AuthModule), // Para autenticação e autorização
    forwardRef(() => SolicitacaoModule), // Para WorkflowSolicitacaoService
    forwardRef(() =>
      import('../pagamento/pagamento.module').then((m) => m.PagamentoModule),
    ), // Para PagamentoService usado pelo ConcessaoService
    forwardRef(() =>
      import('../aprovacao/aprovacao.module').then((m) => m.AprovacaoModule),
    ), // Para AprovacaoService usado pelo AprovacaoInterceptor
    forwardRef(() =>
      import('../notificacao/notificacao.module').then((m) => m.NotificacaoModule),
    ), // Para NotificacaoService usado pelo BeneficioEventListener
  ],
  controllers: [
    ConcessaoController,
    BeneficioController,
    DadosBeneficioController,
    ResultadoBeneficioCessadoController,
    RenovacaoController,
  ],
  providers: [
    ConcessaoService,
    BeneficioService,
    BeneficioEventosService,
    ValidacaoBeneficioService,
    ResultadoBeneficioCessadoService,
    ValidacaoResultadoBeneficioService,
    DadosNatalidadeService,
    DadosAluguelSocialService,
    DadosAtaudeService,
    DadosCestaBasicaService,
    DadosBeneficioFactoryService,
    RenovacaoService,
    RenovacaoValidationService,
    DocumentoReutilizacaoService,
    BeneficioEventListener,
    // Interceptors
    ResultadoBeneficioValidationInterceptor,
    ResultadoBeneficioValidationPipe,
    TipoBeneficioRepository,
    DadosNatalidadeRepository,
    DadosAluguelSocialRepository,
    DadosAtaudeRepository,
    DadosCestaBasicaRepository,
  ],
  exports: [
    ConcessaoService,
    BeneficioService,
    BeneficioEventosService,
    ValidacaoBeneficioService,
    ResultadoBeneficioCessadoService,
    ValidacaoResultadoBeneficioService,
    DadosNatalidadeService,
    DadosAluguelSocialService,
    DadosAtaudeService,
    DadosCestaBasicaService,
    DadosBeneficioFactoryService,
    RenovacaoService,
    RenovacaoValidationService,
    DocumentoReutilizacaoService,
    // Repositórios exportados
    DadosNatalidadeRepository,
    DadosAluguelSocialRepository,
    DadosAtaudeRepository,
    DadosCestaBasicaRepository,
  ],
})
export class BeneficioModule {}
