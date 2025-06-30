import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { CreatePagamentoCommand } from '../commands/create-pagamento.command';
import { PagamentoService } from '../services/pagamento.service';
import { PagamentoQueueService } from '../services/pagamento-queue.service';

/**
 * Handler para comando de criação de pagamento
 * Implementa Command pattern com suporte a processamento assíncrono
 */
@Injectable()
export class CreatePagamentoHandler {
  private readonly logger = new Logger(CreatePagamentoHandler.name);

  constructor(
    private readonly pagamentoService: PagamentoService,
    private readonly pagamentoQueueService: PagamentoQueueService,
  ) {}

  /**
   * Executa comando de criação de pagamento
   */
  async execute(command: CreatePagamentoCommand): Promise<any> {
    const { pagamentoData, usuarioId, async } = command;

    // Validações
    if (!pagamentoData || typeof pagamentoData !== 'object') {
      throw new BadRequestException('Dados do pagamento são obrigatórios');
    }

    if (!usuarioId || typeof usuarioId !== 'string') {
      throw new BadRequestException('ID do usuário é obrigatório');
    }

    try {
      this.logger.log(`Executando criação de pagamento - Async: ${async}`);

      // Se processamento assíncrono, adiciona à fila
      if (async) {
        const job = await this.pagamentoQueueService.adicionarJobCriarPagamento(
          pagamentoData,
          usuarioId,
          5 // Alta prioridade para criação
        );

        return { jobId: job.id.toString() };
      }

      // Processamento síncrono
      const pagamento = await this.pagamentoService.create(pagamentoData, usuarioId);
      
      this.logger.log(`Pagamento criado com sucesso: ${pagamento.id}`);
      return pagamento;

    } catch (error) {
      this.logger.error(`Erro ao executar criação de pagamento: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Valida comando antes da execução
   */
  validate(command: CreatePagamentoCommand): boolean {
    const { pagamentoData, usuarioId } = command;

    if (!pagamentoData) {
      throw new Error('Dados do pagamento são obrigatórios');
    }

    if (!usuarioId) {
      throw new Error('ID do usuário é obrigatório');
    }

    if (!pagamentoData.solicitacaoId) {
      throw new Error('ID da solicitação é obrigatório');
    }

    if (!pagamentoData.valor || pagamentoData.valor <= 0) {
      throw new Error('Valor do pagamento deve ser maior que zero');
    }

    return true;
  }
}