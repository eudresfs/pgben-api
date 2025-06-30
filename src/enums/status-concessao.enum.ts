/**
 * Enum que define os possíveis status de uma Concessão (benefício ativo).
 */
export enum StatusConcessao {
  /** Benefício criado, aguardando ativação */
  APTO = 'apto',

  /** Benefício ativo/liberado para o cidadão */
  ATIVO = 'ativo',

  /** Benefício temporariamente suspenso */
  SUSPENSO = 'suspenso',

  /** Benefício bloqueado por descumprimento de regra */
  BLOQUEADO = 'bloqueado',

  /** Benefício encerrado (fim de prazo, óbito, etc.) */
  CESSADO = 'cessado',

  /** Benefício cancelado pelo cidadão */
  CANCELADO = 'cancelado',
}
