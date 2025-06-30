import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { LoggingService } from '../../shared/logging/logging.service';
import { StorageService } from '../../shared/services/storage.service';

// Entidades
import {
  Pagamento,
  ComprovantePagamento,
  ConfirmacaoRecebimento,
  LogAuditoria,
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
import { PagamentoBatchService } from './services/pagamento-batch.service';
import { PagamentoQueueService } from './services/pagamento-queue.service';
import { PagamentoQueueProcessor } from './services/pagamento-queue.processor';

// Command/Query Handlers
import {
  CreatePagamentoHandler,
  LiberarPagamentoHandler,
  GetPagamentosHandler,
} from './handlers';

// Repositórios
import { PagamentoRepository } from './repositories/pagamento.repository';
import { ComprovanteRepository } from './repositories/comprovante.repository';
import { ConfirmacaoRepository } from './repositories/confirmacao.repository';

// Validadores
import { PixValidator } from './validators/pix-validator';
import { StatusTransitionValidator } from './validators/status-transition-validator';
import { DadosBancariosValidator } from './validators/dados-bancarios-validator';

// Interceptors
import { DataMaskingInterceptor } from './interceptors/data-masking.interceptor';
import { AuditoriaInterceptor } from './interceptors/auditoria.interceptor';
import { PagamentoPerformanceInterceptor } from './interceptors/pagamento-performance.interceptor';
import { Reflector } from '@nestjs/core';

// Módulos
import { AuthModule } from '../../auth/auth.module';
import { UsuarioModule } from '../usuario/usuario.module';
import { SolicitacaoModule } from '../solicitacao/solicitacao.module';
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
      ComprovantePagamento,
      ConfirmacaoRecebimento,
      LogAuditoria,
    ]),
    // Configuração da fila BullMQ para pagamentos
    BullModule.registerQueue({
      name: 'pagamentos',
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
    AuthModule,
    SharedModule,
    CacheModule,
    UsuarioModule,
    forwardRef(() => SolicitacaoModule),
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
    // Repositórios
    PagamentoRepository,
    ComprovanteRepository,
    ConfirmacaoRepository,

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
    PagamentoQueueProcessor,

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
  ],
  exports: [
    TypeOrmModule,
    BullModule,

    // Repositórios
    PagamentoRepository,
    ComprovanteRepository,
    ConfirmacaoRepository,

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
  ],
})
export class PagamentoModule {}
