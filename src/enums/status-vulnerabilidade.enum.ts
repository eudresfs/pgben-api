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
  SUPERADA = 'superada',

  /** 
   * Vulnerabilidade em processo de superação
   * Família está em processo de superação, mas ainda necessita acompanhamento
   */
  EM_SUPERACAO = 'em_superacao',

  /** 
   * Vulnerabilidade reduzida
   * Houve melhoria na situação, mas ainda existe algum grau de vulnerabilidade
   */
  REDUZIDA = 'reduzida',

  /** 
   * Vulnerabilidade mantida
   * Situação de vulnerabilidade permanece inalterada
   */
  MANTIDA = 'mantida',

  /** 
   * Vulnerabilidade agravada
   * Situação de vulnerabilidade se agravou durante o período do benefício
   */
  AGRAVADA = 'agravada',

  /** 
   * Vulnerabilidade temporariamente resolvida
   * Situação específica foi resolvida, mas pode haver outras vulnerabilidades
   */
  TEMPORARIAMENTE_RESOLVIDA = 'temporariamente_resolvida',

  /** 
   * Necessita reavaliação
   * Situação requer nova avaliação técnica para definição adequada
   */
  NECESSITA_REAVALIACAO = 'necessita_reavaliacao',
}