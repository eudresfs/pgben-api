/**
 * Enum para tipos de feedback
 * Define os tipos de feedback que podem ser enviados pelos usuários
 */
export enum TipoFeedbackEnum {
  SUGESTAO = 'sugestao',
  RECLAMACAO = 'reclamacao',
  ELOGIO = 'elogio',
  BUG = 'bug',
  MELHORIA = 'melhoria'
}

/**
 * Labels para exibição dos tipos de feedback
 */
export const TipoFeedbackLabels = {
  [TipoFeedbackEnum.SUGESTAO]: 'Sugestão',
  [TipoFeedbackEnum.RECLAMACAO]: 'Reclamação',
  [TipoFeedbackEnum.ELOGIO]: 'Elogio',
  [TipoFeedbackEnum.BUG]: 'Relatório de Bug',
  [TipoFeedbackEnum.MELHORIA]: 'Solicitação de Melhoria'
};

/**
 * Descrições dos tipos de feedback
 */
export const TipoFeedbackDescricoes = {
  [TipoFeedbackEnum.SUGESTAO]: 'Sugestões para melhorar o sistema',
  [TipoFeedbackEnum.RECLAMACAO]: 'Reclamações sobre problemas ou insatisfações',
  [TipoFeedbackEnum.ELOGIO]: 'Elogios e comentários positivos',
  [TipoFeedbackEnum.BUG]: 'Relatórios de bugs e problemas técnicos',
  [TipoFeedbackEnum.MELHORIA]: 'Solicitações de novas funcionalidades ou melhorias'
};