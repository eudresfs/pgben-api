import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  PagamentoEvent,
  PagamentoEventType,
  PagamentoCreatedEventData,
  PagamentoProcessedEventData,
  PagamentoFailedEventData,
  PagamentoStatusChangedEventData,
  PagamentoApprovedEventData,
  PagamentoRejectedEventData,
  PagamentoCancelledEventData,
  ComprovanteUploadedEventData,
  ComprovanteValidatedEventData,
  ComprovanteRejectedEventData,
  DeadlineApproachingEventData,
  DeadlineExpiredEventData,
  EstornoRequestedEventData,
  EstornoProcessedEventData,
  EstornoFailedEventData,
  LoteCreatedEventData,
  LoteProcessedEventData,
  LoteFailedEventData,
} from '../events/pagamento-events';

/**
 * Serviço responsável por emitir eventos do módulo de Pagamento
 * 
 * Centraliza a emissão de eventos para manter consistência e facilitar manutenção.
 * Todos os services do módulo devem usar este serviço para emitir eventos.
 */
@Injectable()
export class PagamentoEventosService {
  private readonly logger = new Logger(PagamentoEventosService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Método privado para emitir eventos com log
   * @param event Evento a ser emitido
   */
  private emitEvent(event: PagamentoEvent): void {
    this.logger.log(
      `Emitindo evento ${event.type} para pagamento ${event.pagamentoId}`,
    );
    this.eventEmitter.emit(event.type, event);
  }

  /**
   * Emite evento de pagamento criado
   */
  async emitirEventoPagamentoCriado(
    data: PagamentoCreatedEventData,
  ): Promise<void> {
    const eventData: PagamentoEvent = {
      pagamentoId: data.concessaoId, // Usando concessaoId como identificador
      type: PagamentoEventType.PAGAMENTO_CREATED,
      timestamp: new Date(),
      data,
    };

    this.eventEmitter.emit('pagamento.criado', eventData);
    this.logger.log(`Evento de pagamento criado emitido para concessão ${data.concessaoId}`);
  }

  /**
   * Emite evento de processamento de pagamento
   * @param pagamentoId ID do pagamento
   * @param data Dados do evento
   */
  emitirPagamentoProcessado(
    pagamentoId: string,
    data: PagamentoProcessedEventData,
  ): void {
    const event: PagamentoEvent = {
      pagamentoId,
      type: PagamentoEventType.PAGAMENTO_PROCESSED,
      timestamp: new Date(),
      data,
    };
    this.emitEvent(event);
  }

  /**
   * Emite evento de liberação de pagamento
   * @param pagamentoId ID do pagamento
   * @param data Dados do evento
   */
  emitirPagamentoLiberado(
    pagamentoId: string,
    data: PagamentoProcessedEventData,
  ): void {
    const event: PagamentoEvent = {
      pagamentoId,
      type: PagamentoEventType.PAGAMENTO_PROCESSED,
      timestamp: new Date(),
      data,
    };
    this.emitEvent(event);
  }

  /**
   * Emite evento de confirmação de recebimento
   * @param pagamentoId ID do pagamento
   * @param data Dados do evento
   */
  emitirRecebimentoConfirmado(
    pagamentoId: string,
    data: PagamentoProcessedEventData,
  ): void {
    const event: PagamentoEvent = {
      pagamentoId,
      type: PagamentoEventType.PAGAMENTO_PROCESSED,
      timestamp: new Date(),
      data,
    };
    this.emitEvent(event);
  }

  /**
   * Emite evento de falha no pagamento
   * @param pagamentoId ID do pagamento
   * @param data Dados do evento
   */
  emitirPagamentoFalhado(
    pagamentoId: string,
    data: PagamentoFailedEventData,
  ): void {
    const event: PagamentoEvent = {
      pagamentoId,
      type: PagamentoEventType.PAGAMENTO_FAILED,
      timestamp: new Date(),
      data,
    };
    this.emitEvent(event);
  }

  /**
   * Emite evento de mudança de status
   */
  async emitirEventoStatusAtualizado(
    data: PagamentoStatusChangedEventData,
  ): Promise<void> {
    const eventData: PagamentoEvent = {
      pagamentoId: data.usuarioId, // Usando usuarioId como identificador temporário
      type: PagamentoEventType.PAGAMENTO_STATUS_CHANGED,
      timestamp: new Date(),
      data,
    };

    this.eventEmitter.emit('pagamento.status.atualizado', eventData);
    this.logger.log(
      `Evento de status atualizado emitido: ${data.statusAnterior} -> ${data.statusAtual}`,
    );
  }

  /**
   * Emite evento de aprovação de pagamento
   * @param pagamentoId ID do pagamento
   * @param data Dados do evento
   */
  emitirPagamentoAprovado(
    pagamentoId: string,
    data: PagamentoApprovedEventData,
  ): void {
    const event: PagamentoEvent = {
      pagamentoId,
      type: PagamentoEventType.PAGAMENTO_APPROVED,
      timestamp: new Date(),
      data,
    };
    this.emitEvent(event);
  }

  /**
   * Emite evento de rejeição de pagamento
   * @param pagamentoId ID do pagamento
   * @param data Dados do evento
   */
  emitirPagamentoRejeitado(
    pagamentoId: string,
    data: PagamentoRejectedEventData,
  ): void {
    const event: PagamentoEvent = {
      pagamentoId,
      type: PagamentoEventType.PAGAMENTO_REJECTED,
      timestamp: new Date(),
      data,
    };
    this.emitEvent(event);
  }

  /**
   * Emite evento de cancelamento de pagamento
   */
  async emitirEventoPagamentoCancelado(
    data: PagamentoCancelledEventData,
  ): Promise<void> {
    const eventData: PagamentoEvent = {
      pagamentoId: data.canceladoPorId, // Usando canceladoPorId como identificador temporário
      type: PagamentoEventType.PAGAMENTO_CANCELLED,
      timestamp: new Date(),
      data,
    };

    this.eventEmitter.emit('pagamento.cancelado', eventData);
    this.logger.log(`Evento de pagamento cancelado emitido`);
  }

  /**
   * Emite evento de upload de comprovante
   * @param pagamentoId ID do pagamento
   * @param data Dados do evento
   */
  emitirComprovanteUpload(
    pagamentoId: string,
    data: ComprovanteUploadedEventData,
  ): void {
    const event: PagamentoEvent = {
      pagamentoId,
      type: PagamentoEventType.COMPROVANTE_UPLOADED,
      timestamp: new Date(),
      data,
    };
    this.emitEvent(event);
  }

  /**
   * Emite evento de validação de comprovante
   * @param pagamentoId ID do pagamento
   * @param data Dados do evento
   */
  emitirComprovanteValidado(
    pagamentoId: string,
    data: ComprovanteValidatedEventData,
  ): void {
    const event: PagamentoEvent = {
      pagamentoId,
      type: PagamentoEventType.COMPROVANTE_VALIDATED,
      timestamp: new Date(),
      data,
    };
    this.emitEvent(event);
  }

  /**
   * Emite evento de rejeição de comprovante
   * @param pagamentoId ID do pagamento
   * @param data Dados do evento
   */
  emitirComprovanteRejeitado(
    pagamentoId: string,
    data: ComprovanteRejectedEventData,
  ): void {
    const event: PagamentoEvent = {
      pagamentoId,
      type: PagamentoEventType.COMPROVANTE_REJECTED,
      timestamp: new Date(),
      data,
    };
    this.emitEvent(event);
  }

  /**
   * Emite evento de prazo próximo
   * @param pagamentoId ID do pagamento
   * @param data Dados do evento
   */
  emitirPrazoProximo(
    pagamentoId: string,
    data: DeadlineApproachingEventData,
  ): void {
    const event: PagamentoEvent = {
      pagamentoId,
      type: PagamentoEventType.DEADLINE_APPROACHING,
      timestamp: new Date(),
      data,
    };
    this.emitEvent(event);
  }

  /**
   * Emite evento de prazo expirado
   * @param pagamentoId ID do pagamento
   * @param data Dados do evento
   */
  emitirPrazoExpirado(
    pagamentoId: string,
    data: DeadlineExpiredEventData,
  ): void {
    const event: PagamentoEvent = {
      pagamentoId,
      type: PagamentoEventType.DEADLINE_EXPIRED,
      timestamp: new Date(),
      data,
    };
    this.emitEvent(event);
  }

  /**
   * Emite evento de solicitação de estorno
   * @param pagamentoId ID do pagamento
   * @param data Dados do evento
   */
  emitirEstornoSolicitado(
    pagamentoId: string,
    data: EstornoRequestedEventData,
  ): void {
    const event: PagamentoEvent = {
      pagamentoId,
      type: PagamentoEventType.ESTORNO_REQUESTED,
      timestamp: new Date(),
      data,
    };
    this.emitEvent(event);
  }

  /**
   * Emite evento de processamento de estorno
   * @param pagamentoId ID do pagamento
   * @param data Dados do evento
   */
  emitirEstornoProcessado(
    pagamentoId: string,
    data: EstornoProcessedEventData,
  ): void {
    const event: PagamentoEvent = {
      pagamentoId,
      type: PagamentoEventType.ESTORNO_PROCESSED,
      timestamp: new Date(),
      data,
    };
    this.emitEvent(event);
  }

  /**
   * Emite evento de falha no estorno
   * @param pagamentoId ID do pagamento
   * @param data Dados do evento
   */
  emitirEstornoFalhado(
    pagamentoId: string,
    data: EstornoFailedEventData,
  ): void {
    const event: PagamentoEvent = {
      pagamentoId,
      type: PagamentoEventType.ESTORNO_FAILED,
      timestamp: new Date(),
      data,
    };
    this.emitEvent(event);
  }

  /**
   * Emite evento de criação de lote
   * @param pagamentoId ID do pagamento (pode ser vazio para eventos de lote)
   * @param data Dados do evento
   */
  emitirLoteCriado(
    pagamentoId: string,
    data: LoteCreatedEventData,
  ): void {
    const event: PagamentoEvent = {
      pagamentoId,
      type: PagamentoEventType.LOTE_CREATED,
      timestamp: new Date(),
      data,
    };
    this.emitEvent(event);
  }

  /**
   * Emite evento de processamento de lote
   * @param pagamentoId ID do pagamento (pode ser vazio para eventos de lote)
   * @param data Dados do evento
   */
  emitirLoteProcessado(
    pagamentoId: string,
    data: LoteProcessedEventData,
  ): void {
    const event: PagamentoEvent = {
      pagamentoId,
      type: PagamentoEventType.LOTE_PROCESSED,
      timestamp: new Date(),
      data,
    };
    this.emitEvent(event);
  }

  /**
   * Emite evento de falha no lote
   * @param pagamentoId ID do pagamento (pode ser vazio para eventos de lote)
   * @param data Dados do evento
   */
  emitirLoteFalhado(
    pagamentoId: string,
    data: LoteFailedEventData,
  ): void {
    const event: PagamentoEvent = {
      pagamentoId,
      type: PagamentoEventType.LOTE_FAILED,
      timestamp: new Date(),
      data,
    };
    this.emitEvent(event);
  }
}