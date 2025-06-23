/**
 * Enum que define os possíveis status de uma Concessão (benefício ativo).
 */
export enum StatusConcessao {
  /** Benefício criado, aguardando ativação */
  PENDENTE = 'pendente',

  /** Benefício ativo/liberado para o cidadão */
  CONCEDIDA = 'concedido',

  /** Benefício temporariamente suspenso */
  SUSPENSA = 'suspenso',

  /** Benefício bloqueado por descumprimento de regra */
  BLOQUEADA = 'bloqueado',

  /** Benefício encerrado (fim de prazo, óbito, etc.) */
  ENCERRADA = 'encerrado',

  /** Benefício cancelado pelo cidadão */
  CANCELADA = 'cancelado',
}
