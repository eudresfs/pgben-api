/**
 * Enum que define os possíveis status de uma solicitação de benefício
 */
export enum StatusSolicitacao {
  RASCUNHO = 'rascunho',
  PENDENTE = 'pendente',
  EM_ANALISE = 'em_analise',
  AGUARDANDO_DOCUMENTOS = 'aguardando_documentos',
  APROVADA = 'aprovada',
  INDEFERIDA = 'indeferida',
  LIBERADA = 'liberada',
  CANCELADA = 'cancelada',
  EM_PROCESSAMENTO = 'em_processamento',
  CONCLUIDA = 'concluida',
  ARQUIVADA = 'arquivada',
  ABERTA = 'aberta',
  BLOQUEADO = 'bloqueado',
  SUSPENSO = 'suspenso',
}
