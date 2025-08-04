/**
 * Enum que define os tipos de contexto para o benefício de Auxílio Natalidade
 *
 * PRE_NATAL: Contexto antes do nascimento (gestação)
 * POS_NATAL: Contexto após o nascimento (recém-nascido até 30 dias)
 */
export enum TipoContextoNatalidade {
  /**
   * Contexto pré-natal - durante a gestação
   * Utiliza dados como data provável do parto, pré-natal, etc.
   */
  PRE_NATAL = 'pre_natal',

  /**
   * Contexto pós-natal - após o nascimento
   * Utiliza dados como data de nascimento, certidão, etc.
   * Limitado a 30 dias após o nascimento
   */
  POS_NATAL = 'pos_natal',
}
