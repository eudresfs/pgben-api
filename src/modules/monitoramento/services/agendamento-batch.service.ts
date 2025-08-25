import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AgendamentoVisita } from '../entities/agendamento-visita.entity';
import { Usuario } from '../../../entities/usuario.entity';
import { Cidadao } from '../../../entities/cidadao.entity';
import { Unidade } from '../../../entities/unidade.entity';
import { CriarAgendamentoDto } from '../dto/criar-agendamento.dto';
import { StatusAgendamento } from '../enums';

/**
 * Interface para resultado de processamento em lote
 */
interface BatchResult<T> {
  success: T[];
  errors: { item: any; error: string }[];
  total: number;
  successCount: number;
  errorCount: number;
}

/**
 * Interface para opções de processamento em lote
 */
interface BatchProcessOptions {
  batchSize?: number;
  maxConcurrency?: number;
  continueOnError?: boolean;
  useTransaction?: boolean;
}

/**
 * Serviço para processamento em lote de operações de agendamento
 * Otimizado para alta performance e confiabilidade
 * 
 * @description
 * Implementa operações de criação em lote de agendamentos de visitas domiciliares,
 * seguindo os padrões de arquitetura estabelecidos no sistema PGBEN.
 * 
 * @author Sistema PGBEN
 * @since 2025-01-15
 */
@Injectable()
export class AgendamentoBatchService {
  private readonly logger = new Logger(AgendamentoBatchService.name);
  private readonly DEFAULT_BATCH_SIZE = 100;
  private readonly DEFAULT_MAX_CONCURRENCY = 5;

