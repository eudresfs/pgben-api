/**
 * Enum para prioridades de feedback
 * Define os níveis de prioridade que podem ser atribuídos aos feedbacks
 */
export enum PrioridadeFeedbackEnum {
  BAIXA = 'baixa',
  MEDIA = 'media',
  ALTA = 'alta',
  CRITICA = 'critica'
}

/**
 * Labels para exibição das prioridades
 */
export const PrioridadeFeedbackLabels = {
  [PrioridadeFeedbackEnum.BAIXA]: 'Baixa',
  [PrioridadeFeedbackEnum.MEDIA]: 'Média',
  [PrioridadeFeedbackEnum.ALTA]: 'Alta',
  [PrioridadeFeedbackEnum.CRITICA]: 'Crítica'
};

/**
 * Cores para exibição das prioridades
 */
export const PrioridadeFeedbackCores = {
  [PrioridadeFeedbackEnum.BAIXA]: '#28a745',
  [PrioridadeFeedbackEnum.MEDIA]: '#ffc107',
  [PrioridadeFeedbackEnum.ALTA]: '#fd7e14',
  [PrioridadeFeedbackEnum.CRITICA]: '#dc3545'
};

/**
 * Descrições das prioridades
 */
export const PrioridadeFeedbackDescricoes = {
  [PrioridadeFeedbackEnum.BAIXA]: 'Prioridade baixa - pode ser tratado quando houver tempo disponível',
  [PrioridadeFeedbackEnum.MEDIA]: 'Prioridade média - deve ser tratado em prazo razoável',
  [PrioridadeFeedbackEnum.ALTA]: 'Prioridade alta - deve ser tratado com urgência',
  [PrioridadeFeedbackEnum.CRITICA]: 'Prioridade crítica - requer atenção imediata'
};

/**
 * Ordem numérica das prioridades para ordenação
 */
export const PrioridadeFeedbackOrdem = {
  [PrioridadeFeedbackEnum.BAIXA]: 1,
  [PrioridadeFeedbackEnum.MEDIA]: 2,
  [PrioridadeFeedbackEnum.ALTA]: 3,
  [PrioridadeFeedbackEnum.CRITICA]: 4
};
