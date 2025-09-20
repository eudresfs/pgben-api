/**
 * Enum que define os motivos de encerramento de benefícios eventuais.
 * 
 * Baseado na Lei de Benefícios Eventuais do SUAS (Lei nº 8.742/1993)
 * e regulamentações do Conselho Nacional de Assistência Social (CNAS).
 * 
 * Os motivos contemplam as principais situações que levam ao
 * encerramento de benefícios eventuais no Sistema Único de Assistência Social.
 */
export enum MotivoEncerramentoBeneficio {
  /** 
   * Superação da vulnerabilidade social
   * Família conseguiu autonomia e não necessita mais do benefício
   */
  SUPERACAO_VULNERABILIDADE = 'superacao_vulnerabilidade',

  /** 
   * Melhoria na situação socioeconômica
   * Aumento de renda ou melhoria nas condições de vida
   */
  MELHORIA_SOCIOECONOMICA = 'melhoria_socioeconomica',

  /** 
   * Inserção no mercado de trabalho
   * Beneficiário ou família conseguiu emprego formal
   */
  INSERCAO_TRABALHO = 'insercao_trabalho',

  /** 
   * Acesso a outros programas sociais
   * Família foi incluída em outros programas de transferência de renda
   */
  ACESSO_OUTROS_PROGRAMAS = 'acesso_outros_programas',

  /** 
   * Mudança de município
   * Família se mudou para outro município
   */
  MUDANCA_MUNICIPIO = 'mudanca_municipio',

  /** 
   * Não comparecimento para acompanhamento
   * Família não compareceu às atividades de acompanhamento obrigatórias
   */
  NAO_COMPARECIMENTO = 'nao_comparecimento',

  /** 
   * Descumprimento de condicionalidades
   * Família não cumpriu as condicionalidades estabelecidas
   */
  DESCUMPRIMENTO_CONDICIONALIDADES = 'descumprimento_condicionalidades',

  /** 
   * Informações incorretas ou fraudulentas
   * Descoberta de informações falsas na solicitação
   */
  INFORMACOES_INCORRETAS = 'informacoes_incorretas',

  /** 
   * Fim do período de vulnerabilidade temporária
   * Situação que motivou o benefício foi resolvida
   */
  FIM_PERIODO_VULNERABILIDADE = 'fim_periodo_vulnerabilidade',

  /** 
   * Óbito do beneficiário principal
   * Falecimento da pessoa que motivou o benefício
   */
  OBITO_BENEFICIARIO = 'obito_beneficiario',

  /** 
   * Solicitação da própria família
   * Família solicitou o encerramento do benefício
   */
  SOLICITACAO_FAMILIA = 'solicitacao_familia',

  /** 
   * Revisão técnica
   * Encerramento por decisão técnica após reavaliação
   */
  REVISAO_TECNICA = 'revisao_tecnica',

  AGRAVAMENTO_SITUACAO = 'agravamento_situacao',

  /** 
   * Outros motivos não categorizados
   * Para situações específicas não contempladas
   */
  OUTROS = 'outros',
}