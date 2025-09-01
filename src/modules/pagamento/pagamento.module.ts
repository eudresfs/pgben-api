import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { HttpModule } from '@nestjs/axios';
import { LoggingService } from '../../shared/logging/logging.service';
import { StorageService } from '../../shared/services/storage.service';
import { createScopedRepositoryProvider } from '../../common/providers/scoped-repository.provider';

// Entidades
import {
  Pagamento,
  Documento,
  ConfirmacaoRecebimento,
  LogAuditoria,
  TipoBeneficio,
  Solicitacao,
} from '../../entities';

// Controllers
import { PagamentoController } from './controllers/pagamento.controller';
import { ComprovanteController } from './controllers/comprovante.controller';
import { ConfirmacaoController } from './controllers/confirmacao.controller';
import { PagamentoBatchController } from './controllers/pagamento-batch.controller';

// Serviços principais
import { PagamentoService } from './services/pagamento.service';
import { PagamentoWorkflowService } from './services/pagamento-workflow.service';
import { PagamentoValidationService } from './services/pagamento-validation.service';
import { PagamentoLiberacaoScheduler } from './schedulers/pagamento-liberacao.scheduler';
import { ComprovanteService } from './services/comprovante.service';
import { ConfirmacaoService } from './services/confirmacao.service';

// Novos serviços de otimização
import { PagamentoCacheService } from './services/pagamento-cache.service';
import { PagamentoCacheInvalidationService } from './services/pagamento-cache-invalidation.service';
import { PagamentoBatchService } from './services/pagamento-batch.service';
import { PagamentoQueueService } from './services/pagamento-queue.service';
import { PagamentoQueueProcessor } from './services/pagamento-queue.processor';

// Serviços de cálculo e estratégias
import { PagamentoCalculatorService } from './services/pagamento-calculator.service';
import { BeneficioDataService } from './services/beneficio-data.service';
import { AluguelSocialStrategy } from './strategies/aluguel-social.strategy';
import { CestaBasicaStrategy } from './strategies/cesta-basica.strategy';
import { FuneralStrategy } from './strategies/funeral.strategy';
import { NatalidadeStrategy } from './strategies/natalidade.strategy';

// Command/Query Handlers
import {
  CreatePagamentoHandler,
  LiberarPagamentoHandler,
  GetPagamentosHandler,
} from './handlers';

// Repositories
import { PagamentoRepository } from './repositories/pagamento.repository';
import { ConfirmacaoRepository } from './repositories/confirmacao.repository';
import { PagamentoSystemRepository } from './repositories/pagamento-system.repository';
import { ScopedRepository } from '../../common/repositories/scoped-repository';
import { DataSource } from 'typeorm';

// Validadores
import { PixValidator } from './validators/pix-validator';
import { StatusTransitionValidator } from './validators/status-transition-validator';
import { DadosBancariosValidator } from './validators/dados-bancarios-validator';

// Interceptors
import { DataMaskingInterceptor } from './interceptors/data-masking.interceptor';
import { AuditoriaInterceptor } from './interceptors/auditoria.interceptor';
import { PagamentoPerformanceInterceptor } from './interceptors/pagamento-performance.interceptor';
import { Reflector } from '@nestjs/core';

// Mappers
import { PagamentoUnifiedMapper } from './mappers/pagamento-unified.mapper';

// Eventos
import { PagamentoEventosService } from './services/pagamento-eventos.service';
import { PagamentoEventListener } from './listeners/pagamento-event.listener';

// Módulos
import { AuthModule } from '../../auth/auth.module';
import { UsuarioModule } from '../usuario/usuario.module';
import { SolicitacaoModule } from '../solicitacao/solicitacao.module';
import { BeneficioModule } from '../beneficio/beneficio.module';
import { AuditoriaSharedModule } from '../../shared/auditoria/auditoria-shared.module';
import { DocumentoModule } from '../documento/documento.module';
import { CidadaoModule } from '../cidadao/cidadao.module';
import { NotificacaoModule } from '../notificacao/notificacao.module';
import { SharedModule } from '../../shared/shared.module';
import { CacheModule } from '../../shared/cache/cache.module';

