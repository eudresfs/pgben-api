/**
 * Enum para tipos de assinatura no PDF
 */
export enum PdfTipoAssinatura {
  /**
   * Assinatura da secretária
   */
  SECRETARIA = 'secretaria',

  /**
   * Assinatura do coordenador de benefícios
   */
  COORDENADOR_BENEFICIOS = 'coordenador_beneficios',

  /**
   * Assinatura do coordenador da unidade
   */
  COORDENADOR_UNIDADE = 'coordenador_unidade',

  /**
   * Assinatura do técnico responsável
   */
  TECNICO_RESPONSAVEL = 'tecnico_responsavel',

  /**
   * Assinatura do beneficiário
   */
  BENEFICIARIO = 'beneficiario',

  /**
   * Assinatura do requerente
   */
  REQUERENTE = 'requerente',

  /**
   * Assinatura de testemunha
   */
  TESTEMUNHA = 'testemunha',

  /**
   * Assinatura do locador
   */
  LOCADOR = 'locador',
}