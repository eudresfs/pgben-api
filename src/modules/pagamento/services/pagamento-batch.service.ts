import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { Pagamento } from '../../../entities/pagamento.entity';
import { ComprovantePagamento } from '../../../entities/comprovante-pagamento.entity';
import { PagamentoQueueService } from './pagamento-queue.service';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { MetodoPagamentoEnum } from '../../../enums/metodo-pagamento.enum';
import { PagamentoCreateDto } from '../dtos/pagamento-create.dto';
import { CancelarPagamentoDto } from '../dtos/cancelar-pagamento.dto';

interface BatchResult<T> {
  success: T[];
  errors: { item: any; error: string }[];
  total: number;
  successCount: number;
  errorCount: number;
}

interface BatchProcessOptions {
  batchSize?: number;
  maxConcurrency?: number;
  continueOnError?: boolean;
  useTransaction?: boolean;
}

/**
 * Serviço para processamento em lote de operações de pagamento
 * Otimizado para alta performance e confiabilidade
 */
@Injectable()
export class PagamentoBatchService {
  private readonly logger = new Logger(PagamentoBatchService.name);
  private readonly DEFAULT_BATCH_SIZE = 100;
  private readonly DEFAULT_MAX_CONCURRENCY = 5;

  constructor(
    @InjectRepository(Pagamento)
    private readonly pagamentoRepository: Repository<Pagamento>,
    @InjectRepository(ComprovantePagamento)
    private readonly comprovanteRepository: Repository<ComprovantePagamento>,
    private readonly dataSource: DataSource,
    private readonly queueService: PagamentoQueueService,
  ) {}

  /**
   * Cria múltiplos pagamentos em lote
   */
  async createPagamentosInBatch(
    pagamentosData: PagamentoCreateDto[],
    userId: string,
    options: BatchProcessOptions = {}
  ): Promise<BatchResult<Pagamento>> {
    const {
      batchSize = this.DEFAULT_BATCH_SIZE,
      maxConcurrency = this.DEFAULT_MAX_CONCURRENCY,
      continueOnError = true,
      useTransaction = true,
    } = options;

    this.logger.log(`Iniciando criação em lote de ${pagamentosData.length} pagamentos`);

    const result: BatchResult<Pagamento> = {
      success: [],
      errors: [],
      total: pagamentosData.length,
      successCount: 0,
      errorCount: 0,
    };

    // Dividir em lotes
    const batches = this.chunkArray(pagamentosData, batchSize);
    
    // Processar lotes com controle de concorrência
    const semaphore = new Array(maxConcurrency).fill(null);
    const batchPromises = batches.map((batch, index) => 
      this.processBatchWithSemaphore(
        semaphore,
        () => this.processPagamentoBatch(batch, userId, useTransaction),
        index
      )
    );

    const batchResults = await Promise.allSettled(batchPromises);

    // Consolidar resultados
    for (const batchResult of batchResults) {
      if (batchResult.status === 'fulfilled') {
        result.success.push(...batchResult.value.success);
        result.errors.push(...batchResult.value.errors);
      } else {
        this.logger.error(`Erro no processamento do lote: ${batchResult.reason}`);
        if (!continueOnError) {
          throw new Error(`Falha no processamento em lote: ${batchResult.reason}`);
        }
      }
    }

    result.successCount = result.success.length;
    result.errorCount = result.errors.length;

    this.logger.log(
      `Criação em lote concluída: ${result.successCount} sucessos, ${result.errorCount} erros`
    );

    // Adicionar jobs de notificação para pagamentos criados com sucesso
    if (result.success.length > 0) {
      await this.queueService.adicionarJobProcessamentoBatch(
        'notificar-batch-criacao',
        [{
          operacao: 'criar-pagamentos',
          total: pagamentosData.length,
          sucesso: result.success.length,
          erros: result.errors.length,
        }],
        userId
      );
    }

    return result;
  }

