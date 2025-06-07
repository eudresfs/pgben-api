/**
 * Arquivo de índice para exportação dos serviços do módulo de pagamento
 * 
 * Este arquivo centraliza as exportações de todos os serviços relacionados
 * ao módulo de pagamento, facilitando a importação em outros módulos.
 * 
 * @author Equipe PGBen
 */

// Serviços principais
export { PagamentoService } from './pagamento.service';
export { ComprovanteService } from './comprovante.service';
export { ConfirmacaoService } from './confirmacao.service';
export { PagamentoMappingService } from './pagamento-mapping.service';
export { PagamentoResponseService } from './pagamento-response.service';
export { AuditoriaPagamentoService } from './auditoria-pagamento.service';

// Serviços de integração
export { IntegracaoSolicitacaoService } from './integracao-solicitacao.service';
export { IntegracaoCidadaoService } from './integracao-cidadao.service';
export { IntegracaoDocumentoService } from './integracao-documento.service';
export { IntegracaoAuditoriaService } from './integracao-auditoria.service';
export { IntegracaoNotificacaoService } from './integracao-notificacao.service';

// Serviços futuros (comentados até implementação)
// export { MetricasPagamentoService } from './metricas-pagamento.service';
// export { RelatorioPagamentoService } from './relatorio-pagamento.service';
// export { IntegracaoValidacaoBancariaService } from './integracao-validacao-bancaria.service';