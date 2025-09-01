/**
 * Definições de eventos para o módulo de Aprovação
 * 
 * Este arquivo define os tipos de eventos e suas interfaces de dados
 * para o sistema de notificações event-driven do módulo de aprovação.
 * 
 * @author Equipe PGBen
 */

/**
 * Enum com todos os tipos de eventos do módulo de Aprovação
 */
export enum AprovacaoEventType {
  // Eventos de criação e atribuição
  APROVACAO_CREATED = 'aprovacao.created',
  APROVACAO_ASSIGNED = 'aprovacao.assigned',
  APROVACAO_REASSIGNED = 'aprovacao.reassigned',

  // Eventos de decisão
  APROVACAO_APPROVED = 'aprovacao.approved',
  APROVACAO_REJECTED = 'aprovacao.rejected',
  APROVACAO_RETURNED = 'aprovacao.returned',
  APROVACAO_CANCELLED = 'aprovacao.cancelled',

  // Eventos de status
  APROVACAO_STATUS_CHANGED = 'aprovacao.status_changed',
  APROVACAO_IN_ANALYSIS = 'aprovacao.in_analysis',
  APROVACAO_PENDING_DOCUMENTS = 'aprovacao.pending_documents',
  APROVACAO_SUSPENDED = 'aprovacao.suspended',

  // Eventos de documentos
  DOCUMENTO_ATTACHED = 'aprovacao.documento_attached',
  DOCUMENTO_VALIDATED = 'aprovacao.documento_validated',
  DOCUMENTO_REJECTED = 'aprovacao.documento_rejected',
  DOCUMENTO_REQUESTED = 'aprovacao.documento_requested',

  // Eventos de prazos
  DEADLINE_APPROACHING = 'aprovacao.deadline_approaching',
  DEADLINE_EXPIRED = 'aprovacao.deadline_expired',
  DEADLINE_EXTENDED = 'aprovacao.deadline_extended',

  // Eventos de parecer
  PARECER_CREATED = 'aprovacao.parecer_created',
  PARECER_UPDATED = 'aprovacao.parecer_updated',
  PARECER_FINALIZED = 'aprovacao.parecer_finalized',

  // Eventos de recurso
  RECURSO_SUBMITTED = 'aprovacao.recurso_submitted',
  RECURSO_ANALYZED = 'aprovacao.recurso_analyzed',
  RECURSO_APPROVED = 'aprovacao.recurso_approved',
  RECURSO_REJECTED = 'aprovacao.recurso_rejected',

  // Eventos de auditoria
  AUDITORIA_REQUESTED = 'aprovacao.auditoria_requested',
  AUDITORIA_COMPLETED = 'aprovacao.auditoria_completed',
}

/**
 * Interface base para todos os eventos de aprovação
 */
export interface AprovacaoEvent {
  aprovacaoId: string;
  timestamp: Date;
  eventType: AprovacaoEventType;
  data: any;
}

/**
 * Dados do evento de criação de aprovação
 */
export interface AprovacaoCreatedEventData {
  solicitacaoId: string;
  tipoAprovacao: string;
  prioridade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  prazoAnalise: Date;
  usuarioCriadorId: string;
  observacao?: string;
}

/**
 * Dados do evento de atribuição de aprovação
 */
export interface AprovacaoAssignedEventData {
  aprovadorId: string;
  aprovadorNome: string;
  dataAtribuicao: Date;
  usuarioAtribuidorId: string;
  motivoAtribuicao?: string;
}

/**
 * Dados do evento de reatribuição de aprovação
 */
export interface AprovacaoReassignedEventData {
  aprovadorAnteriorId: string;
  aprovadorNovoId: string;
  aprovadorNovoNome: string;
  dataReatribuicao: Date;
  usuarioReatribuidorId: string;
  motivoReatribuicao: string;
}

/**
 * Dados do evento de aprovação aprovada
 */
export interface AprovacaoApprovedEventData {
  aprovadorId: string;
  dataAprovacao: Date;
  parecer: string;
  condicoes?: string[];
  valorAprovado?: number;
  observacaoAprovacao?: string;
}

/**
 * Dados do evento de aprovação rejeitada
 */
export interface AprovacaoRejectedEventData {
  aprovadorId: string;
  dataRejeicao: Date;
  motivoRejeicao: string;
  fundamentacaoLegal?: string;
  possibilidadeRecurso: boolean;
  observacaoRejeicao?: string;
}

/**
 * Dados do evento de aprovação devolvida
 */
export interface AprovacaoReturnedEventData {
  aprovadorId: string;
  dataRetorno: Date;
  motivoRetorno: string;
  documentosSolicitados?: string[];
  prazoRetorno: Date;
  observacaoRetorno?: string;
}

/**
 * Dados do evento de cancelamento de aprovação
 */
export interface AprovacaoCancelledEventData {
  usuarioCanceladorId: string;
  dataCancelamento: Date;
  motivoCancelamento: string;
  observacaoCancelamento?: string;
}

/**
 * Dados do evento de mudança de status
 */
export interface AprovacaoStatusChangedEventData {
  statusAnterior: string;
  statusAtual: string;
  dataAlteracao: Date;
  usuarioId: string;
  motivoMudanca?: string;
  observacao?: string;
}

/**
 * Dados do evento de aprovação em análise
 */
export interface AprovacaoInAnalysisEventData {
  aprovadorId: string;
  dataInicioAnalise: Date;
  prazoAnalise: Date;
  observacao?: string;
}