  /**
   * Libera múltiplos pagamentos em lote
   */
  async liberarPagamentosInBatch(
    liberacoes: { pagamentoId: string; dados: CancelarPagamentoDto }[],
    userId: string,
    options: BatchProcessOptions = {}
  ): Promise<BatchResult<Pagamento>> {
    const {
      batchSize = this.DEFAULT_BATCH_SIZE,
      maxConcurrency = this.DEFAULT_MAX_CONCURRENCY,
      continueOnError = true,
    } = options;

    this.logger.log(`Iniciando liberação em lote de ${liberacoes.length} pagamentos`);

    const result: BatchResult<Pagamento> = {
      success: [],
      errors: [],
      total: liberacoes.length,
      successCount: 0,
      errorCount: 0,
    };

    // Dividir em lotes
    const batches = this.chunkArray(liberacoes, batchSize);
    
    // Processar lotes com controle de concorrência
    const semaphore = new Array(maxConcurrency).fill(null);
    const batchPromises = batches.map((batch, index) => 
      this.processBatchWithSemaphore(
        semaphore,
        () => this.processLiberacaoBatch(batch, userId),
        index
      )
    );

    const batchResults = await Promise.allSettled(batchPromises);

    // Consolidar resultados
    for (const batchResult of batchResults) {
      if (batchResult.status === 'fulfilled') {
        result.success.push(...batchResult.value.success);
        result.errors.push(...batchResult.value.errors);
      } else {
        this.logger.error(`Erro no processamento do lote: ${batchResult.reason}`);
        if (!continueOnError) {
          throw new Error(`Falha no processamento em lote: ${batchResult.reason}`);
        }
      }
    }

    result.successCount = result.success.length;
    result.errorCount = result.errors.length;

    this.logger.log(
      `Liberação em lote concluída: ${result.successCount} sucessos, ${result.errorCount} erros`
    );

    return result;
  }

  /**
   * Atualiza status de múltiplos pagamentos em lote
   */
  async updateStatusInBatch(
    updates: { pagamentoId: string; novoStatus: StatusPagamentoEnum; observacoes?: string }[],
    userId: string,
    options: BatchProcessOptions = {}
  ): Promise<BatchResult<Pagamento>> {
    const {
      batchSize = this.DEFAULT_BATCH_SIZE,
      useTransaction = true,
    } = options;

    this.logger.log(`Iniciando atualização de status em lote de ${updates.length} pagamentos`);

    const result: BatchResult<Pagamento> = {
      success: [],
      errors: [],
      total: updates.length,
      successCount: 0,
      errorCount: 0,
    };

    // Dividir em lotes
    const batches = this.chunkArray(updates, batchSize);

    for (const batch of batches) {
      const batchResult = await this.processStatusUpdateBatch(batch, userId, useTransaction);
      result.success.push(...batchResult.success);
      result.errors.push(...batchResult.errors);
    }

    result.successCount = result.success.length;
    result.errorCount = result.errors.length;

    this.logger.log(
      `Atualização de status em lote concluída: ${result.successCount} sucessos, ${result.errorCount} erros`
    );

    return result;
  }

  /**
   * Valida múltiplos comprovantes em lote
   */
  async validarComprovantesInBatch(
    comprovanteIds: string[],
    userId: string,
    options: BatchProcessOptions = {}
  ): Promise<BatchResult<ComprovantePagamento>> {
    const {
      batchSize = this.DEFAULT_BATCH_SIZE,
      maxConcurrency = this.DEFAULT_MAX_CONCURRENCY,
    } = options;

    this.logger.log(`Iniciando validação em lote de ${comprovanteIds.length} comprovantes`);

    const result: BatchResult<ComprovantePagamento> = {
      success: [],
      errors: [],
      total: comprovanteIds.length,
      successCount: 0,
      errorCount: 0,
    };

    // Dividir em lotes
    const batches = this.chunkArray(comprovanteIds, batchSize);
    
    // Processar lotes com controle de concorrência
    const semaphore = new Array(maxConcurrency).fill(null);
    const batchPromises = batches.map((batch, index) => 
      this.processBatchWithSemaphore(
        semaphore,
        () => this.processValidacaoComprovantesBatch(batch, userId),
        index
      )
    );

    const batchResults = await Promise.allSettled(batchPromises);

    // Consolidar resultados
    for (const batchResult of batchResults) {
      if (batchResult.status === 'fulfilled') {
        result.success.push(...batchResult.value.success);
        result.errors.push(...batchResult.value.errors);
      }
    }

    result.successCount = result.success.length;
    result.errorCount = result.errors.length;

    this.logger.log(
      `Validação em lote concluída: ${result.successCount} sucessos, ${result.errorCount} erros`
    );

    return result;
  }

