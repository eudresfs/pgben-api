import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/role.decorator';
import { AuditMetricsService } from '../services/audit-metrics.service';
import { AuditHealthService, SystemHealth } from '../services/audit-health.service';

/**
 * Controlador responsável por expor métricas do sistema de auditoria
 * 
 * Endpoints para monitoramento e observabilidade do pipeline de auditoria:
 * - Métricas Prometheus
 * - Estatísticas de performance
 * - Indicadores de saúde do sistema
 */
@ApiTags('Auditoria - Métricas')
@Controller('auditoria/metrics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AuditMetricsController {
  constructor(
    private readonly auditMetricsService: AuditMetricsService,
    private readonly auditHealthService: AuditHealthService,
  ) {}

  /**
   * Endpoint para coleta de métricas pelo Prometheus
   * 
   * Retorna todas as métricas de auditoria no formato Prometheus
   * para scraping automático pelo sistema de monitoramento.
   */
  @Get('prometheus')
  @Roles('ADMIN', 'GESTOR')
  @ApiOperation({
    summary: 'Métricas Prometheus de Auditoria',
    description: 'Retorna métricas de auditoria no formato Prometheus para monitoramento',
  })
  @ApiResponse({
    status: 200,
    description: 'Métricas obtidas com sucesso',
    content: {
      'text/plain': {
        example: `# HELP audit_events_total Total de eventos de auditoria gerados
# TYPE audit_events_total counter
audit_events_total{event_type="OPERATION_START",risk_level="MEDIUM",source="event_emitter"} 1250
audit_events_total{event_type="OPERATION_SUCCESS",risk_level="MEDIUM",source="event_emitter"} 1200
audit_events_total{event_type="OPERATION_ERROR",risk_level="HIGH",source="event_emitter"} 50

# HELP audit_processing_duration_seconds Duração do processamento de eventos de auditoria
# TYPE audit_processing_duration_seconds histogram
audit_processing_duration_seconds_bucket{event_type="OPERATION_START",stage="processor",le="0.001"} 100
audit_processing_duration_seconds_bucket{event_type="OPERATION_START",stage="processor",le="0.005"} 800
audit_processing_duration_seconds_bucket{event_type="OPERATION_START",stage="processor",le="0.01"} 1200
audit_processing_duration_seconds_bucket{event_type="OPERATION_START",stage="processor",le="+Inf"} 1250
audit_processing_duration_seconds_sum{event_type="OPERATION_START",stage="processor"} 2.5
audit_processing_duration_seconds_count{event_type="OPERATION_START",stage="processor"} 1250`,
      },
    },
  })
  async getPrometheusMetrics(): Promise<string> {
    return this.auditMetricsService.getMetrics();
  }

  /**
   * Endpoint para estatísticas resumidas do sistema de auditoria
   * 
   * Retorna um resumo das principais métricas de performance
   * e saúde do sistema de auditoria em formato JSON.
   */
  @Get('stats')
  @Roles('ADMIN', 'GESTOR', 'AUDITOR')
  @ApiOperation({
    summary: 'Estatísticas de Auditoria',
    description: 'Retorna estatísticas resumidas do sistema de auditoria',
  })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas obtidas com sucesso',
    schema: {
      type: 'object',
      properties: {
        timestamp: {
          type: 'string',
          format: 'date-time',
          description: 'Timestamp da coleta das métricas',
        },
        pipeline: {
          type: 'object',
          properties: {
            interceptor: {
              type: 'object',
              properties: {
                eventsTotal: { type: 'number', description: 'Total de eventos capturados' },
                averageDuration: { type: 'number', description: 'Duração média em ms' },
              },
            },
            queue: {
              type: 'object',
              properties: {
                eventsAdded: { type: 'number', description: 'Eventos adicionados à fila' },
                eventsFailed: { type: 'number', description: 'Eventos que falharam na fila' },
                currentSize: { type: 'number', description: 'Tamanho atual da fila' },
              },
            },
            processor: {
              type: 'object',
              properties: {
                eventsProcessed: { type: 'number', description: 'Eventos processados' },
                eventsFailed: { type: 'number', description: 'Eventos que falharam no processamento' },
                averageProcessingTime: { type: 'number', description: 'Tempo médio de processamento em ms' },
              },
            },
            database: {
              type: 'object',
              properties: {
                eventsPersisted: { type: 'number', description: 'Eventos persistidos' },
                eventsFailed: { type: 'number', description: 'Eventos que falharam na persistência' },
              },
            },
          },
        },
        performance: {
          type: 'object',
          properties: {
            errorRate: { type: 'number', description: 'Taxa de erro geral (0-1)' },
            throughput: { type: 'number', description: 'Eventos por segundo' },
            averageLatency: { type: 'number', description: 'Latência média em ms' },
          },
        },
        compliance: {
          type: 'object',
          properties: {
            lgpdEvents: { type: 'number', description: 'Eventos de conformidade LGPD' },
            sensitiveDataAccess: { type: 'number', description: 'Acessos a dados sensíveis' },
            complianceRate: { type: 'number', description: 'Taxa de conformidade (0-1)' },
          },
        },
      },
    },
  })
  async getAuditStats() {
    // Nota: Esta implementação seria expandida para calcular estatísticas reais
    // baseadas nas métricas coletadas. Por enquanto, retorna uma estrutura de exemplo.
    return {
      timestamp: new Date().toISOString(),
      pipeline: {
        interceptor: {
          eventsTotal: 0, // Seria calculado das métricas reais
          averageDuration: 0,
        },
        queue: {
          eventsAdded: 0,
          eventsFailed: 0,
          currentSize: 0,
        },
        processor: {
          eventsProcessed: 0,
          eventsFailed: 0,
          averageProcessingTime: 0,
        },
        database: {
          eventsPersisted: 0,
          eventsFailed: 0,
        },
      },
      performance: {
        errorRate: 0,
        throughput: 0,
        averageLatency: 0,
      },
      compliance: {
        lgpdEvents: 0,
        sensitiveDataAccess: 0,
        complianceRate: 1.0,
      },
    };
  }

  /**
   * Endpoint para verificação de saúde do sistema de auditoria
   */
  @Get('health')
  @Roles('ADMIN', 'GESTOR', 'AUDITOR')
  @ApiOperation({ 
    summary: 'Verificar saúde do sistema de auditoria',
    description: 'Retorna o status detalhado de saúde dos componentes do sistema de auditoria com verificações em tempo real'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Status de saúde do sistema com verificações completas',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'degraded', 'critical'] },
        timestamp: { type: 'string', format: 'date-time' },
        components: {
          type: 'object',
          properties: {
            redis: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                message: { type: 'string' },
                responseTime: { type: 'number' },
                lastCheck: { type: 'string', format: 'date-time' }
              }
            },
            database: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                message: { type: 'string' },
                responseTime: { type: 'number' },
                lastCheck: { type: 'string', format: 'date-time' }
              }
            },
            queue: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                message: { type: 'string' },
                responseTime: { type: 'number' },
                lastCheck: { type: 'string', format: 'date-time' }
              }
            },
            processor: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                message: { type: 'string' },
                responseTime: { type: 'number' },
                lastCheck: { type: 'string', format: 'date-time' }
              }
            },
            interceptor: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                message: { type: 'string' },
                responseTime: { type: 'number' },
                lastCheck: { type: 'string', format: 'date-time' }
              }
            }
          }
        },
        metrics: {
          type: 'object',
          properties: {
            errorRate: { type: 'number', description: 'Taxa de erro (0-1)' },
            throughput: { type: 'number', description: 'Eventos processados por minuto' },
            queueSize: { type: 'number', description: 'Número de jobs na fila' },
            averageLatency: { type: 'number', description: 'Latência média em ms' }
          }
        },
        alerts: {
          type: 'array',
          items: { type: 'string' },
          description: 'Lista de alertas ativos'
        }
      }
    }
  })
  async getAuditHealth(): Promise<SystemHealth> {
    // Executar verificação completa de saúde em tempo real
    return await this.auditHealthService.performHealthCheck();
  }

  /**
   * Endpoint para verificação rápida de saúde (apenas status)
   */
  @Get('health/status')
  @Roles('ADMIN', 'GESTOR', 'AUDITOR')
  @ApiOperation({ 
    summary: 'Verificação rápida de status',
    description: 'Retorna apenas o status geral sem executar verificações completas'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Status geral do sistema',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'degraded', 'critical'] },
        timestamp: { type: 'string', format: 'date-time' },
        isHealthy: { type: 'boolean' }
      }
    }
  })
  async getHealthStatus() {
    const health = this.auditHealthService.getCurrentHealth();
    return {
      status: health.status,
      timestamp: health.timestamp,
      isHealthy: this.auditHealthService.isHealthy()
    };
  }

  /**
   * Endpoint para obter alertas ativos
   */
  @Get('health/alerts')
  @Roles('ADMIN', 'GESTOR', 'AUDITOR')
  @ApiOperation({ 
    summary: 'Obter alertas ativos',
    description: 'Retorna lista de alertas ativos do sistema de auditoria'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de alertas ativos',
    schema: {
      type: 'object',
      properties: {
        alerts: {
          type: 'array',
          items: { type: 'string' }
        },
        count: { type: 'number' },
        timestamp: { type: 'string', format: 'date-time' }
      }
    }
  })
  async getActiveAlerts() {
    const alerts = this.auditHealthService.getActiveAlerts();
    return {
      alerts,
      count: alerts.length,
      timestamp: new Date().toISOString()
    };
  }
}