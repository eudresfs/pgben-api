import { Processor, Process } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { NotificacaoAprovacaoService } from '../services/notificacao-aprovacao.service';
import { NOTIFICACAO_QUEUE } from '../constants/aprovacao.constants';

/**
 * @interface NotificacaoSolicitacaoData
 * @description Interface para dados de notificação de nova solicitação.
 */
interface NotificacaoSolicitacaoData {
  solicitacaoId: string;
  aprovadoresIds: string[];
  tipoAcao: string;
  prioridade: 'baixa' | 'media' | 'alta' | 'critica';
}

/**
 * @interface NotificacaoAprovacaoData
 * @description Interface para dados de notificação de aprovação processada.
 */
interface NotificacaoAprovacaoData {
  solicitacaoId: string;
  aprovadorId: string;
  aprovado: boolean;
  observacoes?: string;
}

/**
 * @interface NotificacaoEscalacaoData
 * @description Interface para dados de notificação de escalação.
 */
interface NotificacaoEscalacaoData {
  solicitacaoId: string;
  aprovadorOriginalId: string;
  novoAprovadorId: string;
  motivo: string;
}

/**
 * @interface NotificacaoLembreteData
 * @description Interface para dados de notificação de lembrete.
 */
interface NotificacaoLembreteData {
  solicitacaoId: string;
  aprovadorId: string;
  diasPendente: number;
}

/**
 * @class NotificacaoProcessor
 * @description Processador de fila responsável pelo envio assíncrono de notificações.
 *
 * Este processador gerencia:
 * - Notificações de novas solicitações
 * - Notificações de aprovações processadas
 * - Notificações de escalação
 * - Lembretes automáticos
 * - Notificações de conclusão
 */
@Injectable()
@Processor(NOTIFICACAO_QUEUE)
export class NotificacaoProcessor {
  private readonly logger = new Logger(NotificacaoProcessor.name);

  constructor(
    private readonly notificacaoService: NotificacaoAprovacaoService,
  ) {}

  /**
   * @method enviarNotificacaoNovaSolicitacao
   * @description Envia notificações para aprovadores sobre nova solicitação.
   * @param {Job<NotificacaoSolicitacaoData>} job O job contendo os dados da notificação.
   */
  @Process('nova-solicitacao')
  async enviarNotificacaoNovaSolicitacao(
    job: Job<NotificacaoSolicitacaoData>,
  ): Promise<void> {
    const { solicitacaoId, aprovadoresIds, tipoAcao, prioridade } = job.data;
    
    this.logger.log(
      `Enviando notificação de nova solicitação: ${solicitacaoId} para ${aprovadoresIds.length} aprovadores`,
    );

    try {
      await this.notificacaoService.notificarNovaSolicitacao(
        solicitacaoId,
        aprovadoresIds,
      );

      this.logger.log(
        `Notificação de nova solicitação enviada com sucesso: ${solicitacaoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao enviar notificação de nova solicitação ${solicitacaoId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * @method enviarNotificacaoAprovacao
   * @description Envia notificações sobre aprovação processada.
   * @param {Job<NotificacaoAprovacaoData>} job O job contendo os dados da aprovação.
   */
  @Process('aprovacao-processada')
  async enviarNotificacaoAprovacao(
    job: Job<NotificacaoAprovacaoData>,
  ): Promise<void> {
    const { solicitacaoId, aprovadorId, aprovado, observacoes } = job.data;
    
    this.logger.log(
      `Enviando notificação de aprovação processada: ${solicitacaoId}`,
    );

    try {
      // Notifica baseado no resultado da aprovação
      if (aprovado) {
        await this.notificacaoService.notificarAprovacao(
          solicitacaoId,
          aprovadorId,
          observacoes,
        );
      } else {
        await this.notificacaoService.notificarRejeicao(
          solicitacaoId,
          aprovadorId,
          observacoes,
        );
      }

      this.logger.log(
        `Notificação de aprovação processada enviada: ${solicitacaoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao enviar notificação de aprovação ${solicitacaoId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * @method enviarNotificacaoEscalacao
   * @description Envia notificações sobre escalação de aprovação.
   * @param {Job<NotificacaoEscalacaoData>} job O job contendo os dados da escalação.
   */
  @Process('escalacao')
  async enviarNotificacaoEscalacao(
    job: Job<NotificacaoEscalacaoData>,
  ): Promise<void> {
    const { solicitacaoId, aprovadorOriginalId, novoAprovadorId, motivo } = job.data;
    
    this.logger.log(
      `Enviando notificação de escalação: ${solicitacaoId}`,
    );

    try {
      // Notifica sobre prazo vencendo como forma de escalação
      await this.notificacaoService.notificarPrazoVencendo(solicitacaoId);

      this.logger.log(
        `Notificação de escalação enviada: ${solicitacaoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao enviar notificação de escalação ${solicitacaoId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * @method enviarLembrete
   * @description Envia lembretes para aprovadores sobre solicitações pendentes.
   * @param {Job<NotificacaoLembreteData>} job O job contendo os dados do lembrete.
   */
  @Process('lembrete')
  async enviarLembrete(job: Job<NotificacaoLembreteData>): Promise<void> {
    const { solicitacaoId, aprovadorId, diasPendente } = job.data;
    
    this.logger.log(
      `Enviando lembrete: Solicitação ${solicitacaoId} pendente há ${diasPendente} dias`,
    );

    try {
      // Envia lembrete através de notificação de prazo vencendo
      await this.notificacaoService.notificarPrazoVencendo(solicitacaoId);

      this.logger.log(
        `Lembrete enviado com sucesso: ${solicitacaoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao enviar lembrete ${solicitacaoId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * @method processarNotificacoesPendentes
   * @description Processa notificações que falharam anteriormente.
   * @param {Job} job O job de processamento de notificações pendentes.
   */
  @Process('processar-pendentes')
  async processarNotificacoesPendentes(job: Job): Promise<void> {
    this.logger.log('Processando notificações pendentes');

    try {
      // TODO: Implementar busca de notificações pendentes
      // Por enquanto, apenas registra o processamento
      this.logger.log('Processamento de notificações pendentes - funcionalidade em desenvolvimento');
    } catch (error) {
      this.logger.error(
        `Erro ao processar notificações pendentes: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}