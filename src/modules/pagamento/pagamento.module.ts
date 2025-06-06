import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entidades
import {
  Pagamento,
  ComprovantePagamento,
  ConfirmacaoRecebimento,
} from '../../entities';

// Controllers
import { PagamentoController } from './controllers/pagamento.controller';
import { ComprovanteController } from './controllers/comprovante.controller';
import { ConfirmacaoController } from './controllers/confirmacao.controller';

// Serviços principais
import { PagamentoService } from './services/pagamento.service';
import { ComprovanteService } from './services/comprovante.service';
import { ConfirmacaoService } from './services/confirmacao.service';
// import { MetricasPagamentoService } from './services/metricas-pagamento.service';
// import { RelatorioPagamentoService } from './services/relatorio-pagamento.service';

// Serviços de integração
import { AuditoriaPagamentoService } from './services/auditoria-pagamento.service';
import { IntegracaoSolicitacaoService } from './services/integracao-solicitacao.service';
import { IntegracaoDocumentoService } from './services/integracao-documento.service';
import { IntegracaoCidadaoService } from './services/integracao-cidadao.service';

// Validadores
import { PixValidator } from './validators/pix-validator';
import { StatusTransitionValidator } from './validators/status-transition-validator';
import { DadosBancariosValidator } from './validators/dados-bancarios-validator';

// Módulos
import { UsuarioModule } from '../usuario/usuario.module';
import { SolicitacaoModule } from '../solicitacao/solicitacao.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';

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
    ]),
    UsuarioModule,
    SolicitacaoModule,
    AuditoriaModule,
  ],
  controllers: [
    PagamentoController,
    ComprovanteController,
    ConfirmacaoController,
  ],
  providers: [
    // Serviços principais
    PagamentoService,
    ComprovanteService,
    ConfirmacaoService,
    // MetricasPagamentoService,
    // RelatorioPagamentoService,

    // Serviços de integração
    AuditoriaPagamentoService,
    IntegracaoSolicitacaoService,
    IntegracaoDocumentoService,
    IntegracaoCidadaoService,

    // Validadores
    PixValidator,
    StatusTransitionValidator,
    DadosBancariosValidator,
  ],
  exports: [
    TypeOrmModule,

    // Serviços principais
    PagamentoService,
    ComprovanteService,
    ConfirmacaoService,
    // MetricasPagamentoService,
    // RelatorioPagamentoService,

    // Serviços de integração
    AuditoriaPagamentoService,
    IntegracaoSolicitacaoService,
    IntegracaoDocumentoService,
    IntegracaoCidadaoService,

    // Validadores
    PixValidator,
    DadosBancariosValidator,
    StatusTransitionValidator,
  ],
})
export class PagamentoModule {}
