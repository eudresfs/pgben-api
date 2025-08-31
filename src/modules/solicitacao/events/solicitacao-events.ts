/**
 * Definição dos eventos relacionados a solicitações
 *
 * Este arquivo contém as interfaces e tipos para os eventos emitidos pelo módulo de solicitação.
 * Estes eventos são utilizados para comunicação assíncrona entre os diferentes componentes do sistema.
 */

import { StatusSolicitacao } from '../../../entities/solicitacao.entity';

/**
 * Tipos de eventos disponíveis no módulo de solicitação
 */
export enum SolicitacaoEventType {
  CREATED = 'solicitacao.created',
  UPDATED = 'solicitacao.updated',
  STATUS_CHANGED = 'solicitacao.status_changed',
  DEADLINE_APPROACHING = 'solicitacao.deadline_approaching',
  DEADLINE_EXPIRED = 'solicitacao.deadline_expired',
  ASSIGNED = 'solicitacao.assigned',
  APPROVED = 'solicitacao.approved',
  REJECTED = 'solicitacao.rejected',
  RELEASED = 'solicitacao.released',
  COMPLETED = 'solicitacao.completed',
  CANCELED = 'solicitacao.canceled',
  ARCHIVED = 'solicitacao.archived',
  JUDICIAL_DETERMINATION_ATTACHED = 'solicitacao.judicial_determination_attached',
  JUDICIAL_DETERMINATION_REMOVED = 'solicitacao.judicial_determination_removed',
  PENDENCY_CREATED = 'solicitacao.pendency_created',
  PENDENCY_RESOLVED = 'solicitacao.pendency_resolved',
  PENDENCY_CANCELLED = 'solicitacao.pendency_cancelled',
  // Novos eventos para centralização de notificações
  DRAFT_CREATED = 'solicitacao.draft_created',
  APPROVAL_PROCESSED = 'solicitacao.approval_processed',
  REJECTION_PROCESSED = 'solicitacao.rejection_processed',
  CANCELLATION_PROCESSED = 'solicitacao.cancellation_processed',
  ALL_PENDENCIES_RESOLVED = 'solicitacao.all_pendencies_resolved',
  // Eventos para monitoramento de aluguel social
  MONITORING_VISIT_REGISTERED = 'solicitacao.monitoring_visit_registered',
  MONITORING_VISIT_UPDATED = 'solicitacao.monitoring_visit_updated',
  MONITORING_PENDING = 'solicitacao.monitoring_pending',
  MONITORING_APPROACHING = 'solicitacao.monitoring_approaching',
}

/**
 * Interface base para eventos de solicitação
 */
export interface SolicitacaoEventBase {
  type: SolicitacaoEventType;
  solicitacaoId: string;
  timestamp: Date;
  data?: any;
}

/**
 * Evento emitido quando uma solicitação é criada
 */
export interface SolicitacaoCreatedEvent extends SolicitacaoEventBase {
  type: SolicitacaoEventType.CREATED;
  data: {
    protocolo: string;
    tipoBeneficioId: string;
    cidadaoId: string;
    tecnicoId: string;
    unidadeId: string;
  };
}

/**
 * Evento emitido quando uma solicitação é criada
 */
export interface SolicitacaoUpdatedEvent extends SolicitacaoEventBase {
  type: SolicitacaoEventType.UPDATED;
  data: {
    protocolo: string;
    tipoBeneficioId: string;
    cidadaoId: string;
    tecnicoId: string;
    unidadeId: string;
  };
}


/**
 * Evento emitido quando o status de uma solicitação é alterado
 */
export interface SolicitacaoStatusChangedEvent extends SolicitacaoEventBase {
  type: SolicitacaoEventType.STATUS_CHANGED;
  data: {
    statusAnterior: StatusSolicitacao;
    statusAtual: StatusSolicitacao;
    usuarioId: string;
    observacao?: string;
  };
}

/**
 * Evento emitido quando um prazo está próximo de expirar
 */
