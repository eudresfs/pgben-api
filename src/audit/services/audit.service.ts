import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, FindOptionsWhere } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  AuditLog,
  AuditAction,
  AuditSeverity,
} from '../entities/audit-log.entity';
import {
  CreateAuditLogDto,
  AuditLogQueryDto,
  AuditLogResponseDto,
  AuditLogStatsDto,
} from '../dto/audit-log.dto';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Cria um novo log de auditoria
   */
  async createLog(createAuditLogDto: CreateAuditLogDto): Promise<AuditLog> {
    try {
      const auditLog = this.auditLogRepository.create({
        ...createAuditLogDto,
        severity: createAuditLogDto.severity || AuditSeverity.LOW,
      });

      const savedLog = await this.auditLogRepository.save(auditLog);

      // Log crítico ou de alta severidade deve ser registrado no console
      if (savedLog.isHighRisk()) {
        this.logger.warn(
          `[AUDIT ${savedLog.severity}] ${savedLog.getFormattedMessage()}`,
          {
            id: savedLog.id,
            action: savedLog.action,
            resource: `${savedLog.resource_type}:${savedLog.resource_id}`,
            user: savedLog.usuario_id,
            ip: savedLog.client_ip,
            metadata: savedLog.metadata,
          },
        );
      }

      return savedLog;
    } catch (error) {
      this.logger.error('Erro ao criar log de auditoria', error.stack);
      throw error;
    }
  }

  /**
   * Busca logs de auditoria com filtros e paginação
   */
  async findLogs(
    queryDto: AuditLogQueryDto,
  ): Promise<{
    data: AuditLogResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      usuario_id,
      action,
      resource_type,
      resource_id,
      severity,
      client_ip,
      start_date,
      end_date,
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'DESC',
      security_events_only,
      critical_only,
    } = queryDto;

    const where: FindOptionsWhere<AuditLog> = {};

    // Aplicar filtros
    if (usuario_id) where.usuario_id = usuario_id;
    if (action) where.action = action;
    if (resource_type) where.resource_type = resource_type;
    if (resource_id) where.resource_id = resource_id;
    if (severity) where.severity = severity;
    if (client_ip) where.client_ip = client_ip;

    // Filtro de data
    if (start_date || end_date) {
      const startDate = start_date ? new Date(start_date) : new Date('1970-01-01');
      const endDate = end_date ? new Date(end_date) : new Date();
      where.created_at = Between(startDate, endDate);
    }

    // Filtros especiais
    if (security_events_only) {
      where.action = In([
        AuditAction.LOGIN,
        AuditAction.LOGOUT,
        AuditAction.LOGIN_FAILED,
        AuditAction.PASSWORD_RESET,
        AuditAction.PASSWORD_CHANGE,
        AuditAction.PERMISSION_DENIED,
        AuditAction.TOKEN_REFRESH,
        AuditAction.TOKEN_REVOKE,
      ]);
    }

    if (critical_only) {
      where.severity = In([AuditSeverity.HIGH, AuditSeverity.CRITICAL]);
    }

    const [logs, total] = await this.auditLogRepository.findAndCount({
      where,
      relations: ['usuario'],
      order: { [sort_by]: sort_order },
      skip: (page - 1) * limit,
      take: limit,
    });

    const data = logs.map(log => this.mapToResponseDto(log));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Busca um log específico por ID
   */
  async findLogById(id: string): Promise<AuditLogResponseDto | null> {
    const log = await this.auditLogRepository.findOne({
      where: { id },
      relations: ['usuario'],
    });

    return log ? this.mapToResponseDto(log) : null;
  }

  /**
   * Gera estatísticas de auditoria
   */
  async getStats(
    startDate?: Date,
    endDate?: Date,
  ): Promise<AuditLogStatsDto> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 dias atrás
    const end = endDate || new Date();

    const where: FindOptionsWhere<AuditLog> = {
      created_at: Between(start, end),
    };

    // Total de logs
    const totalLogs = await this.auditLogRepository.count({ where });

    // Logs por ação
    const logsByAction = await this.auditLogRepository
      .createQueryBuilder('log')
      .select('log.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .where('log.created_at BETWEEN :start AND :end', { start, end })
      .groupBy('log.action')
      .getRawMany();

    // Logs por severidade
    const logsBySeverity = await this.auditLogRepository
      .createQueryBuilder('log')
      .select('log.severity', 'severity')
      .addSelect('COUNT(*)', 'count')
      .where('log.created_at BETWEEN :start AND :end', { start, end })
      .groupBy('log.severity')
      .getRawMany();

    // Top usuários
    const topUsers = await this.auditLogRepository
      .createQueryBuilder('log')
      .leftJoin('log.usuario', 'usuario')
      .select('log.usuario_id', 'usuario_id')
      .addSelect('usuario.nome', 'nome')
      .addSelect('COUNT(*)', 'count')
      .where('log.created_at BETWEEN :start AND :end', { start, end })
      .andWhere('log.usuario_id IS NOT NULL')
      .groupBy('log.usuario_id, usuario.nome')
      .orderBy('COUNT(*)', 'DESC')
      .limit(10)
      .getRawMany();

    // Eventos de segurança recentes (últimas 24h)
    const recentSecurityEvents = await this.auditLogRepository.count({
      where: {
        created_at: Between(
          new Date(Date.now() - 24 * 60 * 60 * 1000),
          new Date(),
        ),
        action: In([
          AuditAction.LOGIN,
          AuditAction.LOGOUT,
          AuditAction.LOGIN_FAILED,
          AuditAction.PASSWORD_RESET,
          AuditAction.PASSWORD_CHANGE,
          AuditAction.PERMISSION_DENIED,
          AuditAction.TOKEN_REFRESH,
          AuditAction.TOKEN_REVOKE,
        ]),
      },
    });

    // Eventos críticos recentes (últimas 24h)
    const recentCriticalEvents = await this.auditLogRepository.count({
      where: {
        created_at: Between(
          new Date(Date.now() - 24 * 60 * 60 * 1000),
          new Date(),
        ),
        severity: In([AuditSeverity.HIGH, AuditSeverity.CRITICAL]),
      },
    });

    return {
      total_logs: totalLogs,
      logs_by_action: logsByAction.reduce(
        (acc, item) => ({ ...acc, [item.action]: parseInt(item.count) }),
        {},
      ),
      logs_by_severity: logsBySeverity.reduce(
        (acc, item) => ({ ...acc, [item.severity]: parseInt(item.count) }),
        {},
      ),
      top_users: topUsers.map(user => ({
        usuario_id: user.usuario_id,
        nome: user.nome || 'Usuário Desconhecido',
        count: parseInt(user.count),
      })),
      recent_security_events: recentSecurityEvents,
      recent_critical_events: recentCriticalEvents,
      period: {
        start_date: start.toISOString(),
        end_date: end.toISOString(),
      },
    };
  }

  /**
   * Remove logs antigos (executado automaticamente)
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldLogs(): Promise<void> {
    try {
      // Remove logs com mais de 1 ano (exceto críticos)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const result = await this.auditLogRepository
        .createQueryBuilder()
        .delete()
        .where('created_at < :date', { date: oneYearAgo })
        .andWhere('severity NOT IN (:...severities)', {
          severities: [AuditSeverity.HIGH, AuditSeverity.CRITICAL],
        })
        .execute();

      this.logger.log(
        `Limpeza automática: ${result.affected} logs antigos removidos`,
      );

      // Remove logs críticos com mais de 2 anos
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      const criticalResult = await this.auditLogRepository
        .createQueryBuilder()
        .delete()
        .where('created_at < :date', { date: twoYearsAgo })
        .andWhere('severity IN (:...severities)', {
          severities: [AuditSeverity.HIGH, AuditSeverity.CRITICAL],
        })
        .execute();

      this.logger.log(
        `Limpeza automática: ${criticalResult.affected} logs críticos antigos removidos`,
      );
    } catch (error) {
      this.logger.error('Erro na limpeza automática de logs', error.stack);
    }
  }

  /**
   * Métodos de conveniência para logging específico
   */
  async logUserAction(
    usuarioId: string,
    action: AuditAction,
    resourceType: string,
    resourceId?: string,
    description?: string,
    metadata?: Record<string, any>,
    request?: {
      ip?: string;
      userAgent?: string;
      method?: string;
      url?: string;
    },
  ): Promise<void> {
    await this.createLog({
      usuario_id: usuarioId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      description,
      severity: this.getSeverityForAction(action),
      client_ip: request?.ip,
      user_agent: request?.userAgent,
      request_method: request?.method,
      request_url: request?.url,
      metadata,
    });
  }

  async logSecurityEvent(
    action: AuditAction,
    description: string,
    usuarioId?: string,
    severity: AuditSeverity = AuditSeverity.HIGH,
    metadata?: Record<string, any>,
    request?: {
      ip?: string;
      userAgent?: string;
    },
  ): Promise<void> {
    await this.createLog({
      usuario_id: usuarioId,
      action,
      resource_type: 'Security',
      description,
      severity,
      client_ip: request?.ip,
      user_agent: request?.userAgent,
      metadata,
    });
  }

  async logSystemEvent(
    action: AuditAction,
    description: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.createLog({
      action,
      resource_type: 'System',
      description,
      severity: AuditSeverity.LOW,
      metadata,
    });
  }

  /**
   * Métodos privados
   */
  private mapToResponseDto(log: AuditLog): AuditLogResponseDto {
    return {
      id: log.id,
      usuario_id: log.usuario_id,
      usuario: log.usuario
        ? {
            id: log.usuario.id,
            nome: log.usuario.nome,
            email: log.usuario.email,
          }
        : undefined,
      action: log.action,
      resource_type: log.resource_type,
      resource_id: log.resource_id,
      description: log.description,
      severity: log.severity,
      client_ip: log.client_ip,
      user_agent: log.user_agent,
      created_at: log.created_at,
      metadata: log.metadata,
    };
  }

  private getSeverityForAction(action: AuditAction): AuditSeverity {
    const severityMap: Record<AuditAction, AuditSeverity> = {
      [AuditAction.CREATE]: AuditSeverity.LOW,
      [AuditAction.READ]: AuditSeverity.LOW,
      [AuditAction.UPDATE]: AuditSeverity.LOW,
      [AuditAction.DELETE]: AuditSeverity.MEDIUM,
      [AuditAction.LOGIN]: AuditSeverity.LOW,
      [AuditAction.LOGOUT]: AuditSeverity.LOW,
      [AuditAction.LOGIN_FAILED]: AuditSeverity.MEDIUM,
      [AuditAction.PASSWORD_RESET]: AuditSeverity.HIGH,
      [AuditAction.PASSWORD_CHANGE]: AuditSeverity.MEDIUM,
      [AuditAction.PERMISSION_DENIED]: AuditSeverity.HIGH,
      [AuditAction.TOKEN_REFRESH]: AuditSeverity.LOW,
      [AuditAction.TOKEN_REVOKE]: AuditSeverity.MEDIUM,
      [AuditAction.EXPORT_DATA]: AuditSeverity.MEDIUM,
      [AuditAction.IMPORT_DATA]: AuditSeverity.MEDIUM,
      [AuditAction.SYSTEM_CONFIG]: AuditSeverity.HIGH,
    };

    return severityMap[action] || AuditSeverity.LOW;
  }
}