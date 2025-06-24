import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggingService } from '../../shared/logging/logging.service';

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

// Serviços principais
import { PagamentoService } from './services/pagamento.service';
import { PagamentoLiberacaoService } from './services/pagamento-liberacao.service';
import { PagamentoLiberacaoScheduler } from './schedulers/pagamento-liberacao.scheduler';
import { ComprovanteService } from './services/comprovante.service';
import { ConfirmacaoService } from './services/confirmacao.service';
import { PagamentoMappingService } from './services/pagamento-mapping.service';
import { PagamentoResponseService } from './services/pagamento-response.service';

// Serviços de integração
import { AuditoriaPagamentoService } from './services/auditoria-pagamento.service';
import { IntegracaoSolicitacaoService } from './services/integracao-solicitacao.service';
import { IntegracaoDocumentoService } from './services/integracao-documento.service';
import { IntegracaoCidadaoService } from './services/integracao-cidadao.service';
import { IntegracaoAuditoriaService } from './services/integracao-auditoria.service';
import { IntegracaoNotificacaoService } from './services/integracao-notificacao.service';

// Validadores
import { PixValidator } from './validators/pix-validator';
import { StatusTransitionValidator } from './validators/status-transition-validator';
import { DadosBancariosValidator } from './validators/dados-bancarios-validator';

// Interceptors
import { DataMaskingInterceptor } from './interceptors/data-masking.interceptor';
import { AuditoriaInterceptor } from './interceptors/auditoria.interceptor';
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
    AuthModule,
    SharedModule,
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
  ],
  providers: [
    // Serviços principais
    PagamentoService,
    PagamentoLiberacaoService,
    ComprovanteService,
    ConfirmacaoService,
    PagamentoMappingService,
    PagamentoResponseService,

    // Schedulers
    PagamentoLiberacaoScheduler,

    // Serviços de integração
    AuditoriaPagamentoService,
    IntegracaoSolicitacaoService,
    IntegracaoDocumentoService,
    IntegracaoCidadaoService,
    IntegracaoAuditoriaService,
    IntegracaoNotificacaoService,

    // Validadores
    PixValidator,
    StatusTransitionValidator,
    DadosBancariosValidator,

    // Interceptors
    DataMaskingInterceptor,
    AuditoriaInterceptor,
    Reflector,

    // Logger
    LoggingService,
  ],
  exports: [
    TypeOrmModule,

    // Serviços principais
    PagamentoService,
    PagamentoLiberacaoService,
    ComprovanteService,
    ConfirmacaoService,
    PagamentoMappingService,
    PagamentoResponseService,
    // MetricasPagamentoService,
    // RelatorioPagamentoService,

    // Serviços de integração
    AuditoriaPagamentoService,
    IntegracaoSolicitacaoService,
    IntegracaoDocumentoService,
    IntegracaoCidadaoService,
    IntegracaoAuditoriaService,
    IntegracaoNotificacaoService,

    // Validadores
    PixValidator,
    DadosBancariosValidator,
    StatusTransitionValidator,
  ],
})
export class PagamentoModule {}
