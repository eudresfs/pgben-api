/**
 * Enum que define os tipos de solicitação de benefício
 * Diferencia entre solicitações originais e renovações
 */
export enum TipoSolicitacaoEnum {
  /**
   * Solicitação original de benefício
   * Primeira vez que o cidadão solicita este tipo de benefício
   */
  ORIGINAL = 'original',

  /**
   * Solicitação de renovação de benefício
   * Renovação de um benefício já concedido anteriormente
   */
  RENOVACAO = 'renovacao',
}

/**
 * Mapeamento dos valores do enum para labels legíveis
 */
export const TipoSolicitacaoLabels = {
  [TipoSolicitacaoEnum.ORIGINAL]: 'Original',
  [TipoSolicitacaoEnum.RENOVACAO]: 'Renovação',
} as const;

/**
 * Função utilitária para obter o label de um tipo de solicitação
 * @param tipo - O tipo de solicitação
 * @returns O label correspondente
 */
export function getTipoSolicitacaoLabel(tipo: TipoSolicitacaoEnum): string {
  return TipoSolicitacaoLabels[tipo];
}

/**
 * Função utilitária para verificar se um valor é um tipo de solicitação válido
 * @param value - O valor a ser verificado
 * @returns True se o valor for um tipo de solicitação válido
 */
export function isValidTipoSolicitacao(value: string): value is TipoSolicitacaoEnum {
  return Object.values(TipoSolicitacaoEnum).includes(value as TipoSolicitacaoEnum);
}