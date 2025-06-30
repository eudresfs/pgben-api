import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PagamentoCreateDto } from '../dtos/pagamento-create.dto';
import { CancelarPagamentoDto } from '../dtos/cancelar-pagamento.dto';
import { ConfirmacaoRecebimentoDto } from '../dtos/confirmacao-recebimento.dto';

/**
 * Serviço de fila para pagamentos
 * Implementa Event-Driven Architecture usando BullMQ
 */
@Injectable()
export class PagamentoQueueService {
  private readonly logger = new Logger(PagamentoQueueService.name);

  constructor(
    @InjectQueue('pagamentos') private readonly pagamentosQueue: Queue,
  ) {}

  /**
   * Adiciona job para criar pagamento
   */
  async adicionarJobCriarPagamento(
    pagamentoData: PagamentoCreateDto,
    usuarioId: string,
    priority: number = 0
  ) {
    try {
      const job = await this.pagamentosQueue.add(
        'criar-pagamento',
        {
          pagamentoData,
          usuarioId,
        },
        {
          priority,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        }
      );

      this.logger.log(`Job de criação de pagamento adicionado: ${job.id}`);
      return job;
    } catch (error) {
      this.logger.error(`Erro ao adicionar job de criação de pagamento: ${error.message}`);
      throw error;
    }
  }

  /**
   * Adiciona job para liberar pagamento
   */
  async adicionarJobLiberarPagamento(
    pagamentoId: string,
    dadosLiberacao: any,
    usuarioId: string,
    priority: number = 5
  ) {
    try {
      const job = await this.pagamentosQueue.add(
        'liberar-pagamento',
        {
          pagamentoId,
          dadosLiberacao,
          usuarioId,
        },
        {
          priority,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        }
      );

      this.logger.log(`Job de liberação de pagamento adicionado: ${job.id}`);
      return job;
    } catch (error) {
      this.logger.error(`Erro ao adicionar job de liberação de pagamento: ${error.message}`);
      throw error;
    }
  }

  /**
   * Adiciona job para cancelar pagamento
   */
  async adicionarJobCancelarPagamento(
    pagamentoId: string,
    motivo: string,
    usuarioId: string,
    priority: number = 3
  ) {
    try {
      const job = await this.pagamentosQueue.add(
        'cancelar-pagamento',
        {
          pagamentoId,
          motivo,
          usuarioId,
        },
        {
          priority,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        }
      );

      this.logger.log(`Job de cancelamento de pagamento adicionado: ${job.id}`);
      return job;
    } catch (error) {
      this.logger.error(`Erro ao adicionar job de cancelamento de pagamento: ${error.message}`);
      throw error;
    }
  }

  /**
   * Adiciona job para confirmar recebimento
   */
  async adicionarJobConfirmarRecebimento(
    pagamentoId: string,
    confirmacaoData: ConfirmacaoRecebimentoDto,
    usuarioId: string,
    priority: number = 2
  ) {
    try {
      const job = await this.pagamentosQueue.add(
        'confirmar-recebimento',
        {
          pagamentoId,
          confirmacaoData,
          usuarioId,
        },
        {
          priority,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        }
      );

      this.logger.log(`Job de confirmação de recebimento adicionado: ${job.id}`);
      return job;
    } catch (error) {
      this.logger.error(`Erro ao adicionar job de confirmação de recebimento: ${error.message}`);
      throw error;
    }
  }

  /**
   * Adiciona job para validar comprovante
   */
  async adicionarJobValidarComprovante(
    comprovanteId: string,
    usuarioId: string,
    priority: number = 4
  ) {
    try {
      const job = await this.pagamentosQueue.add(
        'validar-comprovante',
        {
          comprovanteId,
          usuarioId,
        },
        {
          priority,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        }
      );

      this.logger.log(`Job de validação de comprovante adicionado: ${job.id}`);
      return job;
    } catch (error) {
      this.logger.error(`Erro ao adicionar job de validação de comprovante: ${error.message}`);
      throw error;
    }
  }

  /**
   * Adiciona job para processamento em lote
   */
  async adicionarJobProcessamentoBatch(
    operacao: string,
    dados: any[],
    usuarioId: string,
    priority: number = 1
  ) {
    try {
      const job = await this.pagamentosQueue.add(
        'processamento-batch',
        {
          operacao,
          dados,
          usuarioId,
        },
        {
          priority,
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: 50,
          removeOnFail: 25,
        }
      );

      this.logger.log(`Job de processamento em lote adicionado: ${job.id}`);
      return job;
    } catch (error) {
      this.logger.error(`Erro ao adicionar job de processamento em lote: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtém estatísticas da fila
   */
  async obterEstatisticasFila() {
    try {
      const waiting = await this.pagamentosQueue.getWaiting();
      const active = await this.pagamentosQueue.getActive();
      const completed = await this.pagamentosQueue.getCompleted();
      const failed = await this.pagamentosQueue.getFailed();
      const delayed = await this.pagamentosQueue.getDelayed();

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        total: waiting.length + active.length + completed.length + failed.length + delayed.length,
      };
    } catch (error) {
      this.logger.error(`Erro ao obter estatísticas da fila: ${error.message}`);
      throw error;
    }
  }

  /**
   * Limpa jobs completados e falhos
   */
  async limparFila() {
    try {
      await this.pagamentosQueue.clean(24 * 60 * 60 * 1000, 'completed'); // 24 horas
      await this.pagamentosQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'); // 7 dias
      
      this.logger.log('Fila de pagamentos limpa com sucesso');
    } catch (error) {
      this.logger.error(`Erro ao limpar fila: ${error.message}`);
      throw error;
    }
  }
}