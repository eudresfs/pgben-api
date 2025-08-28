/**
 * Enum para status do cidadão no sistema
 * Define os possíveis estados de um cidadão
 */
export enum StatusCidadao {
  /**
   * Cidadão ativo no sistema
   */
  ATIVO = 'ativo',

  /**
   * Cidadão inativo no sistema
   */
  INATIVO = 'inativo',

  /**
   * Cidadão com cadastro suspenso
   */
  SUSPENSO = 'suspenso',

  /**
   * Cidadão com cadastro bloqueado
   */
  BLOQUEADO = 'bloqueado',

  /**
   * Cidadão com cadastro pendente de validação
   */
  PENDENTE = 'pendente',

  /**
   * Cidadão falecido
   */
  FALECIDO = 'falecido',
}