import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entidades
import { 
  Pagamento, 
  ComprovantePagamento, 
  ConfirmacaoRecebimento 
} from '../../entities';

// Controllers
import { PagamentoController } from './controllers/pagamento.controller';
import { ComprovanteController } from './controllers/comprovante.controller';
import { ConfirmacaoController } from './controllers/confirmacao.controller';

// Serviços principais
import { PagamentoService } from './services/pagamento.service';
import { ComprovanteService } from './services/comprovante.service';
import { ConfirmacaoService } from './services/confirmacao.service';

// Serviços de integração
import { AuditoriaPagamentoService } from './services/auditoria-pagamento.service';
import { IntegracaoSolicitacaoService } from './services/integracao-solicitacao.service';
import { IntegracaoDocumentoService } from './services/integracao-documento.service';
import { IntegracaoCidadaoService } from './services/integracao-cidadao.service';

// Validadores
import { PixValidator } from './validators/pix-validator';
import { StatusTransitionValidator } from './validators/status-transition-validator';
import { DadosBancariosValidator } from './validators/dados-bancarios-validator';

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
      ConfirmacaoRecebimento
    ]),
    // Outros módulos necessários serão importados aqui:
    // SolicitacaoModule, 
    // UsuarioModule,
    // CidadaoModule,
    // DocumentoModule,
    // AuditoriaModule,
    // ConfiguracaoModule
  ],
  controllers: [
    PagamentoController,
    ComprovanteController,
    ConfirmacaoController
  ],
  providers: [
    // Serviços principais
    PagamentoService,
    ComprovanteService,
    ConfirmacaoService,
    
    // Serviços de integração
    AuditoriaPagamentoService,
    IntegracaoSolicitacaoService,
    IntegracaoDocumentoService,
    IntegracaoCidadaoService,
    
    // Validadores
    PixValidator,
    StatusTransitionValidator,
    DadosBancariosValidator
  ],
  exports: [
    TypeOrmModule,
    
    // Serviços principais
    PagamentoService,
    ComprovanteService,
    ConfirmacaoService,
    
    // Serviços de integração
    AuditoriaPagamentoService,
    IntegracaoSolicitacaoService,
    IntegracaoDocumentoService,
    IntegracaoCidadaoService,
    
    // Validadores
    PixValidator,
    DadosBancariosValidator,
    StatusTransitionValidator
  ]
})
export class PagamentoModule {}
