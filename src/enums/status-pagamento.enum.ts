/**
 * Enum que define os possíveis status de um pagamento no sistema.
 * Representa os estados em que um pagamento pode estar durante seu ciclo de vida.
 */
export enum StatusPagamentoEnum {
  /**
   * Pagamento agendado, mas ainda não liberado efetivamente.
   */
  PENDENTE = 'pendente',

  /**
   * Pagamento agendado, mas ainda não liberado efetivamente.
   */
  AGENDADO = 'agendado',

  /**
   * Pagamento liberado para o beneficiário, mas ainda não confirmado o recebimento.
   */
  LIBERADO = 'liberado',

  /**
   * Pagamento confirmado como recebido pelo beneficiário.
   */
  CONFIRMADO = 'confirmado',

  /**
   * Pagamento cancelado por algum motivo específico.
   */
  CANCELADO = 'cancelado',
}
