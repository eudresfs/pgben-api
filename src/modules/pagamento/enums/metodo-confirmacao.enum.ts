/**
 * Enum que define os possíveis métodos de confirmação de recebimento de pagamento.
 * Representa as diferentes formas pelas quais um beneficiário pode confirmar o recebimento do benefício.
 */
export enum MetodoConfirmacaoEnum {
  /**
   * Confirmação por assinatura física em documento impresso.
   */
  ASSINATURA = 'assinatura',
  
  /**
   * Confirmação digital, realizada através de sistema eletrônico (app, portal, etc).
   */
  DIGITAL = 'digital',
  
  /**
   * Confirmação realizada por terceiro autorizado a receber em nome do beneficiário.
   */
  TERCEIRIZADO = 'terceirizado'
}
