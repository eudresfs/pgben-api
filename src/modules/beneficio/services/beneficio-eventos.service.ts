import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  BeneficioEvent,
  BeneficioEventType,
  ConcessaoCreatedEventData,
  ConcessaoStatusChangedEventData,
  ConcessaoSuspendedEventData,
  ConcessaoBlockedEventData,
  ConcessaoReactivatedEventData,
  ConcessaoExtendedEventData,
  ValidationCompletedEventData,
  ValidationFailedEventData,
  DocumentAttachedEventData,
  DocumentValidatedEventData,
  DocumentRejectedEventData,
  DeadlineApproachingEventData,
  DeadlineExpiredEventData,
} from '../events/beneficio-events';
import { Concessao } from '../../../entities';
import { StatusConcessao } from '../../../enums/status-concessao.enum';

/**
 * Serviço responsável por emitir eventos relacionados ao módulo de Benefício
 * Centraliza toda a lógica de emissão de eventos para manter consistência
 */
@Injectable()
export class BeneficioEventosService {
  private readonly logger = new Logger(BeneficioEventosService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Método privado para emitir eventos de forma centralizada
   * @param evento Evento a ser emitido
   */
  private emitirEvento(evento: BeneficioEvent): void {
    try {
      this.logger.debug(
        `Emitindo evento ${evento.type} para concessão ${evento.concessaoId}`,
      );
      this.eventEmitter.emit(evento.type, evento);
    } catch (error) {
      this.logger.error(
        `Erro ao emitir evento ${evento.type}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Emite evento de criação de concessão
   * @param concessao Concessão criada
   * @param usuarioCriadorId ID do usuário que criou a concessão
   */
  emitirEventoConcessaoCriada(
    concessao: Concessao,
    usuarioCriadorId: string,
  ): void {
    const eventData: ConcessaoCreatedEventData = {
      solicitacaoId: concessao.solicitacaoId,
      requerenteId: concessao.solicitacao.solicitante_id,
      tipoBeneficioId: concessao.solicitacao.tipo_beneficio_id,
      dataInicio: concessao.dataInicio,
      dataFim: concessao.dataEncerramento,
      valor: concessao.solicitacao.valor,
      usuarioCriadorId,
    };

    this.emitirEvento({
      type: BeneficioEventType.CONCESSAO_CREATED,
      concessaoId: concessao.id,
      timestamp: new Date(),
      data: eventData,
    });
  }

  /**
   * Emite evento de mudança de status de concessão
   * @param concessao Concessão com status alterado
   * @param statusAnterior Status anterior da concessão
   * @param usuarioId ID do usuário que alterou o status
   * @param observacao Observação sobre a alteração
   */
  emitirEventoMudancaStatus(
    concessao: Concessao,
    statusAnterior: StatusConcessao,
    usuarioId: string,
    observacao?: string,
  ): void {
    const eventData: ConcessaoStatusChangedEventData = {
      statusAnterior,
      statusAtual: concessao.status,
      usuarioId,
      observacao,
      dataAlteracao: new Date(),
    };

    this.emitirEvento({
      type: BeneficioEventType.CONCESSAO_STATUS_CHANGED,
      concessaoId: concessao.id,
      timestamp: new Date(),
      data: eventData,
    });

    // Emitir eventos específicos baseados no novo status
    this.emitirEventosEspecificosPorStatus(
      concessao,
      statusAnterior,
      usuarioId,
      observacao,
    );
  }

  /**
   * Emite evento de suspensão de concessão
   * @param concessao Concessão suspensa
   * @param motivoSuspensao Motivo da suspensão
   * @param usuarioId ID do usuário que suspendeu
   * @param observacao Observação sobre a suspensão
   * @param prazoReativacao Prazo para reativação
   */
  emitirEventoConcessaoSuspensa(
    concessao: Concessao,
    motivoSuspensao: string,
    usuarioId: string,
    observacao?: string,
    prazoReativacao?: Date,
  ): void {
    const eventData: ConcessaoSuspendedEventData = {
      motivoSuspensao,
      dataSuspensao: new Date(),
      usuarioId,
      observacao,
      prazoReativacao,
    };

    this.emitirEvento({
      type: BeneficioEventType.CONCESSAO_SUSPENDED,
      concessaoId: concessao.id,
      timestamp: new Date(),
      data: eventData,
    });
  }

  /**
   * Emite evento de bloqueio de concessão
   * @param concessao Concessão bloqueada
   * @param motivoBloqueio Motivo do bloqueio
   * @param usuarioId ID do usuário que bloqueou
   * @param observacao Observação sobre o bloqueio
   * @param determinacaoJudicial Se é por determinação judicial
   */
  emitirEventoConcessaoBloqueada(
    concessao: Concessao,
    motivoBloqueio: string,
    usuarioId: string,
    observacao?: string,
    determinacaoJudicial?: boolean,
  ): void {
    const eventData: ConcessaoBlockedEventData = {
      motivoBloqueio,
      dataBloqueio: new Date(),
      usuarioId,
      observacao,
      determinacaoJudicial,
    };

    this.emitirEvento({
      type: BeneficioEventType.CONCESSAO_BLOCKED,
      concessaoId: concessao.id,
      timestamp: new Date(),
      data: eventData,
    });
  }

  /**
   * Emite evento de reativação de concessão
   * @param concessao Concessão reativada
   * @param statusAnterior Status anterior da concessão
   * @param usuarioId ID do usuário que reativou
   * @param observacao Observação sobre a reativação
   */
  emitirEventoConcessaoReativada(
    concessao: Concessao,
    statusAnterior: StatusConcessao,
    usuarioId: string,
    observacao?: string,
  ): void {
    const eventData: ConcessaoReactivatedEventData = {
      dataReativacao: new Date(),
      usuarioId,
      observacao,
      statusAnterior,
    };

    this.emitirEvento({
      type: BeneficioEventType.CONCESSAO_REACTIVATED,
      concessaoId: concessao.id,
      timestamp: new Date(),
      data: eventData,
    });
  }

  /**
   * Emite evento de prorrogação de concessão
   * @param concessao Concessão prorrogada
   * @param dataFimAnterior Data fim anterior
   * @param motivoProrrogacao Motivo da prorrogação
   * @param usuarioId ID do usuário que prorrogou
   * @param observacao Observação sobre a prorrogação
   */
  emitirEventoConcessaoProrrogada(
    concessao: Concessao,
    dataFimAnterior: Date | undefined,
    motivoProrrogacao: string,
    usuarioId: string,
    observacao?: string,
  ): void {
    const eventData: ConcessaoExtendedEventData = {
      dataFimAnterior,
      novaDataFim: concessao.dataEncerramento!,
      motivoProrrogacao,
      usuarioId,
      observacao,
    };

    this.emitirEvento({
      type: BeneficioEventType.CONCESSAO_EXTENDED,
      concessaoId: concessao.id,
      timestamp: new Date(),
      data: eventData,
    });
  }

  /**
   * Emite evento de validação completada
   * @param concessaoId ID da concessão
   * @param tipoValidacao Tipo de validação
   * @param resultado Resultado da validação
   * @param validadorId ID do validador
   * @param observacao Observação sobre a validação
   */
  emitirEventoValidacaoCompletada(
    concessaoId: string,
    tipoValidacao: string,
    resultado: 'aprovado' | 'reprovado' | 'pendente',
    validadorId: string,
    observacao?: string,
  ): void {
    const eventData: ValidationCompletedEventData = {
      tipoValidacao,
      resultado,
      validadorId,
      observacao,
      dataValidacao: new Date(),
    };

    this.emitirEvento({
      type: BeneficioEventType.VALIDATION_COMPLETED,
      concessaoId,
      timestamp: new Date(),
      data: eventData,
    });
  }

  /**
   * Emite evento de validação falhada
   * @param concessaoId ID da concessão
   * @param tipoValidacao Tipo de validação
   * @param motivoFalha Motivo da falha
   * @param validadorId ID do validador
   * @param observacao Observação sobre a falha
   */
  emitirEventoValidacaoFalhada(
    concessaoId: string,
    tipoValidacao: string,
    motivoFalha: string,
    validadorId: string,
    observacao?: string,
  ): void {
    const eventData: ValidationFailedEventData = {
      tipoValidacao,
      motivoFalha,
      validadorId,
      observacao,
      dataFalha: new Date(),
    };

    this.emitirEvento({
      type: BeneficioEventType.VALIDATION_FAILED,
      concessaoId,
      timestamp: new Date(),
      data: eventData,
    });
  }

  /**
   * Emite evento de anexação de documento
   * @param concessaoId ID da concessão
   * @param documentoId ID do documento
   * @param tipoDocumento Tipo do documento
   * @param nomeArquivo Nome do arquivo
   * @param usuarioId ID do usuário que anexou
   * @param observacao Observação sobre a anexação
   */
  emitirEventoDocumentoAnexado(
    concessaoId: string,
    documentoId: string,
    tipoDocumento: string,
    nomeArquivo: string,
    usuarioId: string,
    observacao?: string,
  ): void {
    const eventData: DocumentAttachedEventData = {
      documentoId,
      tipoDocumento,
      nomeArquivo,
      usuarioId,
      observacao,
    };

    this.emitirEvento({
      type: BeneficioEventType.DOCUMENT_ATTACHED,
      concessaoId,
      timestamp: new Date(),
      data: eventData,
    });
  }

  /**
   * Emite evento de validação de documento
   * @param concessaoId ID da concessão
   * @param documentoId ID do documento
   * @param tipoDocumento Tipo do documento
   * @param resultado Resultado da validação
   * @param validadorId ID do validador
   * @param observacao Observação sobre a validação
   */
  emitirEventoDocumentoValidado(
    concessaoId: string,
    documentoId: string,
    tipoDocumento: string,
    resultado: 'aprovado' | 'reprovado',
    validadorId: string,
    observacao?: string,
  ): void {
    const eventData: DocumentValidatedEventData = {
      documentoId,
      tipoDocumento,
      resultado,
      validadorId,
      observacao,
      dataValidacao: new Date(),
    };

    this.emitirEvento({
      type: BeneficioEventType.DOCUMENT_VALIDATED,
      concessaoId,
      timestamp: new Date(),
      data: eventData,
    });
  }

  /**
   * Emite evento de rejeição de documento
   * @param concessaoId ID da concessão
   * @param documentoId ID do documento
   * @param tipoDocumento Tipo do documento
   * @param motivoRejeicao Motivo da rejeição
   * @param validadorId ID do validador
   * @param observacao Observação sobre a rejeição
   */
  emitirEventoDocumentoRejeitado(
    concessaoId: string,
    documentoId: string,
    tipoDocumento: string,
    motivoRejeicao: string,
    validadorId: string,
    observacao?: string,
  ): void {
    const eventData: DocumentRejectedEventData = {
      documentoId,
      tipoDocumento,
      motivoRejeicao,
      validadorId,
      observacao,
      dataRejeicao: new Date(),
    };

    this.emitirEvento({
      type: BeneficioEventType.DOCUMENT_REJECTED,
      concessaoId,
      timestamp: new Date(),
      data: eventData,
    });
  }

  /**
   * Emite evento de prazo próximo do vencimento
   * @param concessao Concessão com prazo próximo
   * @param tipoPrazo Tipo de prazo
   * @param diasRestantes Dias restantes até o vencimento
   * @param determinacaoJudicial Se é por determinação judicial
   */
  emitirEventoPrazoProximo(
    concessao: Concessao,
    tipoPrazo: 'concessao' | 'validacao' | 'documentos',
    diasRestantes: number,
    determinacaoJudicial?: boolean,
  ): void {
    let dataPrazo: Date;
    
    switch (tipoPrazo) {
      case 'concessao':
        dataPrazo = concessao.dataEncerramento!;
        break;
      default:
        // Para outros tipos de prazo, seria necessário buscar em outras entidades
        return;
    }

    const eventData: DeadlineApproachingEventData = {
      tipoPrazo,
      dataPrazo,
      diasRestantes,
      determinacaoJudicial,
    };

    this.emitirEvento({
      type: BeneficioEventType.DEADLINE_APPROACHING,
      concessaoId: concessao.id,
      timestamp: new Date(),
      data: eventData,
    });
  }

  /**
   * Emite evento de prazo expirado
   * @param concessao Concessão com prazo expirado
   * @param tipoPrazo Tipo de prazo
   * @param diasAtraso Dias de atraso desde o vencimento
   * @param determinacaoJudicial Se é por determinação judicial
   */
  emitirEventoPrazoExpirado(
    concessao: Concessao,
    tipoPrazo: 'concessao' | 'validacao' | 'documentos',
    diasAtraso: number,
    determinacaoJudicial?: boolean,
  ): void {
    let dataPrazo: Date;
    
    switch (tipoPrazo) {
      case 'concessao':
        dataPrazo = concessao.dataEncerramento!;
        break;
      default:
        // Para outros tipos de prazo, seria necessário buscar em outras entidades
        return;
    }

    const eventData: DeadlineExpiredEventData = {
      tipoPrazo,
      dataPrazo,
      diasAtraso,
      determinacaoJudicial,
    };

    this.emitirEvento({
      type: BeneficioEventType.DEADLINE_EXPIRED,
      concessaoId: concessao.id,
      timestamp: new Date(),
      data: eventData,
    });
  }

  /**
   * Emite eventos específicos baseados no status da concessão
   * @param concessao Concessão
   * @param statusAnterior Status anterior
   * @param usuarioId ID do usuário
   * @param observacao Observação
   */
  private emitirEventosEspecificosPorStatus(
    concessao: Concessao,
    statusAnterior: StatusConcessao,
    usuarioId: string,
    observacao?: string,
  ): void {
    switch (concessao.status) {
      case StatusConcessao.SUSPENSO:
        this.emitirEventoConcessaoSuspensa(
          concessao,
          observacao || 'Suspensão automática',
          usuarioId,
          observacao,
        );
        break;

      case StatusConcessao.BLOQUEADO:
        this.emitirEventoConcessaoBloqueada(
          concessao,
          observacao || 'Bloqueio automático',
          usuarioId,
          observacao,
        );
        break;

      case StatusConcessao.ATIVO:
        if (
          statusAnterior === StatusConcessao.SUSPENSO ||
          statusAnterior === StatusConcessao.BLOQUEADO
        ) {
          this.emitirEventoConcessaoReativada(
            concessao,
            statusAnterior,
            usuarioId,
            observacao,
          );
        }
        break;

      default:
        this.logger.log(
          `Status ${concessao.status} alterado para concessão ${concessao.id}`,
        );
        break;
    }
  }
}