import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PagamentoWorkflowService } from '../services/pagamento-workflow.service';
import { PagamentoService } from '../services/pagamento.service';
import { LoggingService } from '../../../shared/logging/logging.service';

@Injectable()
export class PagamentoLiberacaoScheduler {
  constructor(
    private readonly pagamentoWorkflowService: PagamentoWorkflowService,
    private readonly pagamentoService: PagamentoService,
    private readonly logger: LoggingService,
  ) {}

  /**
   * Executa diariamente às 08:00 para processar vencimentos automáticos.
   * Altera o status de pagamentos 'pendente' para 'vencido' quando ultrapassam a data de vencimento.
   */
  @Cron('0 0 8 * * *') // Todos os dias às 08:00
  async processarVencimentoAutomatico(): Promise<void> {
    this.logger.info(
      'Iniciando processamento de vencimento automático de pagamentos.',
      PagamentoLiberacaoScheduler.name,
    );

    try {
      const resultado =
        await this.pagamentoWorkflowService.processarVencimentosAutomaticos();

      this.logger.info(
        `Processamento de vencimento concluído. Pagamentos marcados como vencidos: ${resultado.length}`,
        PagamentoLiberacaoScheduler.name,
        { vencidos: resultado.length },
      );
    } catch (error) {
      this.logger.error(
        'Erro ao processar vencimento automático de pagamentos',
        error,
        PagamentoLiberacaoScheduler.name,
        { stack: error.stack },
      );
    }
  }

  /**
   * Executa diariamente às 10:00 para notificar técnicos sobre pagamentos próximos ao vencimento.
   * Envia notificação dois dias antes da data de vencimento para o técnico responsável.
   */
  @Cron('0 0 10 * * *') // Todos os dias às 10:00
  async notificarPrazosVencimento(): Promise<void> {
    this.logger.info(
      'Iniciando notificação de prazos de vencimento.',
      PagamentoLiberacaoScheduler.name,
    );

    try {
      const resultado =
        await this.pagamentoWorkflowService.notificarPrazosVencimento();

      this.logger.info(
        `Notificações de prazo enviadas. Total de notificações: ${resultado.length}`,
        PagamentoLiberacaoScheduler.name,
        { notificacoes: resultado.length },
      );
    } catch (error) {
      this.logger.error(
        'Erro ao enviar notificações de prazo de vencimento',
        error,
        PagamentoLiberacaoScheduler.name,
        { stack: error.stack },
      );
    }
  }
}
