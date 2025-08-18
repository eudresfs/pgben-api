/**
 * Enum para tipos de ação crítica
 * Inclui todos os tipos de ação que requerem aprovação no sistema
 */
export enum TipoAcaoCritica {
  CANCELAMENTO_SOLICITACAO = 'cancelamento_solicitacao',
  SUSPENSAO_BENEFICIO = 'suspensao_beneficio',
  ALTERACAO_DADOS_CRITICOS = 'alteracao_dados_criticos',
  EXCLUSAO_REGISTRO = 'exclusao_registro',
  APROVACAO_EMERGENCIAL = 'aprovacao_emergencial',
  APROVACAO_PAGAMENTO = 'aprovacao_pagamento',
  TRANSFERENCIA_BENEFICIO = 'transferencia_beneficio',
  REATIVACAO_BENEFICIO = 'reativacao_beneficio',
  ALTERACAO_VALOR_BENEFICIO = 'alteracao_valor_beneficio',
  ALTERACAO_STATUS_CONCESSAO = 'alteracao_status_concessao'
}