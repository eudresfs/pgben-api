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
  FOTOGRAFIA = 'fotografia',

  /** 
   * Documentos pessoais da família beneficiária
   * Ex: RG, CPF, certidões, etc.
   */
  DOCUMENTO_PESSOAL = 'documento_pessoal',

  /** 
   * Comprovantes de renda atual da família
   * Ex: contracheques, declarações de trabalho, etc.
   */
  COMPROVANTE_RENDA = 'comprovante_renda',

  /** 
   * Comprovantes de residência atualizados
   * Ex: contas de luz, água, contrato de aluguel, etc.
   */
  COMPROVANTE_RESIDENCIA = 'comprovante_residencia',

  /** 
   * Relatórios técnicos de acompanhamento social
   * Elaborados pela equipe técnica do SUAS
   */
  RELATORIO_TECNICO = 'relatorio_tecnico',

  /** 
   * Declarações de terceiros sobre a situação da família
   * Ex: vizinhos, líderes comunitários, etc.
   */
  DECLARACAO_TERCEIROS = 'declaracao_terceiros',

  /** 
   * Laudos médicos ou psicológicos relevantes
   * Quando aplicável à situação de vulnerabilidade
   */
  LAUDO_MEDICO = 'laudo_medico',

  /** 
   * Comprovantes de matrícula escolar dos filhos
   * Demonstra continuidade do acompanhamento educacional
   */
  COMPROVANTE_ESCOLAR = 'comprovante_escolar',

  /** 
   * Documentos de programas sociais
   * Ex: cartão do Bolsa Família, CadÚnico, etc.
   */
  DOCUMENTO_PROGRAMA_SOCIAL = 'documento_programa_social',

  /** 
   * Atas de reuniões ou assembleias comunitárias
   * Quando relevantes para o caso
   */
  ATA_REUNIAO = 'ata_reuniao',

  /** 
   * Prova social - fotos e testemunhos do cidadão
   * Documentos que comprovem a situação social da família
   */
  PROVA_SOCIAL = 'prova_social',

  /** 
   * Documentação técnica - laudos, entrevistas e relatórios
   * Documentos técnicos elaborados pela equipe especializada
   */
  DOCUMENTACAO_TECNICA = 'documentacao_tecnica',

  /** 
   * Outros documentos não categorizados
   * Para casos específicos não contemplados
   */
  OUTROS = 'outros',
}