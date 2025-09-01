import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AprovacaoEvent,
  AprovacaoEventType,
  AprovacaoCreatedEventData,
  AprovacaoAssignedEventData,
  AprovacaoReassignedEventData,
  AprovacaoApprovedEventData,
  AprovacaoRejectedEventData,
  AprovacaoReturnedEventData,
  AprovacaoCancelledEventData,
  AprovacaoStatusChangedEventData,
  AprovacaoInAnalysisEventData,
  AprovacaoPendingDocumentsEventData,
  AprovacaoSuspendedEventData,
  DocumentoAttachedEventData,
  DocumentoValidatedEventData,
  DocumentoRejectedEventData,
  DocumentoRequestedEventData,
  DeadlineApproachingEventData,
  DeadlineExpiredEventData,
  DeadlineExtendedEventData,
  ParecerCreatedEventData,
  ParecerUpdatedEventData,
  ParecerFinalizedEventData,
  RecursoSubmittedEventData,
  RecursoAnalyzedEventData,
  RecursoApprovedEventData,
  RecursoRejectedEventData,
  AuditoriaRequestedEventData,
  AuditoriaCompletedEventData,
} from '../events/aprovacao-events';

/**
 * Serviço responsável por emitir eventos do módulo de Aprovação
 * 
 * Centraliza a emissão de eventos para o sistema de notificações event-driven,
 * garantindo consistência e rastreabilidade das operações de aprovação.
 * 
 * @author Equipe PGBen
 */
