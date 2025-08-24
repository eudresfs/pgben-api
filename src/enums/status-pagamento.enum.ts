/**
 * Enum que define os possíveis status de um pagamento no sistema.
 * Representa os estados em que um pagamento pode estar durante seu ciclo de vida.
 */
export enum StatusPagamentoEnum {
  /**
   * Pagamento criado, mas ainda não agendado.
   */
  PENDENTE = 'pendente',

  /**
   * Pagamento agendado, mas ainda não liberado efetivamente.
   */
  AGENDADO = 'agendado',

  /**
   * Pagamento liberado para o beneficiário, mas ainda não pago.
   */
  LIBERADO = 'liberado',

  /**
   * Pagamento efetuado, mas ainda não concluído.
   */
  PAGO = 'pago',

  /**
   * Pagamento concluído com comprovante anexado.
   */
  CONFIRMADO = 'confirmado',

  /**
   * Pagamento recebido pelo beneficiário.
   */
  RECEBIDO = 'recebido',

  /**
   * Pagamento cancelado por algum motivo específico.
   */
  CANCELADO = 'cancelado',

  /**
   * Pagamento suspenso devido à suspensão da solicitação.
   */
  SUSPENSO = 'suspenso',

  /**
   * Pagamento vencido por falta de documentação (específico para Aluguel Social).
   * Pode ser regularizado retroativamente em até 30 dias.
   */
  VENCIDO = 'vencido',

  /**
   * Pagamento vencido que foi regularizado.
   */
  REGULARIZADO = 'regularizado',
}
