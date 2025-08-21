/**
 * Enum para representar os diferentes status de um agendamento de visita domiciliar.
 * 
 * @description
 * Define os possíveis estados pelos quais um agendamento pode passar durante seu ciclo de vida,
 * desde a criação até a execução ou cancelamento.
 * 
 * @author Sistema PGBEN
 * @since 2025-01-15
 */
export enum StatusAgendamento {
  /**
   * Agendamento criado mas ainda não confirmado
   */
  AGENDADO = 'agendado',

  /**
   * Agendamento confirmado pelo técnico responsável
   */
  CONFIRMADO = 'confirmado',

  /**
   * Agendamento foi reagendado para nova data/hora
   */
  REAGENDADO = 'reagendado',

  /**
   * Agendamento foi cancelado
   */
  CANCELADO = 'cancelado',

  /**
   * Visita foi realizada com sucesso
   */
  REALIZADO = 'realizado',

  /**
   * Visita não foi realizada (beneficiário ausente, etc.)
   */
  NAO_REALIZADO = 'nao_realizado',

  /**
   * Visita pendente de execução
   */
  PENDENTE = 'pendente'
}

/**
 * Mapeamento de status para descrições legíveis
 */
export const STATUS_AGENDAMENTO_LABELS = {
  [StatusAgendamento.AGENDADO]: 'Agendado',
  [StatusAgendamento.CONFIRMADO]: 'Confirmado',
  [StatusAgendamento.REAGENDADO]: 'Reagendado',
  [StatusAgendamento.CANCELADO]: 'Cancelado',
  [StatusAgendamento.REALIZADO]: 'Realizado',
  [StatusAgendamento.NAO_REALIZADO]: 'Não Realizado',
  [StatusAgendamento.PENDENTE]: 'Pendente'
};

/**
 * Status que indicam que o agendamento está ativo
 */
export const STATUS_AGENDAMENTO_ATIVOS = [
  StatusAgendamento.AGENDADO,
  StatusAgendamento.CONFIRMADO,
  StatusAgendamento.REAGENDADO,
  StatusAgendamento.PENDENTE
];

/**
 * Status que indicam que o agendamento foi finalizado
 */
export const STATUS_AGENDAMENTO_FINALIZADOS = [
  StatusAgendamento.REALIZADO,
  StatusAgendamento.NAO_REALIZADO,
  StatusAgendamento.CANCELADO,
  StatusAgendamento.PENDENTE
];

/**
 * Verifica se um status indica que o agendamento está ativo
 * @param status Status a ser verificado
 * @returns true se o status indica agendamento ativo
 */
export function isStatusAgendamentoAtivo(status: StatusAgendamento): boolean {
  return STATUS_AGENDAMENTO_ATIVOS.includes(status);
}

/**
 * Verifica se um status indica que o agendamento foi finalizado
 * @param status Status a ser verificado
 * @returns true se o status indica agendamento finalizado
 */
export function isStatusAgendamentoFinalizado(status: StatusAgendamento): boolean {
  return STATUS_AGENDAMENTO_FINALIZADOS.includes(status);
}

/**
 * Obtém o rótulo legível de um status de agendamento
 * @param status Status a ser convertido
 * @returns Rótulo legível do status
 */
export function getStatusAgendamentoLabel(status: StatusAgendamento): string {
  return STATUS_AGENDAMENTO_LABELS[status] || status;
}