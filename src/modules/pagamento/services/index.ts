/**
 * Índice de exportações dos serviços do módulo de pagamento
 *
 * Centraliza todas as exportações dos serviços para facilitar importações
 * e manter organização do código após a consolidação da Fase 2.
 */

// Serviço principal consolidado
export { PagamentoWorkflowService } from './pagamento-workflow.service';

// Serviços especializados
export { PagamentoService } from './pagamento.service';
export { PagamentoValidationService } from './pagamento-validation.service';
export { ComprovanteService } from './comprovante.service';
export { ConfirmacaoService } from './confirmacao.service';
export { HistoricoPagamentoService } from './historico-pagamento.service';

// Re-exportações para compatibilidade (aliases)
export { PagamentoWorkflowService as PagamentoLiberacaoService } from './pagamento-workflow.service';
export { PagamentoWorkflowService as PagamentoMappingService } from './pagamento-workflow.service';
export { PagamentoWorkflowService as PagamentoResponseService } from './pagamento-workflow.service';
