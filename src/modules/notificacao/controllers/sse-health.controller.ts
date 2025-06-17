import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SseService } from '../services/sse.service';
import { SseHealthCheckService } from '../services/sse-health-check.service';
import { SseCircuitBreakerService } from '../services/sse-circuit-breaker.service';
import { SseGracefulDegradationService } from '../services/sse-graceful-degradation.service';
import { SseStructuredLoggingService, LogLevel } from '../services/sse-structured-logging.service';

@ApiTags('SSE Health')
@Controller('sse/health')
export class SseHealthController {
  constructor(
    private readonly sseService: SseService,
    private readonly healthCheckService: SseHealthCheckService,
    private readonly circuitBreakerService: SseCircuitBreakerService,
    private readonly gracefulDegradationService: SseGracefulDegradationService,
    private readonly loggingService: SseStructuredLoggingService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Verificar saúde geral do sistema SSE' })
  @ApiResponse({
    status: 200,
    description: 'Status de saúde do sistema SSE',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['healthy', 'degraded', 'unhealthy'],
          description: 'Status geral do sistema',
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
          description: 'Timestamp da verificação',
        },
        uptime: {
          type: 'string',
          description: 'Tempo de atividade do sistema',
        },
        components: {
          type: 'object',
          description: 'Status dos componentes individuais',
        },
        degradation: {
          type: 'object',
          description: 'Informações sobre degradação graceful',
        },
        circuitBreakers: {
          type: 'object',
          description: 'Status dos circuit breakers',
        },
        connections: {
          type: 'object',
          description: 'Estatísticas de conexões SSE',
        },
      },
    },
  })
  async getHealthStatus() {
    const startTime = Date.now();
    
    try {
      // Realizar verificação completa de saúde
      const healthStatus = await this.healthCheckService.checkHealth();
      
      // Obter status de degradação
      const degradationStatus = this.gracefulDegradationService.getCurrentStatus();
      
      // Obter métricas dos circuit breakers
      const circuitBreakerMetrics = this.circuitBreakerService.getAllCircuitBreakerMetrics();
      
      // Obter estatísticas de conexões SSE
      const connectionStats = this.sseService.getLocalConnectionStats();
      
      const duration = Date.now() - startTime;
      
      const response = {
        status: healthStatus.healthy ? 'healthy' : 'unhealthy',
        timestamp: healthStatus.timestamp.toISOString(),
        uptime: process.uptime(),
        components: healthStatus.components,
        degradation: {
          level: degradationStatus.currentLevel,
          reason: degradationStatus.reason,
          activeStrategies: degradationStatus.activeStrategies,
          affectedFeatures: degradationStatus.affectedFeatures,
        },
        circuitBreakers: Object.keys(circuitBreakerMetrics).length > 0 ? 
          Object.entries(circuitBreakerMetrics).reduce((acc, [name, metrics]) => {
            acc[name] = {
              state: metrics.state,
              stats: metrics.stats,
              lastStateChange: metrics.lastStateChange,
            };
            return acc;
          }, {} as Record<string, any>) : {},
        connections: {
          total: connectionStats.totalConnections,
          byUser: connectionStats.connectionsPerUser,
          totalUsers: connectionStats.totalUsers,
        },
        performance: {
          healthCheckDuration: duration,
        },
      };
      
      // Log da verificação de saúde
      this.loggingService.logSecurity('Health check realizado', {
        userId: 0,
        component: 'sse-health-controller',
        operation: 'health-check',
        metadata: {
          duration,
          healthStatus: healthStatus.healthy,
          degradationLevel: degradationStatus.currentLevel,
          circuitBreakerStatus: circuitBreakerMetrics?.stats,
          totalConnections: connectionStats.totalConnections,
        },
      });
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.loggingService.logError(error as Error, {
        userId: 0,
        component: 'sse-health',
        operation: 'health-check',
        metadata: { duration },
      });
      
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Falha na verificação de saúde',
        performance: {
          healthCheckDuration: duration,
        },
      };
    }
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Verificar saúde detalhada do sistema SSE' })
  @ApiResponse({
    status: 200,
    description: 'Status detalhado de saúde do sistema SSE',
  })
  async getDetailedHealthStatus() {
    const startTime = Date.now();
    
    try {
      // Realizar verificação completa de saúde
      const healthStatus = await this.healthCheckService.checkHealth();

      // Obter status de degradação
      const degradationStatus = this.gracefulDegradationService.getCurrentStatus();

      // Obter métricas dos circuit breakers (usando um nome específico)
      const circuitBreakerMetrics = this.circuitBreakerService.getCircuitBreakerMetrics('sse-main') || {
        state: 'CLOSED' as any,
        stats: {
          fires: 0,
          successes: 0,
          failures: 0,
          timeouts: 0,
          fallbacks: 0,
          rejects: 0
        },
        config: {} as any,
        lastStateChange: new Date()
      };
      
      // Obter estatísticas detalhadas de conexões
      const connectionStats = this.sseService.getLocalConnectionStats();
      
      // Obter métricas de logging
      const loggingMetrics = this.loggingService.getMetrics();
      
      const duration = Date.now() - startTime;
      
      const response = {
        status: healthStatus.healthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        components: healthStatus.components,
        degradation: {
          current: {
            level: degradationStatus.currentLevel,
            reason: degradationStatus.reason,
            activeStrategies: degradationStatus.activeStrategies,
            affectedFeatures: degradationStatus.affectedFeatures,
          },
        },
        circuitBreakers: {
          summary: {
            total: 1,
            open: circuitBreakerMetrics.state === 'OPEN' ? 1 : 0,
            halfOpen: circuitBreakerMetrics.state === 'HALF_OPEN' ? 1 : 0,
            closed: circuitBreakerMetrics.state === 'CLOSED' ? 1 : 0,
            totalFailures: circuitBreakerMetrics.stats.failures,
            totalSuccesses: circuitBreakerMetrics.stats.successes,
          },
          detailed: circuitBreakerMetrics,
        },
        connections: {
          summary: {
            total: connectionStats.totalConnections,
            totalUsers: connectionStats.totalUsers,
          },
          detailed: connectionStats,
        },
        logging: {
          metrics: loggingMetrics,
        },
        performance: {
          healthCheckDuration: duration,
        },
      };
      
      // Log da verificação detalhada
      this.loggingService.logSecurity('Health check detalhado realizado', {
        userId: 0,
        component: 'sse-health',
        operation: 'detailed-health-check',
        metadata: {
          status: healthStatus.healthy ? 'healthy' : 'unhealthy',
          duration,
          degradationLevel: degradationStatus.currentLevel,
          totalConnections: connectionStats.totalConnections,
          circuitBreakersOpen: circuitBreakerMetrics.state === 'OPEN' ? 1 : 0,
        },
      });
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.loggingService.logError(error as Error, {
        userId: 0,
        component: 'sse-health',
        operation: 'detailed-health-check',
        metadata: { duration },
      });
      
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Falha na verificação detalhada de saúde',
        performance: {
          healthCheckDuration: duration,
        },
      };
    }
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Obter métricas do sistema SSE' })
  @ApiResponse({
    status: 200,
    description: 'Métricas do sistema SSE',
  })
  async getMetrics() {
    const startTime = Date.now();
    
    try {
      // Obter métricas de todos os serviços
      const circuitBreakerMetrics = this.circuitBreakerService.getCircuitBreakerMetrics('sse-main') || {
        state: 'CLOSED' as any,
        stats: { fires: 0, successes: 0, failures: 0, timeouts: 0, fallbacks: 0, rejects: 0 },
        config: {} as any,
        lastStateChange: new Date()
      };
      const degradationStatus = this.gracefulDegradationService.getCurrentStatus();
      const loggingMetrics = this.loggingService.getMetrics();
      const connectionStats = this.sseService.getLocalConnectionStats();
      
      const duration = Date.now() - startTime;
      
      const response = {
        timestamp: new Date().toISOString(),
        circuitBreakers: circuitBreakerMetrics,
        degradation: degradationStatus,
        logging: loggingMetrics,
        connections: connectionStats,
        performance: {
          metricsCollectionDuration: duration,
        },
      };
      
      // Log da coleta de métricas
      this.loggingService.logPerformance('Métricas coletadas', {
        userId: 0,
        component: 'sse-health',
        operation: 'collect-metrics',
        duration,
        metadata: {
          totalConnections: connectionStats.totalConnections,
          circuitBreakersOpen: circuitBreakerMetrics.state === 'OPEN' ? 1 : 0,
        },
      });
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.loggingService.logError(error as Error, {
        userId: 0,
        component: 'sse-health',
        operation: 'collect-metrics',
        metadata: { duration },
      });
      
      return {
        timestamp: new Date().toISOString(),
        error: 'Falha na coleta de métricas',
        performance: {
          metricsCollectionDuration: duration,
        },
      };
    }
  }

  @Get('circuit-breakers')
  @ApiOperation({ summary: 'Obter status dos circuit breakers' })
  @ApiResponse({
    status: 200,
    description: 'Status dos circuit breakers',
  })
  async getCircuitBreakersStatus() {
    try {
      const metrics = this.circuitBreakerService.getCircuitBreakerMetrics('sse-main') || {
        state: 'CLOSED' as any,
        stats: { fires: 0, successes: 0, failures: 0, timeouts: 0, fallbacks: 0, rejects: 0 },
        config: {} as any,
        lastStateChange: new Date()
      };
      
      return {
        timestamp: new Date().toISOString(),
        summary: {
          total: 1,
          open: metrics.state === 'OPEN' ? 1 : 0,
          halfOpen: metrics.state === 'HALF_OPEN' ? 1 : 0,
          closed: metrics.state === 'CLOSED' ? 1 : 0,
          totalFailures: metrics.stats.failures,
          totalSuccesses: metrics.stats.successes,
        },
        detailed: metrics,
      };
    } catch (error) {
      this.loggingService.logError(error as Error, {
        userId: 0,
        component: 'sse-health',
        operation: 'get-circuit-breakers-status',
        metadata: {},
      });
      
      return {
        timestamp: new Date().toISOString(),
        error: 'Falha ao obter status dos circuit breakers',
      };
    }
  }

  @Get('degradation')
  @ApiOperation({ summary: 'Obter status de degradação graceful' })
  @ApiResponse({
    status: 200,
    description: 'Status de degradação graceful',
  })
  async getDegradationStatus() {
    try {
      const status = this.gracefulDegradationService.getCurrentStatus();
      
      return {
        timestamp: new Date().toISOString(),
        current: {
          level: status.currentLevel,
          reason: status.reason,
          activeStrategies: status.activeStrategies,
          affectedFeatures: status.affectedFeatures,
        },
      };
    } catch (error) {
      this.loggingService.logError(error as Error, {
        userId: 0,
        component: 'sse-health',
        operation: 'get-degradation-status',
        metadata: {},
      });
      
      return {
        timestamp: new Date().toISOString(),
        error: 'Falha ao obter status de degradação',
      };
    }
  }
}