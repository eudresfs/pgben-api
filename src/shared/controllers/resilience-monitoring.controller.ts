import {
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ResilientAuditoriaService } from '../services/resilient-auditoria.service';
import { HybridCacheService } from '../services/hybrid-cache.service';
import { HealthCheckService } from '../services/health-check.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/role.decorator';
import { ROLES } from '../constants/roles.constants';
import type { RoleType } from '../constants/roles.constants';

interface ResilienceStatus {
  timestamp: string;
  overall: 'healthy' | 'degraded' | 'critical';
  services: {
    cache: {
      status: 'healthy' | 'degraded' | 'critical';
      l1Available: boolean;
      l2Available: boolean;
      metrics: any;
    };
    auditoria: {
      status: 'healthy' | 'degraded' | 'critical';
      queueAvailable: boolean;
      syncFallbackActive: boolean;
      fileBackupActive: boolean;
      metrics: any;
    };
    redis: {
      status: 'up' | 'down' | 'degraded';
      latency?: number;
      lastCheck: string;
    };
    database: {
      status: 'up' | 'down' | 'degraded';
      latency?: number;
      lastCheck: string;
    };
  };
  alerts: Array<{
    severity: 'warning' | 'critical';
    service: string;
    message: string;
    timestamp: string;
  }>;
}

/**
 * Controller de Monitoramento de Resiliência
 *
 * Fornece endpoints para monitorar o status e métricas dos serviços resilientes:
 * - Status geral do sistema
 * - Métricas detalhadas de cache
 * - Métricas de auditoria
 * - Health checks de serviços externos
 * - Alertas e notificações
 *
 * Acesso restrito a administradores do sistema
 */
