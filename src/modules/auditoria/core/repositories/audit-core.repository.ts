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
  totalPages: number;
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
        totalPages: Math.ceil(total / limit),
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

      return {
        totalEvents,
        eventsByType,
        eventsByRiskLevel,
        lgpdEvents,
        averageProcessingTime: 0, // TODO: Calcular tempo médio de processamento
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
