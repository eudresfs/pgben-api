/**
 * Enum para orientação do documento
 */
export enum PdfOrientacao {
  /**
   * Orientação retrato (vertical)
   */
  RETRATO = 'portrait',

  /**
   * Orientação paisagem (horizontal)
   */
  PAISAGEM = 'landscape'
}

/**
 * Enum para tamanho do papel
 */
export enum PdfTamanhoPapel {
  /**
   * Tamanho A4 (210 x 297 mm)
   */
  A4 = 'A4',

  /**
   * Tamanho A3 (297 x 420 mm)
   */
  A3 = 'A3',

  /**
   * Tamanho Letter (216 x 279 mm)
   */
  LETTER = 'Letter'
}

/**
 * Enum para tipos de template
 */
export enum PdfTipoTemplate {
  /**
   * Template padrão do sistema
   */
  PADRAO = 'padrao',

  /**
   * Template para relatórios
   */
  RELATORIO = 'relatorio',

  /**
   * Template para documentos oficiais
   */
  DOCUMENTO = 'documento',

  /**
   * Template para comprovantes
   */
  COMPROVANTE = 'comprovante',

  /**
   * Template para cesta básica
   */
  CESTA_BASICA = 'cesta_basica',

  /**
   * Template para aluguel social
   */
  ALUGUEL_SOCIAL = 'aluguel_social'
}