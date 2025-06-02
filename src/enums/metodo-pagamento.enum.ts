/**
 * Enum que define os possíveis métodos de pagamento disponíveis no sistema.
 * Representa as diferentes formas de transferência de valores para os beneficiários.
 */
export enum MetodoPagamentoEnum {
  /**
   * Pagamento via PIX - sistema de pagamentos instantâneos brasileiro.
   */
  PIX = 'pix',
  
  /**
   * Pagamento via depósito bancário tradicional.
   */
  DEPOSITO = 'deposito',
  
  /**
   * Pagamento presencial, geralmente realizado na unidade da SEMTAS.
   */
  PRESENCIAL = 'presencial',
  
  /**
   * Pagamento via Documento de Crédito (DOC).
   */
  DOC = 'doc'
}