export interface SolicitacaoDeadlineApproachingEvent extends SolicitacaoEventBase {
  type: SolicitacaoEventType.DEADLINE_APPROACHING;
  data: {
    tipoPrazo: 'analise' | 'documentos' | 'processamento';
    dataPrazo: Date;
    diasRestantes: number;
    determinacaoJudicial: boolean;
  };
}

/**
 * Evento emitido quando um prazo expirou
 */
export interface SolicitacaoDeadlineExpiredEvent extends SolicitacaoEventBase {
  type: SolicitacaoEventType.DEADLINE_EXPIRED;
  data: {
    tipoPrazo: 'analise' | 'documentos' | 'processamento';
    dataPrazo: Date;
    diasAtraso: number;
    determinacaoJudicial: boolean;
  };
}

/**
 * Evento emitido quando uma solicitação é atribuída a um técnico
 */
export interface SolicitacaoAssignedEvent extends SolicitacaoEventBase {
  type: SolicitacaoEventType.ASSIGNED;
  data: {
    tecnicoAnteriorId?: string;
    tecnicoAtualId: string;
    usuarioAtribuicaoId: string;
    motivoAtribuicao?: string;
  };
}

/**
 * Evento emitido quando uma solicitação é aprovada
 */
export interface SolicitacaoApprovedEvent extends SolicitacaoEventBase {
  type: SolicitacaoEventType.APPROVED;
  data: {
    aprovadorId: string;
    observacao?: string;
    dataAprovacao: Date;
  };
}

/**
 * Evento emitido quando uma solicitação é indeferida
 */
export interface SolicitacaoRejectedEvent extends SolicitacaoEventBase {
  type: SolicitacaoEventType.REJECTED;
  data: {
    reprovadorId: string;
    motivoReprovacao: string;
    dataReprovacao: Date;
  };
}

// Evento SolicitacaoReleasedEvent removido - não existe mais no novo ciclo de vida simplificado
// No novo fluxo, APROVADA é um status final

/**
 * Evento emitido quando uma determinação judicial é anexada à solicitação
 */
export interface SolicitacaoJudicialDeterminationAttachedEvent
  extends SolicitacaoEventBase {
  type: SolicitacaoEventType.JUDICIAL_DETERMINATION_ATTACHED;
  data: {
    determinacaoJudicialId: string;
    usuarioId: string;
    observacao?: string;
  };
}

/**
 * Evento emitido quando uma pendência é criada
 */
export interface SolicitacaoPendencyCreatedEvent extends SolicitacaoEventBase {
  type: SolicitacaoEventType.PENDENCY_CREATED;
  data: {
    pendenciaId: string;
    descricao: string;
    prazo?: Date;
    usuarioId: string;
  };
}

/**
 * Evento emitido quando uma pendência é resolvida
 */
export interface SolicitacaoPendencyResolvedEvent extends SolicitacaoEventBase {
  type: SolicitacaoEventType.PENDENCY_RESOLVED;
  data: {
    pendenciaId: string;
    resolucao: string;
    usuarioId: string;
    dataResolucao: Date;
  };
}

/**
 * Evento emitido quando uma pendência é cancelada
 */
export interface SolicitacaoPendencyCancelledEvent extends SolicitacaoEventBase {
  type: SolicitacaoEventType.PENDENCY_CANCELLED;
  data: {
    pendenciaId: string;
    motivo: string;
    usuarioId: string;
  };
}

// Interfaces para dados de eventos básicos
export interface StatusChangedEventData {
  solicitacaoId: number;
  statusAnterior: string;
  statusAtual: string;
  usuarioId: number;
  observacao?: string;
  dataAlteracao: Date;
}

export interface DeadlineApproachingEventData {
  solicitacaoId: number;
  tipoPrazo: string;
  dataPrazo: Date;
  diasRestantes: number;
}

