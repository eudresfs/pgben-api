import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { LiberarPagamentoCommand } from '../commands/liberar-pagamento.command';
import { PagamentoWorkflowService } from '../services/pagamento-workflow.service';
import { PagamentoQueueService } from '../services/pagamento-queue.service';
import { PagamentoResponseDto } from '../dtos/pagamento-response.dto';

/**
 * Handler para comando de liberação de pagamento
 */
@Injectable()
export class LiberarPagamentoHandler {
  private readonly logger = new Logger(LiberarPagamentoHandler.name);

  constructor(
    private readonly pagamentoWorkflowService: PagamentoWorkflowService,
    private readonly pagamentoQueueService: PagamentoQueueService,
  ) {}

  /**
   * Executa comando de liberação de pagamento
   */
  async execute(command: LiberarPagamentoCommand): Promise<any> {
    try {
      const { pagamentoId, dadosLiberacao, usuarioId, async } = command;

      // Validações
      if (!pagamentoId || typeof pagamentoId !== 'string') {
        throw new BadRequestException('ID do pagamento é obrigatório');
      }

      if (!dadosLiberacao || typeof dadosLiberacao !== 'object') {
        throw new BadRequestException('Dados de liberação são obrigatórios');
      }

      if (!usuarioId || typeof usuarioId !== 'string') {
        throw new BadRequestException('ID do usuário é obrigatório');
      }

      // Se processamento assíncrono, adiciona à fila
      if (async) {
        const job =
          await this.pagamentoQueueService.adicionarJobLiberarPagamento(
            pagamentoId,
            dadosLiberacao,
            usuarioId,
            10, // Prioridade máxima para liberação
          );

        return { jobId: job.id.toString() };
      }

      // Processamento síncrono
      const pagamento = await this.pagamentoWorkflowService.liberarPagamento(
        pagamentoId,
        usuarioId,
      );

      this.logger.log(`Pagamento liberado com sucesso: ${pagamentoId}`);
      return pagamento;
    } catch (error) {
      this.logger.error(
        `Erro ao executar liberação de pagamento: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Valida comando antes da execução
   */
  validate(command: LiberarPagamentoCommand): boolean {
    const { pagamentoId, dadosLiberacao, usuarioId } = command;

    if (!pagamentoId) {
      throw new Error('ID do pagamento é obrigatório');
    }

    if (!dadosLiberacao) {
      throw new Error('Dados de liberação são obrigatórios');
    }

    if (!usuarioId) {
      throw new Error('ID do usuário é obrigatório');
    }

    return true;
  }
}
