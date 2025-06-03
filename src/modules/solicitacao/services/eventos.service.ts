import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SolicitacaoEvent, SolicitacaoEventType, SolicitacaoEventUnion } from '../events/solicitacao-events';
import { Solicitacao, StatusSolicitacao } from '../../../entities/solicitacao.entity';

/**
 * Serviço responsável pelo gerenciamento de eventos do módulo de solicitação
 * 
 * Este serviço centraliza a emissão de eventos relacionados ao ciclo de vida das solicitações,
 * facilitando a comunicação assíncrona entre os diferentes componentes do sistema.
 */
@Injectable()
export class EventosService {
  private readonly logger = new Logger(EventosService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Emite um evento relacionado a uma solicitação
   * @param evento Evento a ser emitido
   */
  emitirEvento(evento: SolicitacaoEventUnion): void {
    try {
      this.logger.debug(`Emitindo evento: ${evento.type} - Solicitação ID: ${evento.solicitacaoId}`);
      
      // Define timestamp caso não tenha sido definido
      if (!evento.timestamp) {
        evento.timestamp = new Date();
      }
      
      // Emite o evento
      this.eventEmitter.emit(evento.type, evento);
      
      this.logger.debug(`Evento emitido com sucesso: ${evento.type}`);
    } catch (error) {
      this.logger.error(
        `Erro ao emitir evento ${evento.type}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Emite evento de criação de solicitação
   * @param solicitacao Solicitação criada
   */
  emitirEventoCriacao(solicitacao: Solicitacao): void {
    this.emitirEvento({
      type: SolicitacaoEventType.CREATED,
      solicitacaoId: solicitacao.id,
      timestamp: new Date(),
      data: {
        protocolo: solicitacao.protocolo,
        tipoBeneficioId: solicitacao.tipo_beneficio_id || '',
        cidadaoId: solicitacao.beneficiario?.id || '',
        tecnicoId: solicitacao.tecnico_id || '',
        unidadeId: solicitacao.unidade_id || '',
      },
    });
  }

  /**
   * Emite evento de alteração de status
   * @param solicitacao Solicitação alterada
   * @param statusAnterior Status anterior
   * @param usuarioId ID do usuário que realizou a alteração
   * @param observacao Observação sobre a alteração
   */
  emitirEventoAlteracaoStatus(
    solicitacao: Solicitacao,
    statusAnterior: StatusSolicitacao,
    usuarioId: string,
    observacao?: string,
  ): void {
    this.emitirEvento({
      type: SolicitacaoEventType.STATUS_CHANGED,
      solicitacaoId: solicitacao.id,
      timestamp: new Date(),
      data: {
        statusAnterior,
        statusAtual: solicitacao.status,
        usuarioId,
        observacao,
      },
    });

    // Emitir eventos específicos com base no novo status
    switch (solicitacao.status) {
      case StatusSolicitacao.APROVADA:
        this.emitirEvento({
          type: SolicitacaoEventType.APPROVED,
          solicitacaoId: solicitacao.id,
          timestamp: new Date(),
          data: {
            aprovadorId: usuarioId,
            observacao,
            dataAprovacao: solicitacao.data_aprovacao || new Date(),
          },
        });
        break;
      
      case StatusSolicitacao.INDEFERIDA:
        this.emitirEvento({
          type: SolicitacaoEventType.REJECTED,
          solicitacaoId: solicitacao.id,
          timestamp: new Date(),
          data: {
            reprovadorId: usuarioId,
            motivoReprovacao: observacao || 'Não especificado',
            dataReprovacao: new Date(),
          },
        });
        break;
      
      case StatusSolicitacao.LIBERADA:
        this.emitirEvento({
          type: SolicitacaoEventType.RELEASED,
          solicitacaoId: solicitacao.id,
          timestamp: new Date(),
          data: {
            liberadorId: usuarioId,
            dataLiberacao: solicitacao.data_liberacao || new Date(),
            observacao,
          },
        });
        break;

      case StatusSolicitacao.CONCLUIDA:
        this.logger.log(`Solicitação ${solicitacao.id} concluída`);
        break;

      case StatusSolicitacao.CANCELADA:
        this.logger.log(`Solicitação ${solicitacao.id} cancelada: ${observacao || 'Não especificado'}`);
        break;

      case StatusSolicitacao.ARQUIVADA:
        this.logger.log(`Solicitação ${solicitacao.id} arquivada`);
        break;
    }
  }

  /**
   * Emite evento de prazo próximo do vencimento
   * @param solicitacao Solicitação com prazo próximo
   * @param tipoPrazo Tipo de prazo
   * @param diasRestantes Dias restantes até o vencimento
   */
  emitirEventoPrazoProximo(
    solicitacao: Solicitacao,
    tipoPrazo: 'analise' | 'documentos' | 'processamento',
    diasRestantes: number,
  ): void {
    const dataPrazo = solicitacao[`prazo_${tipoPrazo}`] as Date;
    
    if (!dataPrazo) {
      return;
    }
    
    this.emitirEvento({
      type: SolicitacaoEventType.DEADLINE_APPROACHING,
      solicitacaoId: solicitacao.id,
      timestamp: new Date(),
      data: {
        tipoPrazo,
        dataPrazo,
        diasRestantes,
        determinacaoJudicial: solicitacao.determinacao_judicial_flag || false,
      },
    });
  }

  /**
   * Emite evento de prazo expirado
   * @param solicitacao Solicitação com prazo expirado
   * @param tipoPrazo Tipo de prazo
   * @param diasAtraso Dias de atraso desde o vencimento
   */
  emitirEventoPrazoExpirado(
    solicitacao: Solicitacao,
    tipoPrazo: 'analise' | 'documentos' | 'processamento',
    diasAtraso: number,
  ): void {
    const dataPrazo = solicitacao[`prazo_${tipoPrazo}`] as Date;
    
    if (!dataPrazo) {
      return;
    }
    
    this.emitirEvento({
      type: SolicitacaoEventType.DEADLINE_EXPIRED,
      solicitacaoId: solicitacao.id,
      timestamp: new Date(),
      data: {
        tipoPrazo,
        dataPrazo,
        diasAtraso,
        determinacaoJudicial: solicitacao.determinacao_judicial_flag || false,
      },
    });
  }

  /**
   * Emite evento de anexação de determinação judicial
   * @param solicitacao Solicitação à qual a determinação foi anexada
   * @param determinacaoJudicialId ID da determinação judicial
   * @param usuarioId ID do usuário que realizou a anexação
   * @param observacao Observação sobre a anexação
   */
  emitirEventoDeterminacaoJudicialAnexada(
    solicitacao: Solicitacao,
    determinacaoJudicialId: string,
    usuarioId: string,
    observacao?: string,
  ): void {
    this.emitirEvento({
      type: SolicitacaoEventType.JUDICIAL_DETERMINATION_ATTACHED,
      solicitacaoId: solicitacao.id,
      timestamp: new Date(),
      data: {
        determinacaoJudicialId,
        usuarioId,
        observacao,
      },
    });
  }

  /**
   * Emite evento de criação de pendência
   * @param solicitacaoId ID da solicitação
   * @param pendenciaId ID da pendência criada
   * @param descricao Descrição da pendência
   * @param usuarioId ID do usuário que criou a pendência
   * @param prazo Data limite para resolução da pendência
   */
  emitirEventoPendenciaCriada(
    solicitacaoId: string,
    pendenciaId: string,
    descricao: string,
    usuarioId: string,
    prazo?: Date,
  ): void {
    this.emitirEvento({
      type: SolicitacaoEventType.PENDENCY_CREATED,
      solicitacaoId,
      timestamp: new Date(),
      data: {
        pendenciaId,
        descricao,
        prazo,
        usuarioId,
      },
    });
  }

  /**
   * Emite evento de resolução de pendência
   * @param solicitacaoId ID da solicitação
   * @param pendenciaId ID da pendência resolvida
   * @param resolucao Descrição da resolução
   * @param usuarioId ID do usuário que resolveu a pendência
   */
  emitirEventoPendenciaResolvida(
    solicitacaoId: string,
    pendenciaId: string,
    resolucao: string,
    usuarioId: string,
  ): void {
    this.emitirEvento({
      type: SolicitacaoEventType.PENDENCY_RESOLVED,
      solicitacaoId,
      timestamp: new Date(),
      data: {
        pendenciaId,
        resolucao,
        usuarioId,
        dataResolucao: new Date(),
      },
    });
  }

  /**
   * Emite evento de atribuição de solicitação a um técnico
   * @param solicitacao Solicitação atribuída
   * @param tecnicoAnteriorId ID do técnico anterior (opcional)
   * @param tecnicoAtualId ID do novo técnico
   * @param usuarioAtribuicaoId ID do usuário que realizou a atribuição
   * @param motivoAtribuicao Motivo da atribuição
   */
  emitirEventoAtribuicao(
    solicitacao: Solicitacao,
    tecnicoAtualId: string,
    usuarioAtribuicaoId: string,
    tecnicoAnteriorId?: string,
    motivoAtribuicao?: string,
  ): void {
    this.emitirEvento({
      type: SolicitacaoEventType.ASSIGNED,
      solicitacaoId: solicitacao.id,
      timestamp: new Date(),
      data: {
        tecnicoAnteriorId,
        tecnicoAtualId,
        usuarioAtribuicaoId,
        motivoAtribuicao,
      },
    });
  }
}
