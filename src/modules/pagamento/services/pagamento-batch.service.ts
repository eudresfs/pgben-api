import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Pagamento, Documento } from '@/entities';
import { PagamentoQueueService } from './pagamento-queue.service';
import { LiberarPagamentoDto } from '../dtos/liberar-pagamento.dto';
import { PagamentoUpdateStatusDto } from '../dtos/pagamento-update-status.dto';
import { ComprovanteUploadDto } from '../dtos/comprovante-upload.dto';
import { PagamentoWorkflowService } from './pagamento-workflow.service';
import { RequestContextHolder } from '../../../common/services/request-context-holder.service';
import { PagamentoCreateDto } from '../dtos/pagamento-create.dto';
import { StatusPagamentoEnum } from '@/enums';

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
    @InjectRepository(Documento)
    private readonly documentoRepository: Repository<Documento>,
    private readonly dataSource: DataSource,
    private readonly queueService: PagamentoQueueService,
    private readonly pagamentoWorkflowService: PagamentoWorkflowService,
  ) {}

  /**
   * Cria múltiplos pagamentos em lote
   */
  async createPagamentosInBatch(
    pagamentosData: PagamentoCreateDto[],
    userId: string,
    options: BatchProcessOptions = {},
  ): Promise<BatchResult<Pagamento>> {
    const {
      batchSize = this.DEFAULT_BATCH_SIZE,
      maxConcurrency = this.DEFAULT_MAX_CONCURRENCY,
      continueOnError = true,
      useTransaction = true,
    } = options;

    this.logger.log(
      `Iniciando criação em lote de ${pagamentosData.length} pagamentos`,
    );

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
        index,
      ),
    );

    const batchResults = await Promise.allSettled(batchPromises);

    // Consolidar resultados
    for (const batchResult of batchResults) {
      if (batchResult.status === 'fulfilled') {
        result.success.push(...batchResult.value.success);
        result.errors.push(...batchResult.value.errors);
      } else {
        this.logger.error(
          `Erro no processamento do lote: ${batchResult.reason}`,
        );
        if (!continueOnError) {
          throw new Error(
            `Falha no processamento em lote: ${batchResult.reason}`,
          );
        }
      }
    }

    result.successCount = result.success.length;
    result.errorCount = result.errors.length;

    this.logger.log(
      `Criação em lote concluída: ${result.successCount} sucessos, ${result.errorCount} erros`,
    );

    // Adicionar jobs de notificação para pagamentos criados com sucesso
    if (result.success.length > 0) {
      await this.queueService.adicionarJobProcessamentoBatch(
        'notificar-batch-criacao',
        [
          {
            operacao: 'criar-pagamentos',
            total: pagamentosData.length,
            sucesso: result.success.length,
            erros: result.errors.length,
          },
        ],
        userId,
      );
    }

    return result;
  }

  /**
   * Libera múltiplos pagamentos em lote
   */
  async liberarPagamentosInBatch(
    liberacoes: { pagamentoId: string; dados: LiberarPagamentoDto }[],
    userId: string,
    options: BatchProcessOptions = {},
  ): Promise<BatchResult<Pagamento>> {
    const {
      batchSize = this.DEFAULT_BATCH_SIZE,
      maxConcurrency = this.DEFAULT_MAX_CONCURRENCY,
      continueOnError = true,
    } = options;

    this.logger.log(
      `Iniciando liberação em lote de ${liberacoes.length} pagamentos`,
    );

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
        index,
      ),
    );

    const batchResults = await Promise.allSettled(batchPromises);

    // Consolidar resultados
    for (const batchResult of batchResults) {
      if (batchResult.status === 'fulfilled') {
        result.success.push(...batchResult.value.success);
        result.errors.push(...batchResult.value.errors);
      } else {
        this.logger.error(
          `Erro no processamento do lote: ${batchResult.reason}`,
        );
        if (!continueOnError) {
          throw new Error(
            `Falha no processamento em lote: ${batchResult.reason}`,
          );
        }
      }
    }

    result.successCount = result.success.length;
    result.errorCount = result.errors.length;

    // Liberação em lote concluída

    return result;
  }

  /**
   * Atualiza status de múltiplos pagamentos em lote
   */
  async updateStatusInBatch(
    updates: {
      pagamentoId: string;
      novoStatus: StatusPagamentoEnum;
      observacoes?: string;
    }[],
    userId: string,
    options: BatchProcessOptions = {},
  ): Promise<BatchResult<Pagamento>> {
    const { batchSize = this.DEFAULT_BATCH_SIZE, useTransaction = true } =
      options;

    // Iniciando atualização de status em lote

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
      const batchResult = await this.processStatusUpdateBatch(
        batch,
        userId,
        useTransaction,
      );
      result.success.push(...batchResult.success);
      result.errors.push(...batchResult.errors);
    }

    result.successCount = result.success.length;
    result.errorCount = result.errors.length;

    // Atualização de status em lote concluída

    return result;
  }

  /**
   * Valida múltiplos comprovantes em lote
   */
  async validarComprovantesInBatch(
    comprovante_ids: string[],
    userId: string,
    options: BatchProcessOptions = {},
  ): Promise<BatchResult<Documento>> {
    const {
      batchSize = this.DEFAULT_BATCH_SIZE,
      maxConcurrency = this.DEFAULT_MAX_CONCURRENCY,
    } = options;

    // Iniciando validação em lote de comprovantes

    const result: BatchResult<Documento> = {
      success: [],
      errors: [],
      total: comprovante_ids.length,
      successCount: 0,
      errorCount: 0,
    };

    // Dividir em lotes
    const batches = this.chunkArray(comprovante_ids, batchSize);

    // Processar lotes com controle de concorrência
    const semaphore = new Array(maxConcurrency).fill(null);
    const batchPromises = batches.map((batch, index) =>
      this.processBatchWithSemaphore(
        semaphore,
        () => this.processValidacaoComprovantesBatch(batch, userId),
        index,
      ),
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

    // Validação em lote concluída

    return result;
  }

  /**
   * Processa um lote de criação de pagamentos
   */
  private async processPagamentoBatch(
    batch: PagamentoCreateDto[],
    userId: string,
    useTransaction: boolean,
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
            criado_por: userId,
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
   * CORREÇÃO: Realiza liberação síncrona real ao invés de apenas enfileirar
   * para garantir resultado preciso e preservar contexto de escopo
   * Ordena pagamentos por numero_parcela para garantir sequência correta
   */
  private async processLiberacaoBatch(
    batch: { pagamentoId: string; dados: LiberarPagamentoDto }[],
    userId: string,
  ): Promise<BatchResult<Pagamento>> {
    const result: BatchResult<Pagamento> = {
      success: [],
      errors: [],
      total: batch.length,
      successCount: 0,
      errorCount: 0,
    };

    // Obter contexto atual para preservar durante operações assíncronas
    const context = RequestContextHolder.get();
    
    // Validação crítica: falhar rapidamente se não há contexto de escopo
    if (!context) {
      this.logger.error(
        'SECURITY ALERT: Tentativa de liberação em lote sem contexto de escopo',
        {
          batchSize: batch.length,
          userId,
          timestamp: new Date().toISOString(),
        },
      );
      throw new Error('Contexto de escopo obrigatório para liberação em lote');
    }

    this.logger.log(
      `Iniciando liberação síncrona de lote: ${batch.length} pagamentos`,
      {
        userId,
        scopeType: context.tipo,
        unidadeId: context.unidade_id,
      },
    );

    // Buscar dados dos pagamentos para ordenar por numero_parcela
    const pagamentoIds = batch.map(item => item.pagamentoId);
    const pagamentosData = await this.pagamentoRepository
      .createQueryBuilder('pagamento')
      .select(['pagamento.id', 'pagamento.numero_parcela', 'pagamento.concessao_id'])
      .where('pagamento.id IN (:...ids)', { ids: pagamentoIds })
      .getMany();

    // Criar mapa para facilitar busca
    const pagamentoDataMap = new Map(
      pagamentosData.map(p => [p.id, p])
    );

    // Ordenar batch por numero_parcela (crescente)
    const batchOrdenado = batch.sort((a, b) => {
      const pagamentoA = pagamentoDataMap.get(a.pagamentoId);
      const pagamentoB = pagamentoDataMap.get(b.pagamentoId);
      
      if (!pagamentoA || !pagamentoB) {
        this.logger.warn('Pagamento não encontrado para ordenação', {
          pagamentoA: pagamentoA?.id,
          pagamentoB: pagamentoB?.id,
        });
        return 0;
      }
      
      return pagamentoA.numero_parcela - pagamentoB.numero_parcela;
    });

    this.logger.log(
      `Lote ordenado por numero_parcela: ${batchOrdenado.map(item => {
        const pagamento = pagamentoDataMap.get(item.pagamentoId);
        return `${item.pagamentoId.substring(0, 8)}...(parcela ${pagamento?.numero_parcela || '?'})`;
      }).join(', ')}`,
    );

    // Validação adicional: verificar se há parcelas fora de sequência por concessão
    const parcelasPorConcessao = new Map<string, number[]>();
    
    for (const item of batchOrdenado) {
      const pagamento = pagamentoDataMap.get(item.pagamentoId);
      if (pagamento && pagamento.concessao_id) {
        if (!parcelasPorConcessao.has(pagamento.concessao_id)) {
          parcelasPorConcessao.set(pagamento.concessao_id, []);
        }
        parcelasPorConcessao.get(pagamento.concessao_id)!.push(pagamento.numero_parcela);
      }
    }

    // Verificar sequência por concessão
    for (const [concessaoId, parcelas] of parcelasPorConcessao) {
      const parcelasOrdenadas = [...parcelas].sort((a, b) => a - b);
      
      // Verificar se há gaps na sequência (ex: tentativa de liberar parcela 3 sem ter parcela 1 ou 2)
      for (let i = 0; i < parcelasOrdenadas.length; i++) {
        const parcelaAtual = parcelasOrdenadas[i];
        
        // Se não é a primeira parcela, verificar se existe a anterior
        if (parcelaAtual > 1) {
          const parcelaAnterior = parcelaAtual - 1;
          
          // Verificar se a parcela anterior está no lote ou já foi confirmada
          const temParcelaAnteriorNoLote = parcelas.includes(parcelaAnterior);
          
          if (!temParcelaAnteriorNoLote) {
            // Verificar se a parcela anterior já foi confirmada no banco
            const parcelaAnteriorConfirmada = await this.pagamentoRepository
              .createQueryBuilder('pagamento')
              .where('pagamento.concessao_id = :concessaoId', { concessaoId })
              .andWhere('pagamento.numero_parcela = :numeroParcela', { numeroParcela: parcelaAnterior })
              .andWhere('pagamento.status = :status', { status: StatusPagamentoEnum.CONFIRMADO })
              .getOne();
            
            if (!parcelaAnteriorConfirmada) {
              this.logger.warn(
                `VALIDAÇÃO SEQUÊNCIA: Tentativa de liberar parcela ${parcelaAtual} sem parcela anterior ${parcelaAnterior} confirmada`,
                {
                  concessaoId,
                  parcelaAtual,
                  parcelaAnterior,
                  parcelasNoLote: parcelas,
                },
              );
            }
          }
        }
      }
      
      this.logger.debug(
        `Validação de sequência para concessão ${concessaoId}: parcelas ${parcelas.join(', ')}`,
        { concessaoId, parcelas: parcelasOrdenadas },
      );
    }

    for (let index = 0; index < batchOrdenado.length; index++) {
      const { pagamentoId, dados } = batchOrdenado[index];
      const pagamentoData = pagamentoDataMap.get(pagamentoId);
      
      try {
        this.logger.log(
          `[${index + 1}/${batchOrdenado.length}] Iniciando liberação: Pagamento ${pagamentoId.substring(0, 8)}... (Parcela ${pagamentoData?.numero_parcela || '?'}, Concessão ${pagamentoData?.concessao_id?.substring(0, 8) || '?'}...)`,
          {
            ordem: index + 1,
            total: batchOrdenado.length,
            pagamentoId,
            numeroParcela: pagamentoData?.numero_parcela,
            concessaoId: pagamentoData?.concessao_id,
            userId,
            dadosLiberacao: dados,
          },
        );

        // CORREÇÃO CRÍTICA: Liberação síncrona real com preservação de contexto
        const pagamentoLiberado = await RequestContextHolder.runAsync(
          context,
          async () => {
            return this.pagamentoWorkflowService.liberarPagamento(
              pagamentoId,
              dados,
              userId,
            );
          },
        );

        result.success.push(pagamentoLiberado);
        
        this.logger.log(
          `[${index + 1}/${batchOrdenado.length}] ✅ SUCESSO: Pagamento ${pagamentoId.substring(0, 8)}... (Parcela ${pagamentoData?.numero_parcela}) liberado`,
          {
            ordem: index + 1,
            pagamentoId,
            numeroParcela: pagamentoData?.numero_parcela,
            novoStatus: pagamentoLiberado.status,
            dataLiberacao: pagamentoLiberado.data_liberacao,
            concessaoId: pagamentoData?.concessao_id,
          },
        );
      } catch (error) {
        this.logger.error(
          `[${index + 1}/${batchOrdenado.length}] ❌ ERRO: Falha ao liberar Pagamento ${pagamentoId.substring(0, 8)}... (Parcela ${pagamentoData?.numero_parcela})`,
          {
            ordem: index + 1,
            pagamentoId,
            numeroParcela: pagamentoData?.numero_parcela,
            concessaoId: pagamentoData?.concessao_id,
            error: error.message,
            userId,
            dados,
          },
        );

        result.errors.push({
          item: { pagamentoId, dados },
          error: error.message,
        });
      }
    }

    result.successCount = result.success.length;
    result.errorCount = result.errors.length;

    this.logger.log(
      `Liberação em lote concluída: ${result.successCount} sucessos, ${result.errorCount} erros`,
      {
        total: result.total,
        successRate: ((result.successCount / result.total) * 100).toFixed(2) + '%',
        userId,
      },
    );

    return result;
  }

  /**
   * Processa um lote de atualização de status
   */
  private async processStatusUpdateBatch(
    batch: {
      pagamentoId: string;
      novoStatus: StatusPagamentoEnum;
      observacoes?: string;
    }[],
    userId: string,
    useTransaction: boolean,
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
    userId: string,
  ): Promise<BatchResult<Documento>> {
    const result: BatchResult<Documento> = {
      success: [],
      errors: [],
      total: batch.length,
      successCount: 0,
      errorCount: 0,
    };

    for (const comprovante_id of batch) {
      try {
        // Adicionar job de validação à fila
        await this.queueService.adicionarJobValidarComprovante(
          comprovante_id,
          userId,
        );

        // Para o resultado, buscar o documento
        const documento = await this.documentoRepository.findOne({
          where: { id: comprovante_id },
        });

        if (documento) {
          result.success.push(documento);
        }
      } catch (error) {
        result.errors.push({
          item: comprovante_id,
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
    index: number,
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