/**
 * Dados do evento de documentos pendentes
 */
export interface AprovacaoPendingDocumentsEventData {
  documentosPendentes: string[];
  prazoEntrega: Date;
  usuarioSolicitanteId: string;
  observacao?: string;
}

/**
 * Dados do evento de suspensão de aprovação
 */
export interface AprovacaoSuspendedEventData {
  usuarioSuspensorId: string;
  dataSuspensao: Date;
  motivoSuspensao: string;
  prazoSuspensao?: Date;
  observacaoSuspensao?: string;
}

/**
 * Dados do evento de anexação de documento
 */
export interface DocumentoAttachedEventData {
  documentoId: string;
  tipoDocumento: string;
  nomeArquivo: string;
  tamanhoArquivo: number;
  usuarioUploadId: string;
  dataUpload: Date;
  observacao?: string;
}

/**
 * Dados do evento de validação de documento
 */
export interface DocumentoValidatedEventData {
  documentoId: string;
  validadorId: string;
  dataValidacao: Date;
  resultadoValidacao: 'APROVADO' | 'REJEITADO' | 'PENDENTE';
  observacaoValidacao?: string;
}

/**
 * Dados do evento de rejeição de documento
 */
export interface DocumentoRejectedEventData {
  documentoId: string;
  validadorId: string;
  dataRejeicao: Date;
  motivoRejeicao: string;
  observacaoRejeicao?: string;
}

/**
 * Dados do evento de solicitação de documento
 */
export interface DocumentoRequestedEventData {
  tipoDocumento: string;
  descricaoDocumento: string;
  obrigatorio: boolean;
  prazoEntrega: Date;
  usuarioSolicitanteId: string;
  observacao?: string;
}

/**
 * Dados do evento de prazo próximo
 */
export interface DeadlineApproachingEventData {
  tipoPrazo: 'ANALISE' | 'RETORNO' | 'RECURSO' | 'SUSPENSAO';
  dataPrazo: Date;
  diasRestantes: number;
  observacao?: string;
}

/**
 * Dados do evento de prazo expirado
 */
export interface DeadlineExpiredEventData {
  tipoPrazo: 'ANALISE' | 'RETORNO' | 'RECURSO' | 'SUSPENSAO';
  dataPrazo: Date;
  diasAtraso: number;
  acaoAutomatica?: string;
  observacao?: string;
}

/**
 * Dados do evento de extensão de prazo
 */
export interface DeadlineExtendedEventData {
  tipoPrazo: 'ANALISE' | 'RETORNO' | 'RECURSO' | 'SUSPENSAO';
  prazoAnterior: Date;
  prazoNovo: Date;
  diasExtensao: number;
  usuarioExtensorId: string;
  motivoExtensao: string;
  observacao?: string;
}

/**
 * Dados do evento de criação de parecer
 */
export interface ParecerCreatedEventData {
  parecerId: string;
  autorId: string;
  tipoParecer: 'TECNICO' | 'JURIDICO' | 'SOCIAL';
  dataCriacao: Date;
  observacao?: string;
}

/**
 * Dados do evento de atualização de parecer
 */
export interface ParecerUpdatedEventData {
  parecerId: string;
  autorId: string;
  dataAtualizacao: Date;
  alteracoes: string[];
  observacao?: string;
}

/**
 * Dados do evento de finalização de parecer
 */
export interface ParecerFinalizedEventData {
  parecerId: string;
  autorId: string;
  dataFinalizacao: Date;
  conclusao: 'FAVORAVEL' | 'DESFAVORAVEL' | 'PARCIAL';
  observacao?: string;
}

/**
 * Dados do evento de submissão de recurso
 */
export interface RecursoSubmittedEventData {
  recursoId: string;
  requerenteId: string;
  dataSubmissao: Date;
  tipoRecurso: 'ADMINISTRATIVO' | 'JUDICIAL';
  fundamentacao: string;
  observacao?: string;
}

/**
 * Dados do evento de análise de recurso
 */
export interface RecursoAnalyzedEventData {
  recursoId: string;
  analisadorId: string;
  dataAnalise: Date;
  parecer: string;
  observacao?: string;
}

/**
 * Dados do evento de aprovação de recurso
 */
export interface RecursoApprovedEventData {
  recursoId: string;
  aprovadorId: string;
  dataAprovacao: Date;
  fundamentacao: string;
  observacao?: string;
}

/**
 * Dados do evento de rejeição de recurso
 */
export interface RecursoRejectedEventData {
  recursoId: string;
  rejeitadorId: string;
  dataRejeicao: Date;
  motivoRejeicao: string;
  fundamentacaoLegal?: string;
  observacao?: string;
}

/**
 * Dados do evento de solicitação de auditoria
 */
export interface AuditoriaRequestedEventData {
  auditoriaId: string;
  solicitanteId: string;
  dataSolicitacao: Date;
  tipoAuditoria: 'INTERNA' | 'EXTERNA' | 'COMPLIANCE';
  motivoAuditoria: string;
  observacao?: string;
}

/**
 * Dados do evento de conclusão de auditoria
 */
export interface AuditoriaCompletedEventData {
  auditoriaId: string;
  auditorId: string;
  dataConclusao: Date;
  resultado: 'CONFORME' | 'NAO_CONFORME' | 'PARCIAL';
  recomendacoes?: string[];
  observacao?: string;
}