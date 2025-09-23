/**
 * Enum que define os tipos de concessão de benefício
 * Diferencia entre concessões originais e renovações
 */
export enum TipoConcessaoEnum {
  /**
   * Concessão original de benefício
   * Primeira concessão deste tipo de benefício para o cidadão
   */
  ORIGINAL = 'original',

  /**
   * Concessão de renovação de benefício
   * Renovação de um benefício já concedido anteriormente
   */
  RENOVACAO = 'renovacao',
}

/**
 * Mapeamento dos valores do enum para labels legíveis
 */
export const TipoConcessaoLabels = {
  [TipoConcessaoEnum.ORIGINAL]: 'Original',
  [TipoConcessaoEnum.RENOVACAO]: 'Renovação',
} as const;

/**
 * Função utilitária para obter o label de um tipo de concessão
 * @param tipo - O tipo de concessão
 * @returns O label correspondente
 */
export function getTipoConcessaoLabel(tipo: TipoConcessaoEnum): string {
  return TipoConcessaoLabels[tipo];
}

/**
 * Função utilitária para verificar se um valor é um tipo de concessão válido
 * @param value - O valor a ser verificado
 * @returns True se o valor for um tipo de concessão válido
 */
export function isValidTipoConcessao(value: string): value is TipoConcessaoEnum {
  return Object.values(TipoConcessaoEnum).includes(value as TipoConcessaoEnum);
}