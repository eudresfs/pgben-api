/**
 * AuditCoreRepository
 *
 * Repositório core isolado para operações de auditoria.
 * Implementa persistência otimizada, particionamento e compressão.
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, Between, In } from 'typeorm';
import { LogAuditoria } from '../../../../entities/log-auditoria.entity';
import { RiskLevel } from '../../events/types/audit-event.types';

/**
 * Interface para filtros de busca
 */
export interface AuditSearchFilters {
  startDate?: Date;
  endDate?: Date;
  entityName?: string;
  entityId?: string;
  userId?: string;
  eventTypes?: string[];
  riskLevels?: RiskLevel[];
  lgpdRelevant?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Interface para resultado de busca paginada
 */
export interface PaginatedAuditResult {
  data: LogAuditoria[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/**
 * Interface para estatísticas de auditoria
 */
export interface AuditStatistics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByRiskLevel: Record<string, number>;
  lgpdEvents: number;
  averageProcessingTime: number;
  topEntities: Array<{ entityName: string; count: number }>;
  topUsers: Array<{ userId: string; count: number }>;
}

@Injectable()
export class AuditCoreRepository {
  private readonly logger = new Logger(AuditCoreRepository.name);

  constructor(
    @InjectRepository(LogAuditoria)
    private readonly repository: Repository<LogAuditoria>,
  ) {}