@Injectable()
export class AprovacaoEventosService {
  private readonly logger = new Logger(AprovacaoEventosService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Emite evento de criação de aprovação
   * @param aprovacaoId ID da aprovação
   * @param data Dados do evento
   */
  async emitirAprovacaoCriada(
    aprovacaoId: string,
    data: AprovacaoCreatedEventData,
  ): Promise<void> {
    const evento: AprovacaoEvent = {
      aprovacaoId,
      timestamp: new Date(),
      eventType: AprovacaoEventType.APROVACAO_CREATED,
      data,
    };

    this.logger.log(
      `Emitindo evento de criação de aprovação: ${aprovacaoId}`,
    );
    
    this.eventEmitter.emit(AprovacaoEventType.APROVACAO_CREATED, evento);
  }

  /**
   * Emite evento de atribuição de aprovação
   * @param aprovacaoId ID da aprovação
   * @param data Dados do evento
   */
  async emitirAprovacaoAtribuida(
    aprovacaoId: string,
    data: AprovacaoAssignedEventData,
  ): Promise<void> {
    const evento: AprovacaoEvent = {
      aprovacaoId,
      timestamp: new Date(),
      eventType: AprovacaoEventType.APROVACAO_ASSIGNED,
      data,
    };

    this.logger.log(
      `Emitindo evento de atribuição de aprovação: ${aprovacaoId}`,
    );
    
    this.eventEmitter.emit(AprovacaoEventType.APROVACAO_ASSIGNED, evento);
  }

  /**
   * Emite evento de reatribuição de aprovação
   * @param aprovacaoId ID da aprovação
   * @param data Dados do evento
   */
  async emitirAprovacaoReatribuida(
    aprovacaoId: string,
    data: AprovacaoReassignedEventData,
  ): Promise<void> {
    const evento: AprovacaoEvent = {
      aprovacaoId,
      timestamp: new Date(),
      eventType: AprovacaoEventType.APROVACAO_REASSIGNED,
      data,
    };

    this.logger.log(
      `Emitindo evento de reatribuição de aprovação: ${aprovacaoId}`,
    );
    
    this.eventEmitter.emit(AprovacaoEventType.APROVACAO_REASSIGNED, evento);
  }

  /**
   * Emite evento de aprovação aprovada
   * @param aprovacaoId ID da aprovação
   * @param data Dados do evento
   */
  async emitirAprovacaoAprovada(
    aprovacaoId: string,
    data: AprovacaoApprovedEventData,
  ): Promise<void> {
    const evento: AprovacaoEvent = {
      aprovacaoId,
      timestamp: new Date(),
      eventType: AprovacaoEventType.APROVACAO_APPROVED,
      data,
    };

    this.logger.log(
      `Emitindo evento de aprovação aprovada: ${aprovacaoId}`,
    );
    
    this.eventEmitter.emit(AprovacaoEventType.APROVACAO_APPROVED, evento);
  }

  /**
   * Emite evento de aprovação rejeitada
   * @param aprovacaoId ID da aprovação
   * @param data Dados do evento
   */
  async emitirAprovacaoRejeitada(
    aprovacaoId: string,
    data: AprovacaoRejectedEventData,
  ): Promise<void> {
    const evento: AprovacaoEvent = {
      aprovacaoId,
      timestamp: new Date(),
      eventType: AprovacaoEventType.APROVACAO_REJECTED,
      data,
    };

    this.logger.log(
      `Emitindo evento de aprovação rejeitada: ${aprovacaoId}`,
    );
    
    this.eventEmitter.emit(AprovacaoEventType.APROVACAO_REJECTED, evento);
  }

  /**
   * Emite evento de aprovação devolvida
   * @param aprovacaoId ID da aprovação
   * @param data Dados do evento
   */
  async emitirAprovacaoDevolvida(
    aprovacaoId: string,
    data: AprovacaoReturnedEventData,
  ): Promise<void> {
    const evento: AprovacaoEvent = {
      aprovacaoId,
      timestamp: new Date(),
      eventType: AprovacaoEventType.APROVACAO_RETURNED,
      data,
    };

    this.logger.log(
      `Emitindo evento de aprovação devolvida: ${aprovacaoId}`,
    );
    
    this.eventEmitter.emit(AprovacaoEventType.APROVACAO_RETURNED, evento);
  }

  /**
   * Emite evento de cancelamento de aprovação
   * @param aprovacaoId ID da aprovação
   * @param data Dados do evento
   */
  async emitirAprovacaoCancelada(
    aprovacaoId: string,
    data: AprovacaoCancelledEventData,
  ): Promise<void> {
    const evento: AprovacaoEvent = {
      aprovacaoId,
      timestamp: new Date(),
      eventType: AprovacaoEventType.APROVACAO_CANCELLED,
      data,
    };

    this.logger.log(
      `Emitindo evento de cancelamento de aprovação: ${aprovacaoId}`,
    );
    
    this.eventEmitter.emit(AprovacaoEventType.APROVACAO_CANCELLED, evento);
  }

  /**
   * Emite evento de mudança de status
   * @param aprovacaoId ID da aprovação
   * @param data Dados do evento
   */
  async emitirMudancaStatus(
    aprovacaoId: string,
    data: AprovacaoStatusChangedEventData,
  ): Promise<void> {
    const evento: AprovacaoEvent = {
      aprovacaoId,
      timestamp: new Date(),
      eventType: AprovacaoEventType.APROVACAO_STATUS_CHANGED,
      data,
    };

    this.logger.log(
      `Emitindo evento de mudança de status: ${aprovacaoId}`,
    );
    
    this.eventEmitter.emit(AprovacaoEventType.APROVACAO_STATUS_CHANGED, evento);
  }

  /**
   * Emite evento de aprovação em análise
   * @param aprovacaoId ID da aprovação
   * @param data Dados do evento
   */
  async emitirAprovacaoEmAnalise(
    aprovacaoId: string,
    data: AprovacaoInAnalysisEventData,
  ): Promise<void> {
    const evento: AprovacaoEvent = {
      aprovacaoId,
      timestamp: new Date(),
      eventType: AprovacaoEventType.APROVACAO_IN_ANALYSIS,
      data,
    };

    this.logger.log(
      `Emitindo evento de aprovação em análise: ${aprovacaoId}`,
    );
    
    this.eventEmitter.emit(AprovacaoEventType.APROVACAO_IN_ANALYSIS, evento);
  }

  /**
   * Emite evento de documentos pendentes
   * @param aprovacaoId ID da aprovação
   * @param data Dados do evento
   */
  async emitirDocumentosPendentes(
    aprovacaoId: string,
    data: AprovacaoPendingDocumentsEventData,
  ): Promise<void> {
    const evento: AprovacaoEvent = {
      aprovacaoId,
      timestamp: new Date(),
      eventType: AprovacaoEventType.APROVACAO_PENDING_DOCUMENTS,
      data,
    };

    this.logger.log(
      `Emitindo evento de documentos pendentes: ${aprovacaoId}`,
    );
    
    this.eventEmitter.emit(AprovacaoEventType.APROVACAO_PENDING_DOCUMENTS, evento);
  }

  /**
   * Emite evento de suspensão de aprovação
   * @param aprovacaoId ID da aprovação
   * @param data Dados do evento
   */
  async emitirAprovacaoSuspensa(
    aprovacaoId: string,
    data: AprovacaoSuspendedEventData,
  ): Promise<void> {
    const evento: AprovacaoEvent = {
      aprovacaoId,
      timestamp: new Date(),
      eventType: AprovacaoEventType.APROVACAO_SUSPENDED,
      data,
    };

    this.logger.log(
      `Emitindo evento de suspensão de aprovação: ${aprovacaoId}`,
    );
    
    this.eventEmitter.emit(AprovacaoEventType.APROVACAO_SUSPENDED, evento);
  }

  /**
   * Emite evento de anexação de documento
   * @param aprovacaoId ID da aprovação
   * @param data Dados do evento
   */
  async emitirDocumentoAnexado(
    aprovacaoId: string,
    data: DocumentoAttachedEventData,
  ): Promise<void> {
    const evento: AprovacaoEvent = {
      aprovacaoId,
      timestamp: new Date(),
      eventType: AprovacaoEventType.DOCUMENTO_ATTACHED,
      data,
    };

    this.logger.log(
      `Emitindo evento de anexação de documento: ${aprovacaoId}`,
    );
    
    this.eventEmitter.emit(AprovacaoEventType.DOCUMENTO_ATTACHED, evento);
  }

  /**
   * Emite evento de validação de documento
   * @param aprovacaoId ID da aprovação
   * @param data Dados do evento
   */
  async emitirDocumentoValidado(
    aprovacaoId: string,
    data: DocumentoValidatedEventData,
  ): Promise<void> {
    const evento: AprovacaoEvent = {
      aprovacaoId,
      timestamp: new Date(),
      eventType: AprovacaoEventType.DOCUMENTO_VALIDATED,
      data,
    };

    this.logger.log(
      `Emitindo evento de validação de documento: ${aprovacaoId}`,
    );
    
    this.eventEmitter.emit(AprovacaoEventType.DOCUMENTO_VALIDATED, evento);
  }

  /**
   * Emite evento de rejeição de documento
   * @param aprovacaoId ID da aprovação
   * @param data Dados do evento
   */
  async emitirDocumentoRejeitado(
    aprovacaoId: string,
    data: DocumentoRejectedEventData,
  ): Promise<void> {
    const evento: AprovacaoEvent = {
      aprovacaoId,
      timestamp: new Date(),
      eventType: AprovacaoEventType.DOCUMENTO_REJECTED,
      data,
    };

    this.logger.log(
      `Emitindo evento de rejeição de documento: ${aprovacaoId}`,
    );
    
    this.eventEmitter.emit(AprovacaoEventType.DOCUMENTO_REJECTED, evento);
  }

  /**
   * Emite evento de solicitação de documento
   * @param aprovacaoId ID da aprovação
   * @param data Dados do evento
   */
  async emitirDocumentoSolicitado(
    aprovacaoId: string,
    data: DocumentoRequestedEventData,
  ): Promise<void> {
    const evento: AprovacaoEvent = {
      aprovacaoId,
      timestamp: new Date(),
      eventType: AprovacaoEventType.DOCUMENTO_REQUESTED,
      data,
    };

    this.logger.log(
      `Emitindo evento de solicitação de documento: ${aprovacaoId}`,
    );
    
    this.eventEmitter.emit(AprovacaoEventType.DOCUMENTO_REQUESTED, evento);
  }

  /**
   * Emite evento de solicitação criada
   */
  async emitirEventoSolicitacaoCriada(
    solicitacao: any,
    solicitanteId: string,
    configuracao: any
  ): Promise<void> {
    this.eventEmitter.emit('solicitacao.criada', {
      solicitacao,
      solicitanteId,
      configuracao,
      timestamp: new Date()
    });
  }

  /**
   * Emite evento de solicitação aprovada
   */
  async emitirEventoSolicitacaoAprovada(
    solicitacao: any,
    aprovadorId: string,
    justificativa?: string
  ): Promise<void> {
    this.eventEmitter.emit('solicitacao.aprovada', {
      solicitacao,
      aprovadorId,
      justificativa,
      timestamp: new Date()
    });
  }

  /**
   * Emite evento de solicitação rejeitada
   */
  async emitirEventoSolicitacaoRejeitada(
    solicitacao: any,
    aprovadorId: string,
    justificativa?: string
  ): Promise<void> {
    this.eventEmitter.emit('solicitacao.rejeitada', {
      solicitacao,
      aprovadorId,
      justificativa,
      timestamp: new Date()
    });
  }

  /**
   * Emite evento de prazo próximo
   * @param aprovacaoId ID da aprovação
   * @param data Dados do evento
   */
  async emitirPrazoProximo(
    aprovacaoId: string,
    data: DeadlineApproachingEventData,
  ): Promise<void> {
    const evento: AprovacaoEvent = {
      aprovacaoId,
      timestamp: new Date(),
      eventType: AprovacaoEventType.DEADLINE_APPROACHING,
      data,
    };

    this.logger.log(
      `Emitindo evento de prazo próximo: ${aprovacaoId}`,
    );
    
    this.eventEmitter.emit(AprovacaoEventType.DEADLINE_APPROACHING, evento);
  }

  /**
   * Emite evento de prazo expirado
   * @param aprovacaoId ID da aprovação
   * @param data Dados do evento
   */
  async emitirPrazoExpirado(
    aprovacaoId: string,
    data: DeadlineExpiredEventData,
  ): Promise<void> {
    const evento: AprovacaoEvent = {
      aprovacaoId,
      timestamp: new Date(),
      eventType: AprovacaoEventType.DEADLINE_EXPIRED,
      data,
    };

    this.logger.log(
      `Emitindo evento de prazo expirado: ${aprovacaoId}`,
    );
    
    this.eventEmitter.emit(AprovacaoEventType.DEADLINE_EXPIRED, evento);
  }

  /**
   * Emite evento de extensão de prazo
   * @param aprovacaoId ID da aprovação
   * @param data Dados do evento
   */
  async emitirPrazoEstendido(
    aprovacaoId: string,
    data: DeadlineExtendedEventData,
  ): Promise<void> {
    const evento: AprovacaoEvent = {
      aprovacaoId,
      timestamp: new Date(),
      eventType: AprovacaoEventType.DEADLINE_EXTENDED,
      data,
    };

    this.logger.log(
      `Emitindo evento de extensão de prazo: ${aprovacaoId}`,
    );
    
    this.eventEmitter.emit(AprovacaoEventType.DEADLINE_EXTENDED, evento);
  }

  /**
   * Emite evento de criação de parecer
   * @param aprovacaoId ID da aprovação
   * @param data Dados do evento
   */
  async emitirParecerCriado(
    aprovacaoId: string,
    data: ParecerCreatedEventData,
  ): Promise<void> {
    const evento: AprovacaoEvent = {
      aprovacaoId,
      timestamp: new Date(),
      eventType: AprovacaoEventType.PARECER_CREATED,
      data,
    };

    this.logger.log(
      `Emitindo evento de criação de parecer: ${aprovacaoId}`,
    );
    
    this.eventEmitter.emit(AprovacaoEventType.PARECER_CREATED, evento);
  }

  /**
   * Emite evento de atualização de parecer
   * @param aprovacaoId ID da aprovação
   * @param data Dados do evento
   */
  async emitirParecerAtualizado(
    aprovacaoId: string,
    data: ParecerUpdatedEventData,
  ): Promise<void> {
    const evento: AprovacaoEvent = {
      aprovacaoId,
      timestamp: new Date(),
      eventType: AprovacaoEventType.PARECER_UPDATED,
      data,
    };

    this.logger.log(
      `Emitindo evento de atualização de parecer: ${aprovacaoId}`,
    );
    
    this.eventEmitter.emit(AprovacaoEventType.PARECER_UPDATED, evento);
  }

  /**
   * Emite evento de finalização de parecer
   * @param aprovacaoId ID da aprovação
   * @param data Dados do evento
   */
  async emitirParecerFinalizado(
    aprovacaoId: string,
    data: ParecerFinalizedEventData,
  ): Promise<void> {
    const evento: AprovacaoEvent = {
      aprovacaoId,
      timestamp: new Date(),
      eventType: AprovacaoEventType.PARECER_FINALIZED,
      data,
    };

    this.logger.log(
      `Emitindo evento de finalização de parecer: ${aprovacaoId}`,
    );
    
    this.eventEmitter.emit(AprovacaoEventType.PARECER_FINALIZED, evento);
  }

  /**
   * Emite evento de submissão de recurso
   * @param aprovacaoId ID da aprovação
   * @param data Dados do evento
   */
  async emitirRecursoSubmetido(
    aprovacaoId: string,
    data: RecursoSubmittedEventData,
  ): Promise<void> {
    const evento: AprovacaoEvent = {
      aprovacaoId,
      timestamp: new Date(),
      eventType: AprovacaoEventType.RECURSO_SUBMITTED,
      data,
    };

    this.logger.log(
      `Emitindo evento de submissão de recurso: ${aprovacaoId}`,
    );
    
    this.eventEmitter.emit(AprovacaoEventType.RECURSO_SUBMITTED, evento);
  }

  /**
   * Emite evento de análise de recurso
   * @param aprovacaoId ID da aprovação
   * @param data Dados do evento
   */
  async emitirRecursoAnalisado(
    aprovacaoId: string,
    data: RecursoAnalyzedEventData,
  ): Promise<void> {
    const evento: AprovacaoEvent = {
      aprovacaoId,
      timestamp: new Date(),
      eventType: AprovacaoEventType.RECURSO_ANALYZED,
      data,
    };

    this.logger.log(
      `Emitindo evento de análise de recurso: ${aprovacaoId}`,
    );
    
    this.eventEmitter.emit(AprovacaoEventType.RECURSO_ANALYZED, evento);
  }

  /**
   * Emite evento de aprovação de recurso
   * @param aprovacaoId ID da aprovação
   * @param data Dados do evento
   */
  async emitirRecursoAprovado(
    aprovacaoId: string,
    data: RecursoApprovedEventData,
  ): Promise<void> {
    const evento: AprovacaoEvent = {
      aprovacaoId,
      timestamp: new Date(),
      eventType: AprovacaoEventType.RECURSO_APPROVED,
      data,
    };

    this.logger.log(
      `Emitindo evento de aprovação de recurso: ${aprovacaoId}`,
    );
    
    this.eventEmitter.emit(AprovacaoEventType.RECURSO_APPROVED, evento);
  }

  /**
   * Emite evento de rejeição de recurso
   * @param aprovacaoId ID da aprovação
   * @param data Dados do evento
   */
  async emitirRecursoRejeitado(
    aprovacaoId: string,
    data: RecursoRejectedEventData,
  ): Promise<void> {
    const evento: AprovacaoEvent = {
      aprovacaoId,
      timestamp: new Date(),
      eventType: AprovacaoEventType.RECURSO_REJECTED,
      data,
    };

    this.logger.log(
      `Emitindo evento de rejeição de recurso: ${aprovacaoId}`,
    );
    
    this.eventEmitter.emit(AprovacaoEventType.RECURSO_REJECTED, evento);
  }

  /**
   * Emite evento de solicitação de auditoria
   * @param aprovacaoId ID da aprovação
   * @param data Dados do evento
   */
  async emitirAuditoriaSolicitada(
    aprovacaoId: string,
    data: AuditoriaRequestedEventData,
  ): Promise<void> {
    const evento: AprovacaoEvent = {
      aprovacaoId,
      timestamp: new Date(),
      eventType: AprovacaoEventType.AUDITORIA_REQUESTED,
      data,
    };

    this.logger.log(
      `Emitindo evento de solicitação de auditoria: ${aprovacaoId}`,
    );
    
    this.eventEmitter.emit(AprovacaoEventType.AUDITORIA_REQUESTED, evento);
  }

  /**
   * Emite evento de conclusão de auditoria
   * @param aprovacaoId ID da aprovação
   * @param data Dados do evento
   */
  async emitirAuditoriaConcluida(
    aprovacaoId: string,
    data: AuditoriaCompletedEventData,
  ): Promise<void> {
    const evento: AprovacaoEvent = {
      aprovacaoId,
      timestamp: new Date(),
      eventType: AprovacaoEventType.AUDITORIA_COMPLETED,
      data,
    };

    this.logger.log(
      `Emitindo evento de conclusão de auditoria: ${aprovacaoId}`,
    );
    
    this.eventEmitter.emit(AprovacaoEventType.AUDITORIA_COMPLETED, evento);
  }
}