export interface DeadlineExpiredEventData {
  solicitacaoId: number;
  tipoPrazo: string;
  dataPrazo: Date;
  diasAtraso: number;
}

export interface AssignedEventData {
  solicitacaoId: number;
  tecnicoAnteriorId?: number;
  tecnicoAtualId: number;
  usuarioAtribuicaoId: number;
  motivoAtribuicao?: string;
}

export interface ApprovedEventData {
  solicitacaoId: number;
  aprovadorId: number;
  observacao?: string;
  dataAprovacao: Date;
}

export interface RejectedEventData {
  solicitacaoId: number;
  reprovadorId: number;
  motivoReprovacao: string;
  dataReprovacao: Date;
}

export interface ReleasedEventData {
  solicitacaoId: number;
  liberadoPorId: number;
  dataLiberacao: Date;
}

export interface CompletedEventData {
  solicitacaoId: number;
  completadoPorId: number;
  dataCompletacao: Date;
}

export interface CanceledEventData {
  solicitacaoId: number;
  canceladoPorId: number;
  motivoCancelamento?: string;
  dataCancelamento: Date;
}

export interface ArchivedEventData {
  solicitacaoId: number;
  arquivadoPorId: number;
  motivoArquivamento?: string;
  dataArquivamento: Date;
}

export interface JudicialDeterminationAttachedEventData {
  solicitacaoId: number;
  determinacaoJudicialId: number;
  usuarioId: number;
  observacao?: string;
}

export interface JudicialDeterminationRemovedEventData {
  solicitacaoId: number;
  determinacaoJudicialId: number;
  usuarioId: number;
  motivo?: string;
}

export interface PendencyCreatedEventData {
  solicitacaoId: number;
  pendenciaId: number;
  descricao: string;
  prazo?: Date;
  usuarioId: number;
}

export interface PendencyResolvedEventData {
  solicitacaoId: number;
  pendenciaId: number;
  resolucao: string;
  usuarioId: number;
  dataResolucao: Date;
}

export interface PendencyCancelledEventData {
  solicitacaoId: number;
  pendenciaId: number;
  motivo: string;
  usuarioId: number;
}

// Interfaces para novos eventos de notificação
export interface DraftCreatedEventData {
  solicitacaoId: number;
  protocolo: string;
  tecnicoId?: number;
  status: string;
  prioridade: string;
  dataCriacao: Date;
}

export interface ApprovalProcessedEventData {
  solicitacaoId: number;
  protocolo: string;
  aprovadorId: number;
  statusAnterior: string;
  statusAtual: string;
  observacao?: string;
  dataAprovacao: Date;
}

export interface RejectionProcessedEventData {
  solicitacaoId: number;
  protocolo: string;
  rejeitadoPorId: number;
  statusAnterior: string;
  statusAtual: string;
  motivoRejeicao: string;
  dataRejeicao: Date;
}

export interface CancellationProcessedEventData {
  solicitacaoId: number;
  protocolo: string;
  canceladoPorId: number;
  statusAnterior: string;
  statusAtual: string;
  motivoCancelamento?: string;
  dataCancelamento: Date;
}

export interface AllPendenciesResolvedEventData {
  solicitacaoId: number;
  protocolo: string;
  totalPendenciasResolvidas: number;
  dataResolucao: Date;
}

export interface MonitoringVisitRegisteredEventData {
  solicitacaoId: number;
  protocolo: string;
  visitaId: number;
  dataVisita: Date;
  tecnicoId: number;
  observacoes?: string;
}

export interface MonitoringVisitUpdatedEventData {
  solicitacaoId: number;
  protocolo: string;
  visitaId: number;
  dataVisita: Date;
  tecnicoId: number;
  observacoes?: string;
  atualizadoPorId: number;
  dataAtualizacao: Date;
}

export interface MonitoringPendingEventData {
  solicitacaoId: number;
  protocolo: string;
  dataLimiteVisita: Date;
  diasAtraso: number;
  tecnicoResponsavel?: number;
}

