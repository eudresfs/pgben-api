/**
 * Enum para tipos de translado do benefício funeral
 * 
 * Define os tipos de translado disponíveis para o benefício funeral,
 * incluindo passagem pelo SVO (Serviço de Verificação de Óbitos) e ITEP
 * (Instituto Técnico-Científico de Perícia).
 */
export enum TransladoEnum {
  /**
   * Translado passando pelo Serviço de Verificação de Óbitos
   */
  SVO = 'svo',

  /**
   * Translado passando pelo Instituto Técnico-Científico de Perícia
   */
  ITEP = 'itep',

  /**
   * Translado não necessário
   */
  NAO_NECESSARIO = 'nao_necessario',
}