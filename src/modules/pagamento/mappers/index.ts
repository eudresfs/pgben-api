/**
 * Índice de exportações dos mappers do módulo de pagamento
 *
 * Centraliza todas as exportações dos mappers para facilitar importações
 * e manter organização do código.
 */

// Mapper unificado principal
export { PagamentoUnifiedMapper } from './pagamento-unified.mapper';

// Re-exportações para compatibilidade (aliases)
export { PagamentoUnifiedMapper as PagamentoMapper } from './pagamento-unified.mapper';
export { PagamentoUnifiedMapper as ComprovanteMapper } from './pagamento-unified.mapper';
export { PagamentoUnifiedMapper as ConfirmacaoMapper } from './pagamento-unified.mapper';

// Tipos e interfaces relacionadas
export type {} from // Tipos serão adicionados conforme necessário
'./pagamento-unified.mapper';