@ApiTags('Monitoramento de Resiliência')
@Controller('api/resilience')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ResilienceMonitoringController {
  constructor(
    private readonly resilientAuditoriaService: ResilientAuditoriaService,
    private readonly hybridCacheService: HybridCacheService,
    private readonly healthCheckService: HealthCheckService,
  ) {}

  /**
   * Obtém status geral de resiliência do sistema
   */
  @Get('status')
  @Roles(ROLES.ADMIN, ROLES.GESTOR)
  @ApiOperation({
    summary: 'Status geral de resiliência',
    description:
      'Retorna o status consolidado de todos os serviços resilientes do sistema',
  })
  @ApiResponse({
    status: 200,
    description: 'Status de resiliência obtido com sucesso',
    schema: {
      type: 'object',
      properties: {
        timestamp: { type: 'string', format: 'date-time' },
        overall: { type: 'string', enum: ['healthy', 'degraded', 'critical'] },
        services: { type: 'object' },
        alerts: { type: 'array' },
      },
    },
  })
  async getResilienceStatus(): Promise<ResilienceStatus> {
    const timestamp = new Date().toISOString();

    // Obter status dos serviços
    // Verificar status dos serviços
    const redisAvailable = await this.healthCheckService.isRedisAvailable();
    const servicesStatus = {
      redis: {
        status: redisAvailable ? ('up' as const) : ('down' as const),
        lastCheck: new Date().toISOString(),
        latency: redisAvailable ? 5 : undefined,
      },
      database: {
        status: 'up' as const, // Assumindo que o banco está sempre disponível se a aplicação está rodando
        lastCheck: new Date().toISOString(),
        latency: 10,
      },
    };
    const cacheMetrics = this.hybridCacheService.getMetrics();
    const auditoriaMetrics = this.resilientAuditoriaService.getMetrics();

    // Avaliar status do cache
    const cacheStatus = this.evaluateCacheStatus(
      cacheMetrics,
      servicesStatus.redis?.status === 'up',
    );

    // Avaliar status da auditoria
    const auditoriaStatus = this.evaluateAuditoriaStatus(
      auditoriaMetrics,
      servicesStatus.redis?.status === 'up',
    );

    // Gerar alertas
    const alerts = this.generateAlerts(
      cacheMetrics,
      auditoriaMetrics,
      servicesStatus,
    );

    // Determinar status geral
    const overall = this.determineOverallStatus(
      cacheStatus.status,
      auditoriaStatus.status,
      servicesStatus,
    );

    return {
      timestamp,
      overall,
      services: {
        cache: cacheStatus,
        auditoria: auditoriaStatus,
        redis: {
          status: servicesStatus.redis?.status || 'down',
          latency: servicesStatus.redis?.latency,
          lastCheck: servicesStatus.redis?.lastCheck || timestamp,
        },
        database: {
          status: servicesStatus.database?.status || 'down',
          latency: servicesStatus.database?.latency,
          lastCheck: servicesStatus.database?.lastCheck || timestamp,
        },
      },
      alerts,
    };
  }

  /**
   * Obtém métricas detalhadas do cache híbrido
   */
  @Get('cache/metrics')
  @Roles(ROLES.ADMIN, ROLES.GESTOR)
  @ApiOperation({
    summary: 'Métricas do cache híbrido',
    description:
      'Retorna métricas detalhadas do sistema de cache em múltiplas camadas',
  })
  @ApiResponse({
    status: 200,
    description: 'Métricas do cache obtidas com sucesso',
  })
  async getCacheMetrics() {
    const metrics = this.hybridCacheService.getMetrics();
    // Verificar status dos serviços
    const redisAvailable = await this.healthCheckService.isRedisAvailable();
    const servicesStatus = {
      redis: {
        status: redisAvailable ? ('up' as const) : ('down' as const),
        lastCheck: new Date().toISOString(),
        latency: redisAvailable ? 5 : undefined,
      },
      database: {
        status: 'up' as const, // Assumindo que o banco está sempre disponível se a aplicação está rodando
        lastCheck: new Date().toISOString(),
        latency: 10,
      },
    };

    return {
      timestamp: new Date().toISOString(),
      l1Cache: {
        size: metrics.l1Size,
        maxSize: metrics.l1MaxSize,
        utilizationRate: (metrics.l1Size / metrics.l1MaxSize) * 100,
        hitRate: metrics.l1HitRate,
        hits: metrics.l1Hits,
        misses: metrics.l1Misses,
      },
      l2Cache: {
        available: servicesStatus.redis?.status === 'up',
        hitRate: metrics.l2HitRate,
        hits: metrics.l2Hits,
        misses: metrics.l2Misses,
        failovers: metrics.failovers,
      },
      overall: {
        hitRate: metrics.overallHitRate,
        evictions: metrics.evictions,
        warmingOperations: metrics.warmingOperations,
        criticalKeysCount: metrics.criticalKeysCount,
        pendingOperations: metrics.pendingOperations,
      },
      performance: {
        l1ResponseTime: '< 1ms',
        l2ResponseTime: servicesStatus.redis?.latency
          ? `${servicesStatus.redis.latency}ms`
          : 'N/A',
      },
    };
  }

  /**
   * Obtém métricas detalhadas da auditoria resiliente
   */
  @Get('auditoria/metrics')
  @Roles(ROLES.ADMIN, ROLES.GESTOR)
  @ApiOperation({
    summary: 'Métricas da auditoria resiliente',
    description:
      'Retorna métricas detalhadas do sistema de auditoria com fallbacks',
  })
  @ApiResponse({
    status: 200,
    description: 'Métricas da auditoria obtidas com sucesso',
  })
  async getAuditoriaMetrics() {
    const metrics = this.resilientAuditoriaService.getMetrics();
    // Verificar status dos serviços
    const redisAvailable = await this.healthCheckService.isRedisAvailable();
    const servicesStatus = {
      redis: {
        status: redisAvailable ? ('up' as const) : ('down' as const),
        lastCheck: new Date().toISOString(),
        latency: redisAvailable ? 5 : undefined,
      },
      database: {
        status: 'up' as const, // Assumindo que o banco está sempre disponível se a aplicação está rodando
        lastCheck: new Date().toISOString(),
        latency: 10,
      },
    };

    const totalOperations = metrics.queueSuccesses + metrics.queueFailures;

    return {
      timestamp: new Date().toISOString(),
      queue: {
        available: servicesStatus.redis?.status === 'up',
        successRate: metrics.queueSuccessRate,
        successes: metrics.queueSuccesses,
        failures: metrics.queueFailures,
        totalOperations,
      },
      fallbacks: {
        syncFallbackUsage: metrics.fallbackUsageRate,
        syncFallbacks: metrics.syncFallbacks,
        fileBackupUsage: metrics.backupUsageRate,
        fileBackups: metrics.fileBackups,
      },
      recovery: {
        recoveredLogs: metrics.recoveredLogs,
        lastRecoveryRun: 'Informação não disponível', // Implementar se necessário
      },
      reliability: {
        dataLossRisk: this.calculateDataLossRisk(metrics),
        systemResilience: this.calculateSystemResilience(
          metrics,
          servicesStatus.redis?.status === 'up',
        ),
      },
    };
  }

  /**
   * Força execução de cache warming
   */
  @Post('cache/warm')
  @HttpCode(HttpStatus.OK)
  @Roles(ROLES.ADMIN)
  @ApiOperation({
    summary: 'Força cache warming',
    description:
      'Executa manualmente o processo de aquecimento do cache para chaves críticas',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache warming executado com sucesso',
  })
  async forceCacheWarming() {
    await this.hybridCacheService.performCacheWarming();

    return {
      message: 'Cache warming executado com sucesso',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Força execução de recuperação de logs de auditoria
   */
  @Post('auditoria/recover')
  @HttpCode(HttpStatus.OK)
  @Roles(ROLES.ADMIN)
  @ApiOperation({
    summary: 'Força recuperação de logs',
    description:
      'Executa manualmente o processo de recuperação de logs de auditoria em backup',
  })
  @ApiResponse({
    status: 200,
    description: 'Recuperação de logs executada com sucesso',
  })
  async forceAuditoriaRecovery() {
    await this.resilientAuditoriaService.processBackupAuditLogs();

    return {
      message: 'Recuperação de logs de auditoria executada com sucesso',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Reseta métricas (útil para testes e manutenção)
   */
  @Post('metrics/reset')
  @HttpCode(HttpStatus.OK)
  @Roles(ROLES.ADMIN)
  @ApiOperation({
    summary: 'Reseta métricas',
    description: 'Reseta todas as métricas de resiliência (use com cuidado)',
  })
  @ApiResponse({
    status: 200,
    description: 'Métricas resetadas com sucesso',
  })
  async resetMetrics() {
    this.hybridCacheService.resetMetrics();
    this.resilientAuditoriaService.resetMetrics();

    return {
      message: 'Métricas de resiliência resetadas com sucesso',
      timestamp: new Date().toISOString(),
    };
  }

  // Métodos privados para avaliação de status

  private evaluateCacheStatus(metrics: any, redisAvailable: boolean) {
    let status: 'healthy' | 'degraded' | 'critical';

    if (metrics.overallHitRate >= 80 && redisAvailable) {
      status = 'healthy';
    } else if (metrics.overallHitRate >= 60 || !redisAvailable) {
      status = 'degraded';
    } else {
      status = 'critical';
    }

    return {
      status,
      l1Available: true, // L1 sempre disponível
      l2Available: redisAvailable,
      metrics,
    };
  }

  private evaluateAuditoriaStatus(metrics: any, redisAvailable: boolean) {
    let status: 'healthy' | 'degraded' | 'critical';

    if (metrics.queueSuccessRate >= 95 && redisAvailable) {
      status = 'healthy';
    } else if (
      metrics.queueSuccessRate >= 80 ||
      metrics.fallbackUsageRate < 20
    ) {
      status = 'degraded';
    } else {
      status = 'critical';
    }

    return {
      status,
      queueAvailable: redisAvailable,
      syncFallbackActive: metrics.syncFallbacks > 0,
      fileBackupActive: metrics.fileBackups > 0,
      metrics,
    };
  }

  private determineOverallStatus(
    cacheStatus: string,
    auditoriaStatus: string,
    servicesStatus: any,
  ): 'healthy' | 'degraded' | 'critical' {
    const statuses = [cacheStatus, auditoriaStatus];

    // Se algum serviço crítico está down
    if (servicesStatus.database?.status === 'down') {
      return 'critical';
    }

    // Se algum componente está crítico
    if (statuses.includes('critical')) {
      return 'critical';
    }

    // Se algum componente está degradado
    if (
      statuses.includes('degraded') ||
      servicesStatus.redis?.status === 'down'
    ) {
      return 'degraded';
    }

    return 'healthy';
  }

  private generateAlerts(
    cacheMetrics: any,
    auditoriaMetrics: any,
    servicesStatus: any,
  ) {
    const alerts: any[] = [];
    const timestamp = new Date().toISOString();

    // Alertas de cache
    if (cacheMetrics.overallHitRate < 60) {
      alerts.push({
        severity: 'warning',
        service: 'cache',
        message: `Taxa de hit do cache baixa: ${cacheMetrics.overallHitRate.toFixed(1)}%`,
        timestamp,
      });
    }

    if (cacheMetrics.failovers > 10) {
      alerts.push({
        severity: 'critical',
        service: 'cache',
        message: `Muitos failovers do cache L2: ${cacheMetrics.failovers}`,
        timestamp,
      });
    }

    // Alertas de auditoria
    if (auditoriaMetrics.queueSuccessRate < 90) {
      alerts.push({
        severity: 'warning',
        service: 'auditoria',
        message: `Taxa de sucesso da fila de auditoria baixa: ${auditoriaMetrics.queueSuccessRate.toFixed(1)}%`,
        timestamp,
      });
    }

    if (auditoriaMetrics.fileBackups > 0) {
      alerts.push({
        severity: 'critical',
        service: 'auditoria',
        message: `Logs de auditoria sendo salvos em backup: ${auditoriaMetrics.fileBackups}`,
        timestamp,
      });
    }

    // Alertas de serviços externos
    if (servicesStatus.redis?.status === 'down') {
      alerts.push({
        severity: 'critical',
        service: 'redis',
        message: 'Redis indisponível - sistema operando em modo degradado',
        timestamp,
      });
    }

    if (servicesStatus.database?.status === 'down') {
      alerts.push({
        severity: 'critical',
        service: 'database',
        message: 'Banco de dados indisponível',
        timestamp,
      });
    }

    return alerts;
  }

  private calculateDataLossRisk(metrics: any): 'low' | 'medium' | 'high' {
    if (metrics.fileBackups > 0) {
      return 'high';
    }

    if (metrics.queueSuccessRate < 95) {
      return 'medium';
    }

    return 'low';
  }

  private calculateSystemResilience(
    metrics: any,
    redisAvailable: boolean,
  ): number {
    let score = 100;

    // Penalizar por falhas na fila
    if (metrics.queueSuccessRate < 100) {
      score -= (100 - metrics.queueSuccessRate) * 0.5;
    }

    // Penalizar por uso de fallbacks
    score -= metrics.fallbackUsageRate * 0.3;

    // Penalizar por backups em arquivo
    score -= metrics.backupUsageRate * 0.8;

    // Penalizar por Redis indisponível
    if (!redisAvailable) {
      score -= 20;
    }

    return Math.max(0, Math.min(100, score));
  }
}
