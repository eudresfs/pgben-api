/**
 * Enumeração dos status de auditoria
 *
 * Define os possíveis status para registros de auditoria
 */
export enum StatusAuditoria {
  PENDENTE = 'pendente',
  PROCESSADO = 'processado',
  ERRO = 'erro',
  ARQUIVADO = 'arquivado',
  VERIFICADO = 'verificado',
  CORROMPIDO = 'corrompido'
}