export interface MonitoringApproachingEventData {
  solicitacaoId: number;
  protocolo: string;
  dataProximaVisita: Date;
  diasRestantes: number;
  tecnicoResponsavel?: number;
}

/**
 * Union type para todos os eventos de solicitação
 */
export type SolicitacaoEventUnion =
  | SolicitacaoCreatedEvent
  | SolicitacaoStatusChangedEvent
  | SolicitacaoDeadlineApproachingEvent
  | SolicitacaoDeadlineExpiredEvent
  | SolicitacaoAssignedEvent
  | SolicitacaoApprovedEvent
  | SolicitacaoRejectedEvent
  | SolicitacaoJudicialDeterminationAttachedEvent
  | SolicitacaoPendencyCreatedEvent
  | SolicitacaoPendencyResolvedEvent
  | SolicitacaoPendencyCancelledEvent;

/**
 * Tipo união que representa todos os possíveis eventos de solicitação
 */
export type SolicitacaoEvent =
  | { type: SolicitacaoEventType.CREATED; data: SolicitacaoCreatedEvent }
  | { type: SolicitacaoEventType.UPDATED; data: SolicitacaoUpdatedEvent }
  | { type: SolicitacaoEventType.STATUS_CHANGED; data: StatusChangedEventData }
  | { type: SolicitacaoEventType.DEADLINE_APPROACHING; data: DeadlineApproachingEventData }
  | { type: SolicitacaoEventType.DEADLINE_EXPIRED; data: DeadlineExpiredEventData }
  | { type: SolicitacaoEventType.ASSIGNED; data: AssignedEventData }
  | { type: SolicitacaoEventType.APPROVED; data: ApprovedEventData }
  | { type: SolicitacaoEventType.REJECTED; data: RejectedEventData }
  | { type: SolicitacaoEventType.RELEASED; data: ReleasedEventData }
  | { type: SolicitacaoEventType.COMPLETED; data: CompletedEventData }
  | { type: SolicitacaoEventType.CANCELED; data: CanceledEventData }
  | { type: SolicitacaoEventType.ARCHIVED; data: ArchivedEventData }
  | { type: SolicitacaoEventType.JUDICIAL_DETERMINATION_ATTACHED; data: JudicialDeterminationAttachedEventData }
  | { type: SolicitacaoEventType.JUDICIAL_DETERMINATION_REMOVED; data: JudicialDeterminationRemovedEventData }
  | { type: SolicitacaoEventType.PENDENCY_CREATED; data: PendencyCreatedEventData }
  | { type: SolicitacaoEventType.PENDENCY_RESOLVED; data: PendencyResolvedEventData }
  | { type: SolicitacaoEventType.PENDENCY_CANCELLED; data: PendencyCancelledEventData }
  // Novos eventos para centralização de notificações
  | { type: SolicitacaoEventType.DRAFT_CREATED; data: DraftCreatedEventData }
  | { type: SolicitacaoEventType.APPROVAL_PROCESSED; data: ApprovalProcessedEventData }
  | { type: SolicitacaoEventType.REJECTION_PROCESSED; data: RejectionProcessedEventData }
  | { type: SolicitacaoEventType.CANCELLATION_PROCESSED; data: CancellationProcessedEventData }
  | { type: SolicitacaoEventType.ALL_PENDENCIES_RESOLVED; data: AllPendenciesResolvedEventData }
  // Eventos para monitoramento de aluguel social
  | { type: SolicitacaoEventType.MONITORING_VISIT_REGISTERED; data: MonitoringVisitRegisteredEventData }
  | { type: SolicitacaoEventType.MONITORING_VISIT_UPDATED; data: MonitoringVisitUpdatedEventData }
  | { type: SolicitacaoEventType.MONITORING_PENDING; data: MonitoringPendingEventData }
  | { type: SolicitacaoEventType.MONITORING_APPROACHING; data: MonitoringApproachingEventData };