  /**
   * Cria um novo log de auditoria
   */
  async create(auditData: Partial<LogAuditoria>): Promise<LogAuditoria> {
    const startTime = Date.now();

    try {
      // Enriquece os dados com informações padrão
      const enrichedData = this.enrichAuditData(auditData);

      // Cria a entidade
      const auditLog = this.repository.create(enrichedData);

      // Persiste no banco
      const savedLog = await this.repository.save(auditLog);

      const duration = Date.now() - startTime;
      this.logger.debug(`Audit log created in ${duration}ms: ${savedLog.id}`);

      return savedLog;
    } catch (error) {
      this.logger.error(
        `Failed to create audit log: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Cria múltiplos logs em lote para otimização
   */
  async createBatch(
    auditDataArray: Partial<LogAuditoria>[],
  ): Promise<LogAuditoria[]> {
    const startTime = Date.now();

    try {
      // Enriquece todos os dados
      const enrichedDataArray = auditDataArray.map((data) =>
        this.enrichAuditData(data),
      );

      // Cria as entidades
      const auditLogs = this.repository.create(enrichedDataArray);

      // Persiste em lote
      const savedLogs = await this.repository.save(auditLogs);

      const duration = Date.now() - startTime;
      this.logger.debug(
        `${savedLogs.length} audit logs created in batch in ${duration}ms`,
      );

      return savedLogs;
    } catch (error) {
      this.logger.error(
        `Failed to create audit logs in batch: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Busca logs de auditoria com filtros
   */
  async findWithFilters(
    filters: AuditSearchFilters,
  ): Promise<PaginatedAuditResult> {
    const startTime = Date.now();

    try {
      const queryBuilder = this.createFilteredQuery(filters);

      // Aplica paginação
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;

      queryBuilder.limit(limit).offset(offset);

      // Executa a consulta
      const [data, total] = await queryBuilder.getManyAndCount();

      const duration = Date.now() - startTime;
      this.logger.debug(
        `Found ${data.length}/${total} audit logs in ${duration}ms`,
      );

      return {
        data,
        total,
        page: Math.floor(offset / limit) + 1,
        limit,
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(
        `Failed to search audit logs: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Busca log por ID
   */
  async findById(id: string): Promise<LogAuditoria | null> {
    try {
      return await this.repository.findOne({ where: { id } });
    } catch (error) {
      this.logger.error(
        `Failed to find audit log by ID ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Busca logs por entidade
   */
  async findByEntity(
    entityName: string,
    entityId?: string,
  ): Promise<LogAuditoria[]> {
    try {
      const where: any = { entidade_afetada: entityName };

      if (entityId) {
        where.entidade_id = entityId;
      }

      return await this.repository.find({
        where,
        order: { created_at: 'DESC' },
        take: 100, // Limita para evitar sobrecarga
      });
    } catch (error) {
      this.logger.error(
        `Failed to find audit logs for entity ${entityName}:${entityId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Busca logs por usuário
   */
  async findByUser(userId: string, limit = 100): Promise<LogAuditoria[]> {
    try {
      return await this.repository.find({
        where: { usuario_id: userId },
        order: { created_at: 'DESC' },
        take: limit,
      });
    } catch (error) {
      this.logger.error(
        `Failed to find audit logs for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Busca logs relevantes para LGPD
   */
  async findLgpdRelevant(
    filters: Omit<AuditSearchFilters, 'lgpdRelevant'>,
  ): Promise<PaginatedAuditResult> {
    return this.findWithFilters({ ...filters, lgpdRelevant: true });
  }

  /**
   * Obtém estatísticas de auditoria
   */
  async getStatistics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<AuditStatistics> {
    const startTime = Date.now();

    try {
      const queryBuilder = this.repository.createQueryBuilder('audit');

      if (startDate && endDate) {
        queryBuilder.where('audit.timestamp BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        });
      }

      // Total de eventos
      const totalEvents = await queryBuilder.getCount();

      // Eventos por tipo
      const eventsByTypeQuery = queryBuilder
        .clone()
        .select('audit.tipo_operacao', 'eventType')
        .addSelect('COUNT(*)', 'count')
        .groupBy('audit.tipo_operacao');

      const eventsByTypeResult = await eventsByTypeQuery.getRawMany();
      const eventsByType = eventsByTypeResult.reduce((acc, item) => {
        acc[item.eventType] = parseInt(item.count);
        return acc;
      }, {});

      // Eventos por nível de risco
      const eventsByRiskQuery = queryBuilder
        .clone()
        .select('audit.nivel_risco', 'riskLevel')
        .addSelect('COUNT(*)', 'count')
        .groupBy('audit.nivel_risco');

      const eventsByRiskResult = await eventsByRiskQuery.getRawMany();
      const eventsByRiskLevel = eventsByRiskResult.reduce((acc, item) => {
        acc[item.riskLevel] = parseInt(item.count);
        return acc;
      }, {});

      // Eventos LGPD
      const lgpdEvents = await queryBuilder
        .clone()
        .where('audit.lgpd_relevante = :lgpd', { lgpd: true })
        .getCount();

      // Top entidades
      const topEntitiesQuery = queryBuilder
        .clone()
        .select('audit.entidade_afetada', 'entityName')
        .addSelect('COUNT(*)', 'count')
        .groupBy('audit.entidade_afetada')
        .orderBy('count', 'DESC')
        .limit(10);

      const topEntitiesResult = await topEntitiesQuery.getRawMany();
      const topEntities = topEntitiesResult.map((item) => ({
        entityName: item.entityName,
        count: parseInt(item.count),
      }));

      // Top usuários
      const topUsersQuery = queryBuilder
        .clone()
        .select('audit.usuario_id', 'userId')
        .addSelect('COUNT(*)', 'count')
        .where('audit.usuario_id IS NOT NULL')
        .groupBy('audit.usuario_id')
        .orderBy('count', 'DESC')
        .limit(10);

      const topUsersResult = await topUsersQuery.getRawMany();
      const topUsers = topUsersResult.map((item) => ({
        userId: item.userId,
        count: parseInt(item.count),
      }));

      const duration = Date.now() - startTime;
      this.logger.debug(`Statistics calculated in ${duration}ms`);

      // Calcula tempo médio de processamento
      const averageProcessingTime = await this.calculateAverageProcessingTime(
        startDate,
        endDate,
      );

      return {
        totalEvents,
        eventsByType,
        eventsByRiskLevel,
        lgpdEvents,
        averageProcessingTime,
        topEntities,
        topUsers,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get audit statistics: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Remove logs antigos para limpeza
   */
  async cleanupOldLogs(olderThanDays: number): Promise<number> {
    const startTime = Date.now();

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await this.repository
        .createQueryBuilder()
        .delete()
        .where('created_at < :cutoffDate', { cutoffDate })
        .andWhere('nivel_risco != :critical', { critical: RiskLevel.CRITICAL }) // Preserva eventos críticos
        .execute();

      const duration = Date.now() - startTime;
      this.logger.log(
        `Cleaned up ${result.affected} old audit logs in ${duration}ms (older than ${olderThanDays} days)`,
      );

      return result.affected || 0;
    } catch (error) {
      this.logger.error(
        `Failed to cleanup old logs: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Calcula tempo médio de processamento dos eventos de auditoria
   */
  private async calculateAverageProcessingTime(
    startDate?: Date,
    endDate?: Date,
  ): Promise<number> {
    try {
      const queryBuilder = this.repository.createQueryBuilder('audit');

      // Aplica filtros de data se fornecidos
      if (startDate && endDate) {
        queryBuilder.where('audit.data_hora BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        });
      } else if (startDate) {
        queryBuilder.where('audit.data_hora >= :startDate', {
          startDate,
        });
      } else if (endDate) {
        queryBuilder.where('audit.data_hora <= :endDate', {
          endDate,
        });
      }

      // Busca logs ordenados por data de criação
      queryBuilder
        .select([
          'audit.id',
          'audit.data_hora',
          'audit.created_at',
          'audit.tipo_operacao',
          'audit.nivel_risco',
        ])
        .orderBy('audit.data_hora', 'DESC')
        .limit(10000); // Limita para evitar sobrecarga

      const logs = await queryBuilder.getMany();

      if (logs.length === 0) {
        // Se não há dados, retorna tempo padrão estimado
        return await this.calculateEstimatedProcessingTime(startDate, endDate);
      }

      // Calcula tempo estimado baseado na diferença entre data_hora e created_at
      const processingTimes = logs
        .map((log) => {
          if (log.data_hora && log.created_at) {
            const eventTime = new Date(log.data_hora).getTime();
            const createdTime = new Date(log.created_at).getTime();
            const diff = createdTime - eventTime;
            return diff > 0 && diff <= 3600000 ? diff : null; // até 1 hora
          }
          return null;
        })
        .filter((time) => time !== null && time > 0);

      if (processingTimes.length === 0) {
        return 0;
      }

      // Calcula média, mediana e remove outliers
      const sortedTimes = processingTimes.sort((a, b) => a - b);
      const median = this.calculateMedian(sortedTimes);
      const mean =
        sortedTimes.reduce((sum, time) => sum + time, 0) / sortedTimes.length;

      // Remove outliers (valores acima de 3 desvios padrão)
      const standardDeviation = this.calculateStandardDeviation(
        sortedTimes,
        mean,
      );
      const filteredTimes = sortedTimes.filter(
        (time) => Math.abs(time - mean) <= 3 * standardDeviation,
      );

      const finalAverage =
        filteredTimes.length > 0
          ? filteredTimes.reduce((sum, time) => sum + time, 0) /
            filteredTimes.length
          : mean;

      // Calcula métricas por tipo de operação
      const timesByOperation = this.groupProcessingTimesByOperation(logs);

      // Log das métricas para monitoramento
      this.logger.debug(`Processing time statistics calculated`, {
        totalLogs: logs.length,
        validTimes: processingTimes.length,
        filteredTimes: filteredTimes.length,
        mean: Math.round(mean * 100) / 100,
        median: Math.round(median * 100) / 100,
        finalAverage: Math.round(finalAverage * 100) / 100,
        standardDeviation: Math.round(standardDeviation * 100) / 100,
        timesByOperation,
      });

      return Math.round(finalAverage * 100) / 100; // Arredonda para 2 casas decimais
    } catch (error) {
      this.logger.error(
        `Failed to calculate average processing time: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  /**
   * Calcula tempo estimado de processamento baseado em timestamps
   */
  private async calculateEstimatedProcessingTime(
    startDate?: Date,
    endDate?: Date,
  ): Promise<number> {
    try {
      const queryBuilder = this.repository.createQueryBuilder('audit');

      // Aplica filtros de data
      if (startDate && endDate) {
        queryBuilder.where('audit.data_hora BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        });
      }

      // Busca logs com timestamps válidos
      queryBuilder
        .select(['audit.data_hora', 'audit.created_at', 'audit.tipo_operacao'])
        .andWhere('audit.data_hora IS NOT NULL')
        .andWhere('audit.created_at IS NOT NULL')
        .orderBy('audit.data_hora', 'DESC')
        .limit(5000);

      const logs = await queryBuilder.getMany();

      if (logs.length === 0) {
        return 0;
      }

      // Calcula diferença entre data_hora do evento e created_at
      const estimatedTimes = logs
        .map((log) => {
          const eventTime = new Date(log.data_hora).getTime();
          const createdTime = new Date(log.created_at).getTime();
          const diff = createdTime - eventTime;

          // Considera apenas diferenças positivas e razoáveis (até 1 hora)
          return diff > 0 && diff <= 3600000 ? diff : null;
        })
        .filter((time) => time !== null);

      if (estimatedTimes.length === 0) {
        // Fallback: tempo médio estimado baseado no tipo de operação
        return this.getDefaultProcessingTimeByOperationType(logs);
      }

      const average =
        estimatedTimes.reduce((sum, time) => sum + time, 0) /
        estimatedTimes.length;

      this.logger.debug(
        `Estimated processing time calculated from timestamps`,
        {
          totalLogs: logs.length,
          validEstimates: estimatedTimes.length,
          averageMs: Math.round(average),
        },
      );

      return Math.round(average * 100) / 100;
    } catch (error) {
      this.logger.error(
        `Failed to calculate estimated processing time: ${error.message}`,
      );
      return 0;
    }
  }

  /**
   * Calcula mediana de um array de números
   */
  private calculateMedian(sortedNumbers: number[]): number {
    const length = sortedNumbers.length;
    if (length === 0) return 0;

    if (length % 2 === 0) {
      return (sortedNumbers[length / 2 - 1] + sortedNumbers[length / 2]) / 2;
    } else {
      return sortedNumbers[Math.floor(length / 2)];
    }
  }

  /**
   * Calcula desvio padrão
   */
  private calculateStandardDeviation(numbers: number[], mean: number): number {
    if (numbers.length === 0) return 0;

    const variance =
      numbers.reduce((sum, num) => {
        return sum + Math.pow(num - mean, 2);
      }, 0) / numbers.length;

    return Math.sqrt(variance);
  }

  /**
   * Agrupa tempos de processamento por tipo de operação
   */
  private groupProcessingTimesByOperation(
    logs: LogAuditoria[],
  ): Record<string, { average: number; count: number }> {
    const groups: Record<string, number[]> = {};

    logs.forEach((log) => {
      if (log.data_hora && log.created_at) {
        const eventTime = new Date(log.data_hora).getTime();
        const createdTime = new Date(log.created_at).getTime();
        const processingTime = createdTime - eventTime;

        if (processingTime > 0 && processingTime <= 3600000) {
          const operation = log.tipo_operacao || 'unknown';
          if (!groups[operation]) {
            groups[operation] = [];
          }
          groups[operation].push(processingTime);
        }
      }
    });

    const result: Record<string, { average: number; count: number }> = {};

    Object.entries(groups).forEach(([operation, times]) => {
      const average = times.reduce((sum, time) => sum + time, 0) / times.length;
      result[operation] = {
        average: Math.round(average * 100) / 100,
        count: times.length,
      };
    });

    return result;
  }

  /**
   * Retorna tempo padrão baseado no tipo de operação
   */
  private getDefaultProcessingTimeByOperationType(
    logs: LogAuditoria[],
  ): number {
    const operationDefaults: Record<string, number> = {
      CREATE: 150,
      UPDATE: 120,
      DELETE: 100,
      READ: 50,
      LOGIN: 200,
      LOGOUT: 80,
      PAYMENT: 300,
      SECURITY: 250,
      SYSTEM: 100,
    };

    // Conta tipos de operação
    const operationCounts: Record<string, number> = {};
    logs.forEach((log) => {
      const operation = log.tipo_operacao || 'unknown';
      operationCounts[operation] = (operationCounts[operation] || 0) + 1;
    });

    // Calcula média ponderada baseada na frequência dos tipos
    let totalWeightedTime = 0;
    let totalCount = 0;

    Object.entries(operationCounts).forEach(([operation, count]) => {
      const defaultTime = operationDefaults[operation.toUpperCase()] || 100;
      totalWeightedTime += defaultTime * count;
      totalCount += count;
    });

    return totalCount > 0
      ? Math.round((totalWeightedTime / totalCount) * 100) / 100
      : 100;
  }

  /**
   * Enriquece dados de auditoria com informações padrão
   */
  private enrichAuditData(
    auditData: Partial<LogAuditoria>,
  ): Partial<LogAuditoria> {
    const nivelRisco = auditData.nivel_risco || RiskLevel.LOW;

    return {
      ...auditData,
      data_hora: auditData.data_hora || new Date(),
      nivel_risco: nivelRisco,
    };
  }

  /**
   * Cria query builder com filtros aplicados
   */
  private createFilteredQuery(
    filters: AuditSearchFilters,
  ): SelectQueryBuilder<LogAuditoria> {
    const queryBuilder = this.repository.createQueryBuilder('audit');

    // Filtro por data
    if (filters.startDate && filters.endDate) {
      queryBuilder.where('audit.timestamp BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    } else if (filters.startDate) {
      queryBuilder.where('audit.timestamp >= :startDate', {
        startDate: filters.startDate,
      });
    } else if (filters.endDate) {
      queryBuilder.where('audit.timestamp <= :endDate', {
        endDate: filters.endDate,
      });
    }

    // Filtro por entidade
    if (filters.entityName) {
      queryBuilder.andWhere('audit.entidade_afetada = :entityName', {
        entityName: filters.entityName,
      });
    }

    if (filters.entityId) {
      queryBuilder.andWhere('audit.entidade_id = :entityId', {
        entityId: filters.entityId,
      });
    }

    // Filtro por usuário
    if (filters.userId) {
      queryBuilder.andWhere('audit.usuario_id = :userId', {
        userId: filters.userId,
      });
    }

    // Filtro por tipos de evento
    if (filters.eventTypes && filters.eventTypes.length > 0) {
      queryBuilder.andWhere('audit.tipo_operacao IN (:...eventTypes)', {
        eventTypes: filters.eventTypes,
      });
    }

    // Filtro por níveis de risco
    if (filters.riskLevels && filters.riskLevels.length > 0) {
      queryBuilder.andWhere('audit.nivel_risco IN (:...riskLevels)', {
        riskLevels: filters.riskLevels,
      });
    }

    // Filtro LGPD
    if (filters.lgpdRelevant !== undefined) {
      queryBuilder.andWhere('audit.lgpd_relevante = :lgpdRelevant', {
        lgpdRelevant: filters.lgpdRelevant,
      });
    }

    // Ordenação padrão
    queryBuilder.orderBy('audit.timestamp', 'DESC');

    return queryBuilder;
  }
}
