import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { SseCircuitBreakerService } from './sse-circuit-breaker.service';
import { SseRedisCircuitBreakerService } from './sse-redis-circuit-breaker.service';
import { SseDatabaseCircuitBreakerService } from './sse-database-circuit-breaker.service';
/**
 * Status de saúde de um componente
 */
export interface ComponentHealthStatus {
  /** Nome do componente */
  name: string;
  /** Status de saúde */
  healthy: boolean;
  /** Tempo de resposta em ms */
  responseTime?: number;
  /** Mensagem de status */
  message?: string;
  /** Detalhes adicionais */
  details?: Record<string, any>;
  /** Timestamp da verificação */
  timestamp: Date;
}

/**
 * Status geral de saúde do sistema SSE
 */
export interface SseHealthStatus {
  /** Status geral */
  healthy: boolean;
  /** Timestamp da verificação */
  timestamp: Date;
  /** Tempo total de verificação em ms */
  totalCheckTime: number;
  /** Status de cada componente */
  components: ComponentHealthStatus[];
  /** Resumo de componentes */
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
  };
}

/**
 * Configuração para health checks
 */
export interface HealthCheckConfig {
  /** Timeout para cada verificação em ms */
  timeout: number;
  /** Intervalo entre verificações em ms */
  interval: number;
  /** Número de tentativas para cada verificação */
  retries: number;
  /** Habilitar verificações automáticas */
  enableAutoCheck: boolean;
}

/**
 * Serviço responsável por verificar a saúde de todos os componentes do sistema SSE
 */
