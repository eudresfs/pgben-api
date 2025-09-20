/**
 * Enum que define os tipos de documentos comprobatórios aceitos
 * para registro de resultado de benefício cessado.
 * 
 * Baseado na Lei de Benefícios Eventuais do SUAS (Lei nº 8.742/1993)
 * e regulamentações do Conselho Nacional de Assistência Social (CNAS).
 * 
 * Os tipos contemplam as principais categorias de provas sociais
 * necessárias para documentar adequadamente o encerramento de benefícios.
 */
export enum TipoDocumentoComprobatorio {
  /** 
   * Fotografias que comprovem a situação atual da família
   * Ex: condições de moradia, situação de trabalho, etc.
   */
  FOTOGRAFIA = 'FOTOGRAFIA',

  /** 
   * Documentos pessoais da família beneficiária
   * Ex: RG, CPF, certidões, etc.
   */
  DOCUMENTO_PESSOAL = 'DOCUMENTO_PESSOAL',

  /** 
   * Comprovantes de renda atual da família
   * Ex: contracheques, declarações de trabalho, etc.
   */
  COMPROVANTE_RENDA = 'COMPROVANTE_RENDA',

  /** 
   * Comprovantes de residência atualizados
   * Ex: contas de luz, água, contrato de aluguel, etc.
   */
  COMPROVANTE_RESIDENCIA = 'COMPROVANTE_RESIDENCIA',

  /** 
   * Relatórios técnicos de acompanhamento social
   * Elaborados pela equipe técnica do SUAS
   */
  RELATORIO_TECNICO = 'RELATORIO_TECNICO',

  /** 
   * Declarações de terceiros sobre a situação da família
   * Ex: vizinhos, líderes comunitários, etc.
   */
  DECLARACAO_TERCEIROS = 'DECLARACAO_TERCEIROS',

  /** 
   * Laudos médicos ou psicológicos relevantes
   * Quando aplicável à situação de vulnerabilidade
   */
  LAUDO_MEDICO = 'LAUDO_MEDICO',

  /** 
   * Comprovantes de matrícula escolar dos filhos
   * Demonstra continuidade do acompanhamento educacional
   */
  COMPROVANTE_ESCOLAR = 'COMPROVANTE_ESCOLAR',

  /** 
   * Documentos de programas sociais
   * Ex: cartão do Bolsa Família, CadÚnico, etc.
   */
  DOCUMENTO_PROGRAMA_SOCIAL = 'DOCUMENTO_PROGRAMA_SOCIAL',

  /** 
   * Atas de reuniões ou assembleias comunitárias
   * Quando relevantes para o caso
   */
  ATA_REUNIAO = 'ATA_REUNIAO',

  /** 
   * Outros documentos não categorizados
   * Para casos específicos não contemplados
   */
  OUTROS = 'OUTROS',
}