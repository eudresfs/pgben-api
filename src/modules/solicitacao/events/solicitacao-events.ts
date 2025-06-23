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
}

/**
 * Interface base para eventos de solicitação
 */
export interface SolicitacaoEvent {
  type: SolicitacaoEventType;
  solicitacaoId: string;
  timestamp: Date;
  data?: any;
}

/**
 * Evento emitido quando uma solicitação é criada
 */
export interface SolicitacaoCreatedEvent extends SolicitacaoEvent {
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
 * Evento emitido quando o status de uma solicitação é alterado
 */
export interface SolicitacaoStatusChangedEvent extends SolicitacaoEvent {
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
export interface SolicitacaoDeadlineApproachingEvent extends SolicitacaoEvent {
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
export interface SolicitacaoDeadlineExpiredEvent extends SolicitacaoEvent {
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
export interface SolicitacaoAssignedEvent extends SolicitacaoEvent {
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
export interface SolicitacaoApprovedEvent extends SolicitacaoEvent {
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
export interface SolicitacaoRejectedEvent extends SolicitacaoEvent {
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
  extends SolicitacaoEvent {
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
export interface SolicitacaoPendencyCreatedEvent extends SolicitacaoEvent {
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
export interface SolicitacaoPendencyResolvedEvent extends SolicitacaoEvent {
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
export interface SolicitacaoPendencyCancelledEvent extends SolicitacaoEvent {
  type: SolicitacaoEventType.PENDENCY_CANCELLED;
  data: {
    pendenciaId: string;
    motivo: string;
    usuarioId: string;
  };
}

/**
 * Tipo união que representa todos os possíveis eventos de solicitação
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