  constructor(
    @InjectRepository(AgendamentoVisita)
    private readonly agendamentoRepository: Repository<AgendamentoVisita>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Cidadao)
    private readonly cidadaoRepository: Repository<Cidadao>,
    @InjectRepository(Unidade)
    private readonly unidadeRepository: Repository<Unidade>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Cria múltiplos agendamentos em lote
   * 
   * @param agendamentosData Array de dados para criação de agendamentos
   * @param userId ID do usuário que está criando os agendamentos
   * @param options Opções de processamento em lote
   * @returns Resultado do processamento em lote
   */
  async createAgendamentosInBatch(
    agendamentosData: CriarAgendamentoDto[],
    userId: string,
    options: BatchProcessOptions = {},
  ): Promise<BatchResult<AgendamentoVisita>> {
    const {
      batchSize = this.DEFAULT_BATCH_SIZE,
      maxConcurrency = this.DEFAULT_MAX_CONCURRENCY,
      continueOnError = true,
      useTransaction = true,
    } = options;

    this.logger.log(
      `Iniciando criação em lote de ${agendamentosData.length} agendamentos`,
    );

    const result: BatchResult<AgendamentoVisita> = {
      success: [],
      errors: [],
      total: agendamentosData.length,
      successCount: 0,
      errorCount: 0,
    };

    // Dividir em lotes
    const batches = this.chunkArray(agendamentosData, batchSize);

    // Processar lotes com controle de concorrência
    const semaphore = new Array(maxConcurrency).fill(null);
    const batchPromises = batches.map((batch, index) =>
      this.processBatchWithSemaphore(
        semaphore,
        () => this.processAgendamentoBatch(batch, userId, useTransaction),
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

    return result;
  }

  /**
   * Processa um lote de agendamentos
   * 
   * @param batch Lote de dados de agendamentos
   * @param userId ID do usuário
   * @param useTransaction Se deve usar transação
   * @returns Resultado do processamento do lote
   */
  private async processAgendamentoBatch(
    batch: CriarAgendamentoDto[],
    userId: string,
    useTransaction: boolean,
  ): Promise<BatchResult<AgendamentoVisita>> {
    const result: BatchResult<AgendamentoVisita> = {
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
        const agendamentos: AgendamentoVisita[] = [];
        
        for (const agendamentoData of batch) {
          try {
            // Validar entidades relacionadas
            await this.validateRelatedEntities(agendamentoData, queryRunner);

            // Criar agendamento
            const agendamento = queryRunner.manager.create(AgendamentoVisita, {
              beneficiario_id: agendamentoData.beneficiario_id,
              tecnico_id: agendamentoData.tecnico_id,
              unidade_id: agendamentoData.unidade_id,
              concessao_id: agendamentoData.concessao_id,
              data_agendamento: new Date(agendamentoData.data_agendamento),
              tipo_visita: agendamentoData.tipo_visita,
              prioridade: agendamentoData.prioridade,
              observacoes: agendamentoData.observacoes,
              status: StatusAgendamento.AGENDADO,
              created_by: userId,
              updated_by: userId,
            });

            agendamentos.push(agendamento);
          } catch (error) {
            this.logger.error(
              `Erro ao criar agendamento em lote: ${error.message}`,
              error.stack,
            );
            result.errors.push({
              item: agendamentoData,
              error: error.message,
            });
          }
        }

        // Salvar agendamentos em lote
        if (agendamentos.length > 0) {
          const savedAgendamentos = await queryRunner.manager.save(AgendamentoVisita, agendamentos);
          result.success.push(...savedAgendamentos);
        }

        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        this.logger.error(
          `Erro na transação do lote: ${error.message}`,
          error.stack,
        );
        throw error;
      } finally {
        await queryRunner.release();
      }
    } else {
      // Processamento sem transação
      for (const agendamentoData of batch) {
        try {
          // Validar entidades relacionadas
          await this.validateRelatedEntities(agendamentoData);

          // Criar agendamento
          const agendamento = this.agendamentoRepository.create({
            beneficiario_id: agendamentoData.beneficiario_id,
            tecnico_id: agendamentoData.tecnico_id,
            unidade_id: agendamentoData.unidade_id,
            concessao_id: agendamentoData.concessao_id,
            data_agendamento: new Date(agendamentoData.data_agendamento),
            tipo_visita: agendamentoData.tipo_visita,
            prioridade: agendamentoData.prioridade,
            observacoes: agendamentoData.observacoes,
            status: StatusAgendamento.AGENDADO,
          });

          const savedAgendamento = await this.agendamentoRepository.save(agendamento);
          result.success.push(savedAgendamento);
        } catch (error) {
          this.logger.error(
            `Erro ao criar agendamento em lote: ${error.message}`,
            error.stack,
          );
          result.errors.push({
            item: agendamentoData,
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
   * Valida entidades relacionadas ao agendamento
   * 
   * @param agendamentoData Dados do agendamento
   * @param queryRunner Query runner opcional para transações
   */
  private async validateRelatedEntities(
    agendamentoData: CriarAgendamentoDto,
    queryRunner?: any,
  ): Promise<void> {
    const manager = queryRunner?.manager || this.dataSource.manager;

    // Validar beneficiário
    const beneficiario = await manager.findOne(Cidadao, {
      where: { id: agendamentoData.beneficiario_id },
    });
    if (!beneficiario) {
      throw new Error(`Beneficiário não encontrado: ${agendamentoData.beneficiario_id}`);
    }

    // Validar técnico
    const tecnico = await manager.findOne(Usuario, {
      where: { id: agendamentoData.tecnico_id },
    });
    if (!tecnico) {
      throw new Error(`Técnico não encontrado: ${agendamentoData.tecnico_id}`);
    }

    // Validar unidade
    const unidade = await manager.findOne(Unidade, {
      where: { id: agendamentoData.unidade_id },
    });
    if (!unidade) {
      throw new Error(`Unidade não encontrada: ${agendamentoData.unidade_id}`);
    }

    // Validar data do agendamento (não pode ser no passado)
    const dataAgendamento = new Date(agendamentoData.data_agendamento);
    const agora = new Date();
    if (dataAgendamento < agora) {
      throw new Error('Data do agendamento não pode ser no passado');
    }
  }

  /**
   * Processa lote com controle de semáforo para concorrência
   * 
   * @param semaphore Array de semáforo
   * @param task Tarefa a ser executada
   * @param index Índice do lote
   * @returns Resultado da tarefa
   */
  private async processBatchWithSemaphore<T>(
    semaphore: any[],
    task: () => Promise<T>,
    index: number,
  ): Promise<T> {
    // Aguardar slot disponível no semáforo
    while (semaphore.every(slot => slot !== null)) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Ocupar slot
    const slotIndex = semaphore.findIndex(slot => slot === null);
    semaphore[slotIndex] = index;

    try {
      return await task();
    } finally {
      // Liberar slot
      semaphore[slotIndex] = null;
    }
  }

  /**
   * Divide array em chunks menores
   * 
   * @param array Array a ser dividido
   * @param size Tamanho de cada chunk
   * @returns Array de chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}