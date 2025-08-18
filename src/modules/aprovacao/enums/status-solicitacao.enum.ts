/**
 * Enum para status de solicitação de aprovação
 * Versão expandida com status de execução automática
 */
export enum StatusSolicitacao {
  PENDENTE = 'pendente',
  APROVADA = 'aprovada', 
  REJEITADA = 'rejeitada',
  CANCELADA = 'cancelada',
  EXECUTADA = 'executada',
  ERRO_EXECUCAO = 'erro_execucao'
}