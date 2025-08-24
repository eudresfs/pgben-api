/**
 * Enumeração dos status de documento
 *
 * Define os possíveis status para documentos no sistema
 */
export enum StatusDocumento {
  PENDENTE = 'pendente',
  VALIDADO = 'validado',
  REJEITADO = 'rejeitado',
  PROCESSANDO = 'processando',
  ERRO = 'erro',
  ARQUIVADO = 'arquivado',
}