/**
 * Módulo de Pagamento/Liberação
 *
 * Este módulo gerencia a etapa final do fluxo de concessão de benefícios,
 * controlando a liberação efetiva dos recursos para os beneficiários.
 *
 * @author Equipe PGBen
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Pagamento,
      Documento,
      ConfirmacaoRecebimento,
      LogAuditoria,
      TipoBeneficio,
      Solicitacao,
    ]),
    // Configuração da fila BullMQ para pagamentos
    BullModule.registerQueue({
      name: 'pagamentos',
    }),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    AuthModule,
    SharedModule,
    CacheModule,
    UsuarioModule,
    forwardRef(() => SolicitacaoModule),
    forwardRef(() => BeneficioModule),
    DocumentoModule,
    CidadaoModule,
    NotificacaoModule,
    AuditoriaSharedModule,
  ],
  controllers: [
    PagamentoController,
    ComprovanteController,
    ConfirmacaoController,
    PagamentoBatchController,
  ],
  providers: [
    // Repositórios com escopo
    createScopedRepositoryProvider(Pagamento),
    createScopedRepositoryProvider(Documento),
    createScopedRepositoryProvider(ConfirmacaoRecebimento),

    // Repositórios customizados
    PagamentoRepository,
    ConfirmacaoRepository,
    PagamentoSystemRepository,
    // Provider específico para operações de sistema (schedulers)
    {
      provide: 'PAGAMENTO_SYSTEM_REPOSITORY',
      useFactory: (dataSource: DataSource) => {
        const baseRepository = dataSource.getRepository(Pagamento);
        return new ScopedRepository(
          Pagamento,
          baseRepository.manager,
          baseRepository.queryRunner,
          {
            strictMode: false,
            allowGlobalScope: true,
            operationName: 'system-scheduler',
            enableMetadataCache: true,
            enableQueryHints: true,
          },
        );
      },
      inject: [DataSource],
    },

    // Serviços principais
    PagamentoService,
    PagamentoWorkflowService,
    PagamentoValidationService,
    ComprovanteService,
    ConfirmacaoService,

    // Serviços de otimização
    PagamentoCacheService,
    PagamentoCacheInvalidationService,
    PagamentoBatchService,
    PagamentoQueueService,
    PagamentoQueueProcessor,

    // Serviços de cálculo e estratégias
    PagamentoCalculatorService,
    BeneficioDataService,
    AluguelSocialStrategy,
    CestaBasicaStrategy,
    FuneralStrategy,
    NatalidadeStrategy,

    // Command/Query Handlers
    CreatePagamentoHandler,
    LiberarPagamentoHandler,
    GetPagamentosHandler,

    // Schedulers
    PagamentoLiberacaoScheduler,

    // Validadores
    PixValidator,
    StatusTransitionValidator,
    DadosBancariosValidator,

    // Interceptors
    DataMaskingInterceptor,
    AuditoriaInterceptor,
    PagamentoPerformanceInterceptor,
    Reflector,

    // Logger
    LoggingService,

    // Storage
    StorageService,

    // Mappers
    PagamentoUnifiedMapper,

    // Eventos
    PagamentoEventosService,
    PagamentoEventListener,
  ],
  exports: [
    TypeOrmModule,
    BullModule,

    // Repositórios
    PagamentoRepository,
    ConfirmacaoRepository,
    PagamentoSystemRepository,

    // Serviços principais
    PagamentoService,
    PagamentoWorkflowService,
    PagamentoValidationService,
    ComprovanteService,
    ConfirmacaoService,

    // Novos serviços de otimização
    PagamentoCacheService,
    PagamentoBatchService,
    PagamentoQueueService,

    // Command/Query Handlers
    CreatePagamentoHandler,
    LiberarPagamentoHandler,
    GetPagamentosHandler,

    // Validadores
    PixValidator,
    DadosBancariosValidator,
    StatusTransitionValidator,

    // Eventos
    PagamentoEventosService,
  ],
})
export class PagamentoModule {}
