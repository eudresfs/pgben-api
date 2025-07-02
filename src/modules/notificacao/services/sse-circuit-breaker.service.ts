import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import CircuitBreaker from 'opossum';
import { SseMetricsService } from './sse-metrics.service';

/**
 * Configuração para circuit breakers específicos do SSE
 */
export interface SseCircuitBreakerConfig {
  /** Timeout em ms para operações (padrão: 5000) */
  timeout: number;
  /** Percentual de erro para abrir o circuito (padrão: 50) */
  errorThresholdPercentage: number;
  /** Timeout para reset em ms (padrão: 30000) */
  resetTimeout: number;
  /** Número mínimo de requisições antes de avaliar o circuito (padrão: 10) */
  volumeThreshold: number;
  /** Capacidade do bucket de estatísticas (padrão: 10) */
  capacity: number;
  /** Intervalo de limpeza do bucket em ms (padrão: 30000) */
  bucketSpan: number;
}

/**
 * Estados possíveis do circuit breaker
 */
export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'halfOpen',
}

/**
 * Métricas do circuit breaker
 */
export interface CircuitBreakerMetrics {
  state: CircuitBreakerState;
  stats: {
    fires: number;
    successes: number;
    failures: number;
    timeouts: number;
    fallbacks: number;
    rejects: number;
  };
  config: SseCircuitBreakerConfig;
  lastStateChange: Date;
}

/**
 * Serviço responsável por gerenciar circuit breakers para operações SSE
 * Implementa o padrão Circuit Breaker para aumentar a resilência do sistema
 */