@Injectable()
export class SseHealthCheckService {
  private readonly logger = new Logger(SseHealthCheckService.name);
  private readonly config: HealthCheckConfig;
  private autoCheckInterval?: NodeJS.Timeout;
  private lastHealthStatus?: SseHealthStatus;

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly circuitBreakerService: SseCircuitBreakerService,
    private readonly redisCircuitBreakerService: SseRedisCircuitBreakerService,
    private readonly databaseCircuitBreakerService: SseDatabaseCircuitBreakerService,
  ) {
    this.config = {
      timeout: this.configService.get<number>('SSE_HEALTH_CHECK_TIMEOUT', 5000),
      interval: this.configService.get<number>('SSE_HEALTH_CHECK_INTERVAL', 30000),
      retries: this.configService.get<number>('SSE_HEALTH_CHECK_RETRIES', 3),
      enableAutoCheck: this.configService.get<boolean>('SSE_HEALTH_CHECK_AUTO_ENABLE', true),
    };

    if (this.config.enableAutoCheck) {
      this.startAutoHealthCheck();
    }

    this.logger.log('SseHealthCheckService inicializado', {
      config: this.config,
    });
  }

  /**
   * Executa verificação completa de saúde do sistema SSE
   */
  async checkHealth(): Promise<SseHealthStatus> {
    const startTime = Date.now();
    const timestamp = new Date();
    const components: ComponentHealthStatus[] = [];

    this.logger.debug('Iniciando verificação de saúde do sistema SSE');

    // Verificar cada componente
    const checks = [
      this.checkDatabaseHealth(),
      this.checkRedisHealth(),
      this.checkCircuitBreakersHealth(),
      this.checkSseConnections(),
      this.checkMemoryHealth(),
      this.checkSystemResourcesHealth(),
    ];

    // Executar todas as verificações em paralelo
    const results = await Promise.allSettled(checks);
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        components.push(result.value);
      } else {
        components.push({
          name: 'unknown',
          healthy: false,
          message: `Erro na verificação: ${result.reason?.message || 'Erro desconhecido'}`,
          timestamp,
        });
      }
    }

    const totalCheckTime = Date.now() - startTime;
    const healthyCount = components.filter(c => c.healthy).length;
    const unhealthyCount = components.length - healthyCount;
    const overallHealthy = unhealthyCount === 0;

    const healthStatus: SseHealthStatus = {
      healthy: overallHealthy,
      timestamp,
      totalCheckTime,
      components,
      summary: {
        total: components.length,
        healthy: healthyCount,
        unhealthy: unhealthyCount,
      },
    };

    this.lastHealthStatus = healthStatus;

    /* this.logger.log('Verificação de saúde concluída', {
      healthy: overallHealthy,
      totalTime: totalCheckTime,
      summary: healthStatus.summary,
    }); */

    return healthStatus;
  }

  /**
   * Obtém o último status de saúde verificado
   */
  getLastHealthStatus(): SseHealthStatus | null {
    return this.lastHealthStatus || null;
  }

  /**
   * Verifica se o sistema está saudável baseado na última verificação
   */
  isHealthy(): boolean {
    return this.lastHealthStatus?.healthy ?? false;
  }

  /**
   * Verifica a saúde do banco de dados
   */
  private async checkDatabaseHealth(): Promise<ComponentHealthStatus> {
    const startTime = Date.now();
    const name = 'database';
    
    try {
      // Verificar conexão básica
      if (!this.dataSource.isInitialized) {
        return {
          name,
          healthy: false,
          message: 'Banco de dados não inicializado',
          timestamp: new Date(),
        };
      }

      // Executar query simples para testar conectividade
      await this.dataSource.query('SELECT 1');
      
      // Verificar status dos circuit breakers de banco
      const dbHealth = this.databaseCircuitBreakerService.getDatabaseHealthStatus();
      
      const responseTime = Date.now() - startTime;
      
      return {
        name,
        healthy: dbHealth.healthy && dbHealth.connection.isConnected,
        responseTime,
        message: dbHealth.healthy ? 'Banco de dados operacional' : 'Circuit breakers de banco com problemas',
        details: {
          connection: dbHealth.connection,
          operations: dbHealth.operations,
          queryCache: dbHealth.queryCache,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        name,
        healthy: false,
        responseTime: Date.now() - startTime,
        message: `Erro no banco de dados: ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Verifica a saúde do Redis
   */
  private async checkRedisHealth(): Promise<ComponentHealthStatus> {
    const startTime = Date.now();
    const name = 'redis';
    
    try {
      // Testar operação básica no Redis
      const testKey = 'health-check-test';
      const testValue = Date.now().toString();
      
      await this.redisCircuitBreakerService.set(testKey, testValue, 10); // 10 segundos TTL
      const retrieved = await this.redisCircuitBreakerService.get(testKey);
      
      if (retrieved !== testValue) {
        throw new Error('Valor recuperado do Redis não confere');
      }
      
      // Limpar chave de teste
      await this.redisCircuitBreakerService.del(testKey);
      
      const responseTime = Date.now() - startTime;
      
      return {
        name,
        healthy: true,
        responseTime,
        message: 'Redis operacional',
        details: {
          testKey,
          testValue,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        name,
        healthy: false,
        responseTime: Date.now() - startTime,
        message: `Erro no Redis: ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Verifica a saúde dos circuit breakers
   */
  private async checkCircuitBreakersHealth(): Promise<ComponentHealthStatus> {
    const startTime = Date.now();
    const name = 'circuit-breakers';
    
    try {
      const generalHealth = this.circuitBreakerService.getHealthStatus();
      const dbMetrics = this.databaseCircuitBreakerService.getDatabaseCircuitBreakerMetrics();
      
      // Contar circuit breakers abertos
      let openBreakers = 0;
      let totalBreakers = 0;
      
      // Verificar circuit breakers gerais
      for (const [name, metrics] of Object.entries(generalHealth.circuitBreakers)) {
        totalBreakers++;
        if (metrics.state === 'OPEN') {
          openBreakers++;
        }
      }
      
      // Verificar circuit breakers de banco
      for (const [operation, metrics] of Object.entries(dbMetrics)) {
        if (operation !== 'queryCache' && typeof metrics === 'object' && metrics && 'state' in metrics) {
          totalBreakers++;
          if (metrics.state === 'open') {
            openBreakers++;
          }
        }
      }
      
      const responseTime = Date.now() - startTime;
      const healthy = openBreakers === 0;
      
      return {
        name,
        healthy,
        responseTime,
        message: healthy 
          ? 'Todos os circuit breakers operacionais' 
          : `${openBreakers} de ${totalBreakers} circuit breakers abertos`,
        details: {
          openBreakers,
          totalBreakers,
          general: generalHealth,
          database: dbMetrics,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        name,
        healthy: false,
        responseTime: Date.now() - startTime,
        message: `Erro ao verificar circuit breakers: ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Verifica a saúde das conexões SSE
   * Nota: Implementação simplificada para evitar dependência circular
   */
  private async checkSseConnections(): Promise<ComponentHealthStatus> {
    const startTime = Date.now();
    const name = 'sse-connections';
    
    try {
      // Implementação simplificada - verificação básica sem dependência do SseService
      // TODO: Implementar verificação mais robusta quando a arquitetura permitir
      const connectionCount = 0; // Placeholder
       const healthyConnections = 0; // Placeholder
       const problematicConnections = 0; // Placeholder
      
      const responseTime = Date.now() - startTime;
      const healthy = true; // Assumindo saudável por enquanto
      
      return {
        name,
        healthy,
        responseTime,
        message: `${connectionCount} conexões ativas (${healthyConnections} saudáveis, ${problematicConnections} problemáticas)`,
        details: {
          total: connectionCount,
          healthy: healthyConnections,
          problematic: problematicConnections,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        name,
        healthy: false,
        responseTime: Date.now() - startTime,
        message: `Erro ao verificar conexões SSE: ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Verifica a saúde da memória
   */
  private async checkMemoryHealth(): Promise<ComponentHealthStatus> {
    const startTime = Date.now();
    const name = 'memory';
    
    try {
      const memoryUsage = process.memoryUsage();
      const totalMemory = memoryUsage.heapTotal;
      const usedMemory = memoryUsage.heapUsed;
      const freeMemory = totalMemory - usedMemory;
      const memoryUsagePercentage = (usedMemory / totalMemory) * 100;
      
      // Considerar não saudável se uso de memória > 90%
      const healthy = memoryUsagePercentage < 90;
      
      const responseTime = Date.now() - startTime;
      
      return {
        name,
        healthy,
        responseTime,
        message: `Uso de memória: ${memoryUsagePercentage.toFixed(1)}%`,
        details: {
          heapUsed: Math.round(usedMemory / 1024 / 1024), // MB
          heapTotal: Math.round(totalMemory / 1024 / 1024), // MB
          heapFree: Math.round(freeMemory / 1024 / 1024), // MB
          usagePercentage: memoryUsagePercentage,
          external: Math.round(memoryUsage.external / 1024 / 1024), // MB
          rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        name,
        healthy: false,
        responseTime: Date.now() - startTime,
        message: `Erro ao verificar memória: ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Verifica a saúde dos recursos do sistema
   */
  private async checkSystemResourcesHealth(): Promise<ComponentHealthStatus> {
    const startTime = Date.now();
    const name = 'system-resources';
    
    try {
      const uptime = process.uptime();
      const cpuUsage = process.cpuUsage();
      
      // Verificar se o processo está rodando há tempo suficiente
      const healthy = uptime > 10; // Pelo menos 10 segundos de uptime
      
      const responseTime = Date.now() - startTime;
      
      return {
        name,
        healthy,
        responseTime,
        message: `Sistema ativo há ${Math.round(uptime)} segundos`,
        details: {
          uptime: Math.round(uptime),
          uptimeFormatted: this.formatUptime(uptime),
          cpuUsage: {
            user: cpuUsage.user,
            system: cpuUsage.system,
          },
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        name,
        healthy: false,
        responseTime: Date.now() - startTime,
        message: `Erro ao verificar recursos do sistema: ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Inicia verificações automáticas de saúde
   */
  private startAutoHealthCheck(): void {
    if (this.autoCheckInterval) {
      clearInterval(this.autoCheckInterval);
    }

    this.autoCheckInterval = setInterval(async () => {
      try {
        await this.checkHealth();
      } catch (error) {
        this.logger.error('Erro na verificação automática de saúde', {
          error: error.message,
        });
      }
    }, this.config.interval);

    this.logger.log(`Verificações automáticas de saúde iniciadas (intervalo: ${this.config.interval}ms)`);
  }

  /**
   * Para verificações automáticas de saúde
   */
  stopAutoHealthCheck(): void {
    if (this.autoCheckInterval) {
      clearInterval(this.autoCheckInterval);
      this.autoCheckInterval = undefined;
      this.logger.log('Verificações automáticas de saúde interrompidas');
    }
  }

  /**
   * Formata tempo de uptime em formato legível
   */
  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0) parts.push(`${secs}s`);

    return parts.join(' ') || '0s';
  }

  /**
   * Cleanup ao destruir o serviço
   */
  onModuleDestroy(): void {
    this.stopAutoHealthCheck();
  }
}