  /**
   * Processa um lote de criação de pagamentos
   */
  private async processPagamentoBatch(
    batch: PagamentoCreateDto[],
    userId: string,
    useTransaction: boolean
  ): Promise<BatchResult<Pagamento>> {
    const result: BatchResult<Pagamento> = {
      success: [],
      errors: [],
      total: batch.length,
      successCount: 0,
      errorCount: 0,
    };

    if (useTransaction) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        for (const pagamentoData of batch) {
          try {
            const pagamento = queryRunner.manager.create(Pagamento, {
              ...pagamentoData,
              status: StatusPagamentoEnum.PENDENTE,
              createdBy: userId,
            });
            
            const savedPagamento = await queryRunner.manager.save(pagamento);
            result.success.push(savedPagamento);
          } catch (error) {
            result.errors.push({
              item: pagamentoData,
              error: error.message,
            });
          }
        }

        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } else {
      // Processamento sem transação
      for (const pagamentoData of batch) {
        try {
          const pagamento = this.pagamentoRepository.create({
            ...pagamentoData,
            status: StatusPagamentoEnum.PENDENTE,
            criadoPor: userId,
          });
          
          const savedPagamento = await this.pagamentoRepository.save(pagamento);
          result.success.push(savedPagamento);
        } catch (error) {
          result.errors.push({
            item: pagamentoData,
            error: error.message,
          });
        }
      }
    }

    result.successCount = result.success.length;
    result.errorCount = result.errors.length;

    return result;
  }

  /**
   * Processa um lote de liberação de pagamentos
   */
  private async processLiberacaoBatch(
    batch: { pagamentoId: string; dados: CancelarPagamentoDto }[],
    userId: string
  ): Promise<BatchResult<Pagamento>> {
    const result: BatchResult<Pagamento> = {
      success: [],
      errors: [],
      total: batch.length,
      successCount: 0,
      errorCount: 0,
    };

    for (const { pagamentoId, dados } of batch) {
      try {
        // Adicionar job de liberação à fila
        await this.queueService.adicionarJobLiberarPagamento(
          pagamentoId,
          dados,
          userId
        );

        // Para o resultado, buscar o pagamento atualizado
        const pagamento = await this.pagamentoRepository.findOne({
          where: { id: pagamentoId },
        });

        if (pagamento) {
          result.success.push(pagamento);
        }
      } catch (error) {
        result.errors.push({
          item: { pagamentoId, dados },
          error: error.message,
        });
      }
    }

    result.successCount = result.success.length;
    result.errorCount = result.errors.length;

    return result;
  }

  /**
   * Processa um lote de atualização de status
   */
  private async processStatusUpdateBatch(
    batch: { pagamentoId: string; novoStatus: StatusPagamentoEnum; observacoes?: string }[],
    userId: string,
    useTransaction: boolean
  ): Promise<BatchResult<Pagamento>> {
    const result: BatchResult<Pagamento> = {
      success: [],
      errors: [],
      total: batch.length,
      successCount: 0,
      errorCount: 0,
    };

    if (useTransaction) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        for (const { pagamentoId, novoStatus, observacoes } of batch) {
          try {
            await queryRunner.manager.update(Pagamento, pagamentoId, {
              status: novoStatus,
              observacoes,
              // updatedBy: userId, // Campo removido se não existir na entidade
              updated_at: new Date(),
            });

            const pagamento = await queryRunner.manager.findOne(Pagamento, {
              where: { id: pagamentoId },
            });

            if (pagamento) {
              result.success.push(pagamento);
            }
          } catch (error) {
            result.errors.push({
              item: { pagamentoId, novoStatus, observacoes },
              error: error.message,
            });
          }
        }

        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    }

    result.successCount = result.success.length;
    result.errorCount = result.errors.length;

    return result;
  }

  /**
   * Processa um lote de validação de comprovantes
   */
  private async processValidacaoComprovantesBatch(
    batch: string[],
    userId: string
  ): Promise<BatchResult<ComprovantePagamento>> {
    const result: BatchResult<ComprovantePagamento> = {
      success: [],
      errors: [],
      total: batch.length,
      successCount: 0,
      errorCount: 0,
    };

    for (const comprovanteId of batch) {
      try {
        // Adicionar job de validação à fila
        await this.queueService.adicionarJobValidarComprovante(
           comprovanteId,
           userId
         );

        // Para o resultado, buscar o comprovante
        const comprovante = await this.comprovanteRepository.findOne({
          where: { id: comprovanteId },
        });

        if (comprovante) {
          result.success.push(comprovante);
        }
      } catch (error) {
        result.errors.push({
          item: comprovanteId,
          error: error.message,
        });
      }
    }

    result.successCount = result.success.length;
    result.errorCount = result.errors.length;

    return result;
  }

  /**
   * Controla a concorrência usando semáforo
   */
  private async processBatchWithSemaphore<T>(
    semaphore: any[],
    task: () => Promise<T>,
    index: number
  ): Promise<T> {
    // Aguardar slot disponível
    const slot = index % semaphore.length;
    await Promise.resolve(semaphore[slot]);

    try {
      const promise = task();
      semaphore[slot] = promise;
      return await promise;
    } finally {
      semaphore[slot] = null;
    }
  }

  /**
   * Divide array em chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}