@Injectable()
export class SseCircuitBreakerService {
  private readonly logger = new Logger(SseCircuitBreakerService.name);
  private readonly circuitBreakers = new Map<string, CircuitBreaker>();
  private readonly defaultConfig: SseCircuitBreakerConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly metricsService: SseMetricsService,
  ) {
    // Configuração padrão baseada em variáveis de ambiente
    this.defaultConfig = {
      timeout: this.configService.get<number>(
        'SSE_CIRCUIT_BREAKER_TIMEOUT',
        5000,
      ),
      errorThresholdPercentage: this.configService.get<number>(
        'SSE_CIRCUIT_BREAKER_ERROR_THRESHOLD',
        50,
      ),
      resetTimeout: this.configService.get<number>(
        'SSE_CIRCUIT_BREAKER_RESET_TIMEOUT',
        30000,
      ),
      volumeThreshold: this.configService.get<number>(
        'SSE_CIRCUIT_BREAKER_VOLUME_THRESHOLD',
        10,
      ),
      capacity: this.configService.get<number>(
        'SSE_CIRCUIT_BREAKER_CAPACITY',
        10,
      ),
      bucketSpan: this.configService.get<number>(
        'SSE_CIRCUIT_BREAKER_BUCKET_SPAN',
        30000,
      ),
    };
  }

  /**
   * Cria ou obtém um circuit breaker para uma operação específica
   */
  getCircuitBreaker<T extends any[], R>(
    name: string,
    action: (...args: T) => Promise<R>,
    config?: Partial<SseCircuitBreakerConfig>,
    fallback?: (...args: T) => Promise<R>,
  ): CircuitBreaker {
    if (this.circuitBreakers.has(name)) {
      return this.circuitBreakers.get(name)!;
    }

    const finalConfig = { ...this.defaultConfig, ...config };
    const breaker = new CircuitBreaker(action, finalConfig);

    // Configurar fallback se fornecido
    if (fallback) {
      breaker.fallback(fallback);
    }

    // Configurar listeners para logging e métricas
    this.setupCircuitBreakerListeners(name, breaker);

    this.circuitBreakers.set(name, breaker);

    /* this.logger.log(`Circuit breaker '${name}' criado`, {
      config: finalConfig,
      hasFallback: !!fallback,
    }); */

    return breaker;
  }

  /**
   * Executa uma operação através do circuit breaker
   */
  async execute<T extends any[], R>(
    name: string,
    action: (...args: T) => Promise<R>,
    args: T,
    config?: Partial<SseCircuitBreakerConfig>,
    fallback?: (...args: T) => Promise<R>,
  ): Promise<R> {
    const breaker = this.getCircuitBreaker(name, action, config, fallback);
    return breaker.fire(...args) as Promise<R>;
  }

  /**
   * Obtém métricas de um circuit breaker específico
   */
  getCircuitBreakerMetrics(name: string): CircuitBreakerMetrics | null {
    const breaker = this.circuitBreakers.get(name);
    if (!breaker) {
      return null;
    }

    return {
      state: breaker.opened
        ? CircuitBreakerState.OPEN
        : breaker.halfOpen
          ? CircuitBreakerState.HALF_OPEN
          : CircuitBreakerState.CLOSED,
      stats: {
        fires: breaker.stats.fires,
        successes: breaker.stats.successes,
        failures: breaker.stats.failures,
        timeouts: breaker.stats.timeouts,
        fallbacks: breaker.stats.fallbacks,
        rejects: breaker.stats.rejects,
      },
      config: {
        timeout: 5000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
        volumeThreshold: 10,
        capacity: 10,
        bucketSpan: 30000,
      } as SseCircuitBreakerConfig,
      lastStateChange: new Date(), // opossum não expõe isso diretamente
    };
  }

  /**
   * Obtém métricas de todos os circuit breakers
   */
  getAllCircuitBreakerMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};

    for (const [name] of this.circuitBreakers) {
      const metric = this.getCircuitBreakerMetrics(name);
      if (metric) {
        metrics[name] = metric;
      }
    }

    return metrics;
  }

  /**
   * Força a abertura de um circuit breaker
   */
  openCircuitBreaker(name: string): boolean {
    const breaker = this.circuitBreakers.get(name);
    if (!breaker) {
      return false;
    }

    breaker.open();
    this.logger.warn(`Circuit breaker '${name}' forçado para estado OPEN`);
    return true;
  }

  /**
   * Força o fechamento de um circuit breaker
   */
  closeCircuitBreaker(name: string): boolean {
    const breaker = this.circuitBreakers.get(name);
    if (!breaker) {
      return false;
    }

    breaker.close();
    this.logger.log(`Circuit breaker '${name}' forçado para estado CLOSED`);
    return true;
  }

  /**
   * Remove um circuit breaker
   */
  removeCircuitBreaker(name: string): boolean {
    const breaker = this.circuitBreakers.get(name);
    if (!breaker) {
      return false;
    }

    breaker.shutdown();
    this.circuitBreakers.delete(name);
    this.logger.log(`Circuit breaker '${name}' removido`);
    return true;
  }

  /**
   * Limpa todos os circuit breakers
   */
  clearAllCircuitBreakers(): void {
    for (const [name, breaker] of this.circuitBreakers) {
      breaker.shutdown();
      this.logger.log(`Circuit breaker '${name}' finalizado`);
    }
    this.circuitBreakers.clear();
  }

  /**
   * Configura listeners para eventos do circuit breaker
   */
  private setupCircuitBreakerListeners(
    name: string,
    breaker: CircuitBreaker,
  ): void {
    // Estado aberto
    breaker.on('open', () => {
      this.logger.warn(
        `Circuit breaker '${name}' ABERTO - muitas falhas detectadas`,
      );
      this.metricsService.recordCircuitBreakerEvent(
        'sse_circuit_breaker_state_change',
        'info',
      );
    });

    // Estado fechado
    breaker.on('close', () => {
      this.logger.log(
        `Circuit breaker '${name}' FECHADO - operação normal restaurada`,
      );
      this.metricsService.recordCircuitBreakerEvent(
        'sse_circuit_breaker_state_change',
        'info',
      );
    });

    // Estado meio-aberto
    breaker.on('halfOpen', () => {
      this.logger.log(
        `Circuit breaker '${name}' MEIO-ABERTO - testando recuperação`,
      );
      this.metricsService.recordCircuitBreakerEvent(
        'sse_circuit_breaker_state_change',
        'info',
      );
    });

    // Sucesso
    breaker.on('success', (result) => {
      this.metricsService.recordCircuitBreakerEvent(
        'sse_circuit_breaker_success',
        'info',
      );
    });

    // Falha
    breaker.on('failure', (error) => {
      this.logger.error(`Circuit breaker '${name}' - falha detectada`, {
        error: error.message,
        stack: error.stack,
      });
      this.metricsService.recordCircuitBreakerEvent(
        'sse_circuit_breaker_failure',
        'error',
      );
    });

    // Timeout
    breaker.on('timeout', () => {
      this.logger.warn(`Circuit breaker '${name}' - timeout detectado`);
      this.metricsService.recordCircuitBreakerEvent(
        'sse_circuit_breaker_timeout',
        'warning',
      );
    });

    // Fallback
    breaker.on('fallback', (result) => {
      this.logger.warn(`Circuit breaker '${name}' - fallback executado`);
      this.metricsService.recordCircuitBreakerEvent(
        'sse_circuit_breaker_fallback',
        'warning',
      );
    });

    // Rejeição (circuito aberto)
    breaker.on('reject', () => {
      this.logger.warn(
        `Circuit breaker '${name}' - requisição indeferida (circuito aberto)`,
      );
      this.metricsService.recordCircuitBreakerEvent(
        'sse_circuit_breaker_reject',
        'error',
      );
    });
  }

  /**
   * Health check para verificar o status dos circuit breakers
   */
  getHealthStatus(): {
    healthy: boolean;
    circuitBreakers: Record<string, { state: string; healthy: boolean }>;
  } {
    const circuitBreakers: Record<string, { state: string; healthy: boolean }> =
      {};
    let allHealthy = true;

    for (const [name, breaker] of this.circuitBreakers) {
      const state = breaker.opened
        ? 'open'
        : breaker.halfOpen
          ? 'half-open'
          : 'closed';
      const healthy = !breaker.opened; // Considera saudável se não estiver aberto

      circuitBreakers[name] = { state, healthy };

      if (!healthy) {
        allHealthy = false;
      }
    }

    return {
      healthy: allHealthy,
      circuitBreakers,
    };
  }
}
