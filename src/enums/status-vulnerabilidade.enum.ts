/**
 * Enum que define os possíveis status de vulnerabilidade social.
 * 
 * Baseado nos conceitos do Sistema Único de Assistência Social (SUAS)
 * e na tipificação nacional de serviços socioassistenciais.
 * 
 * Utilizado para avaliar a situação de vulnerabilidade das famílias
 * no momento do encerramento de benefícios eventuais.
 */
export enum StatusVulnerabilidade {
  /** 
   * Vulnerabilidade superada
   * Família conseguiu superar a situação de vulnerabilidade social
   */
  SUPERADA = 'SUPERADA',

  /** 
   * Vulnerabilidade em processo de superação
   * Família está em processo de superação, mas ainda necessita acompanhamento
   */
  EM_SUPERACAO = 'EM_SUPERACAO',

  /** 
   * Vulnerabilidade reduzida
   * Houve melhoria na situação, mas ainda existe algum grau de vulnerabilidade
   */
  REDUZIDA = 'REDUZIDA',

  /** 
   * Vulnerabilidade mantida
   * Situação de vulnerabilidade permanece inalterada
   */
  MANTIDA = 'MANTIDA',

  /** 
   * Vulnerabilidade agravada
   * Situação de vulnerabilidade se agravou durante o período do benefício
   */
  AGRAVADA = 'AGRAVADA',

  /** 
   * Vulnerabilidade temporariamente resolvida
   * Situação específica foi resolvida, mas pode haver outras vulnerabilidades
   */
  TEMPORARIAMENTE_RESOLVIDA = 'TEMPORARIAMENTE_RESOLVIDA',

  /** 
   * Necessita reavaliação
   * Situação requer nova avaliação técnica para definição adequada
   */
  NECESSITA_REAVALIACAO = 'NECESSITA_REAVALIACAO',
}