/**
 * Enum que define os tipos de eventos que podem ser registrados no histórico de pagamentos
 * Cada evento representa uma ação específica realizada no ciclo de vida do pagamento
 */
export enum TipoEventoHistoricoEnum {
  /**
   * Criação inicial do pagamento
   */
  CRIACAO = 'criacao',

  /**
   * Alteração de status do pagamento
   */
  ALTERACAO_STATUS = 'alteracao_status',

  /**
   * Processamento do pagamento
   */
  PROCESSAMENTO = 'processamento',

  /**
   * Falha no processamento
   */
  FALHA = 'falha',

  /**
   * Aprovação do pagamento
   */
  APROVACAO = 'aprovacao',

  /**
   * Rejeição do pagamento
   */
  REJEICAO = 'rejeicao',

  /**
   * Cancelamento do pagamento
   */
  CANCELAMENTO = 'cancelamento',

  /**
   * Upload de comprovante
   */
  COMPROVANTE_UPLOAD = 'comprovante_upload',

  /**
   * Validação de comprovante
   */
  COMPROVANTE_VALIDACAO = 'comprovante_validacao',

  /**
   * Rejeição de comprovante
   */
  COMPROVANTE_REJEICAO = 'comprovante_rejeicao',

  /**
   * Invalidação de comprovante
   */
  COMPROVANTE_INVALIDACAO = 'comprovante_invalidacao',

  /**
   * Prazo próximo do vencimento
   */
  PRAZO_PROXIMO = 'prazo_proximo',

  /**
   * Prazo expirado
   */
  PRAZO_EXPIRADO = 'prazo_expirado',

  /**
   * Solicitação de estorno
   */
  ESTORNO_SOLICITADO = 'estorno_solicitado',

  /**
   * Processamento de estorno
   */
  ESTORNO_PROCESSADO = 'estorno_processado',

  /**
   * Falha no estorno
   */
  ESTORNO_FALHA = 'estorno_falha',

  /**
   * Criação de lote
   */
  LOTE_CRIADO = 'lote_criado',

  /**
   * Processamento de lote
   */
  LOTE_PROCESSADO = 'lote_processado',

  /**
   * Falha no lote
   */
  LOTE_FALHA = 'lote_falha',

  /** 
   * Evento não identificado
   */
  NAO_IDENTIFICADO = 'nao_identificado'
}