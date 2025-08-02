import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { PagamentoCreateDto } from '../dtos/pagamento-create.dto';
import { CancelarPagamentoDto } from '../dtos/cancelar-pagamento.dto';
import { ConfirmacaoRecebimentoDto } from '../dtos/confirmacao-recebimento.dto';

/**
 * Serviço de fila para pagamentos
 * Implementa Event-Driven Architecture usando BullMQ
 * Com fallback graceful quando Redis não está disponível
 */
@Injectable()
export class PagamentoQueueService {
  private readonly logger = new Logger(PagamentoQueueService.name);
  private readonly isRedisDisabled: boolean;

  constructor(
    @Optional()
    @InjectQueue('pagamentos')
    private readonly pagamentosQueue: Queue,
    private readonly configService: ConfigService,
  ) {
    this.isRedisDisabled = this.configService.get('DISABLE_REDIS') === 'true';

    if (this.isRedisDisabled) {
      this.logger.warn(
        'Redis desabilitado - operações de fila serão simuladas',
      );
    } else if (!this.pagamentosQueue) {
      this.logger.warn(
        'Fila de pagamentos não disponível - operações serão simuladas',
      );
    }
  }

  /**
   * Verifica se as filas estão disponíveis
   */
  private isQueueAvailable(): boolean {
    return !this.isRedisDisabled && !!this.pagamentosQueue;
  }

  /**
   * Simula um job quando a fila não está disponível
   */
  private simulateJob(jobType: string, data: any): any {
    const jobId = `simulated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.logger.warn(
      `Simulando job ${jobType} (ID: ${jobId}) - Redis não disponível`,
    );
    return {
      id: jobId,
      data,
      opts: {},
      progress: () => 100,
      remove: () => Promise.resolve(),
    };
  }

  /**
   * Adiciona job para criar pagamento
   */
  async adicionarJobCriarPagamento(
    pagamentoData: PagamentoCreateDto,
    usuarioId: string,
    priority: number = 0,
  ) {
    try {
      // Verificar se a fila está disponível
      if (!this.isQueueAvailable()) {
        this.logger.warn(
          `Fila não disponível - simulando job de criação de pagamento`,
        );
        return this.simulateJob('criar-pagamento', {
          pagamentoData,
          usuarioId,
        });
      }

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
        },
      );

      // Job adicionado com sucesso
      return job;
    } catch (error) {
      this.logger.error(
        `Erro ao adicionar job de criação de pagamento: ${error.message}`,
      );
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
    priority: number = 5,
  ) {
    try {
      // Verificar se a fila está disponível
      if (!this.isQueueAvailable()) {
        this.logger.warn(
          `Fila não disponível - simulando job de liberação de pagamento para: ${pagamentoId}`,
        );
        return this.simulateJob('liberar-pagamento', {
          pagamentoId,
          dadosLiberacao,
          usuarioId,
        });
      }

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
        },
      );

      // Job adicionado com sucesso
      return job;
    } catch (error) {
      this.logger.error(
        `Erro ao adicionar job de liberação de pagamento: ${error.message}`,
      );
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
    priority: number = 3,
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
        },
      );

      // Job adicionado com sucesso
      return job;
    } catch (error) {
      this.logger.error(
        `Erro ao adicionar job de cancelamento de pagamento: ${error.message}`,
      );
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
    priority: number = 2,
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
        },
      );

      // Job adicionado com sucesso
      return job;
    } catch (error) {
      this.logger.error(
        `Erro ao adicionar job de confirmação de recebimento: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Adiciona job para validar comprovante
   */
  async adicionarJobValidarComprovante(
    comprovante_id: string,
    usuarioId: string,
    priority: number = 4,
  ) {
    try {
      const job = await this.pagamentosQueue.add(
        'validar-comprovante',
        {
          comprovante_id,
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
        },
      );

      // Job adicionado com sucesso
      return job;
    } catch (error) {
      this.logger.error(
        `Erro ao adicionar job de validação de comprovante: ${error.message}`,
      );
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
    priority: number = 1,
  ) {
    try {
      // Verificar se a fila está disponível
      if (!this.isQueueAvailable()) {
        this.logger.warn(
          `Fila não disponível - simulando job de processamento em lote: ${operacao}`,
        );
        return this.simulateJob('processamento-batch', {
          operacao,
          dados,
          usuarioId,
        });
      }

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
        },
      );

      // Job adicionado com sucesso
      return job;
    } catch (error) {
      this.logger.error(
        `Erro ao adicionar job de processamento em lote: ${error.message}`,
      );
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
        total:
          waiting.length +
          active.length +
          completed.length +
          failed.length +
          delayed.length,
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

      // Fila limpa com sucesso
    } catch (error) {
      this.logger.error(`Erro ao limpar fila: ${error.message}`);
      throw error;
    }
  }
}
