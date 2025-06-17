import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Interface para configuração de Circuit Breaker
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  halfOpenMaxCalls: number;
  resetTimeout: number;
}

/**
 * Interface para configuração de Health Check
 */
export interface HealthCheckConfig {
  interval: number;
  timeout: number;
  retries: number;
  gracePeriod: number;
  endpoints: {
    database: string;
    redis: string;
    external?: string[];
  };
}

/**
 * Interface para configuração de Retry Policy
 */
export interface RetryPolicyConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterEnabled: boolean;
  timeout: number;
}

/**
 * Interface para configuração de Error Boundary
 */
export interface ErrorBoundaryConfig {
  maxErrors: number;
  timeWindow: number;
  criticalErrorThreshold: number;
  notificationEnabled: boolean;
  logLevel: string;
}

/**
 * Interface para configuração de Logging
 */
export interface LoggingConfig {
  level: string;
  enableConsole: boolean;
  enableFile: boolean;
  enableElastic: boolean;
  filePath?: string;
  elasticUrl?: string;
  rateLimitEnabled: boolean;
  rateLimitWindow: number;
  rateLimitMax: number;
  samplingEnabled: boolean;
  samplingRate: number;
}

/**
 * Interface para configuração de Graceful Degradation
 */
export interface GracefulDegradationConfig {
  monitoringInterval: number;
  recoveryCheckInterval: number;
  thresholds: {
    minor: {
      errorRate: number;
      responseTime: number;
      cpuUsage: number;
      memoryUsage: number;
    };
    moderate: {
      errorRate: number;
      responseTime: number;
      cpuUsage: number;
      memoryUsage: number;
    };
    severe: {
      errorRate: number;
      responseTime: number;
      cpuUsage: number;
      memoryUsage: number;
    };
    critical: {
      errorRate: number;
      responseTime: number;
      cpuUsage: number;
      memoryUsage: number;
    };
  };
  features: {
    [key: string]: {
      degradationLevels: string[];
      fallbackStrategies: string[];
    };
  };
}

/**
 * Interface para configuração de Rate Limiting
 */
export interface RateLimitingConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
  keyPrefix: string;
  degradationMultipliers: {
    minor: number;
    moderate: number;
    severe: number;
    critical: number;
  };
}

/**
 * Interface para configuração completa de resiliência
 */
export interface SseResilienceConfig {
  circuitBreaker: {
    database: CircuitBreakerConfig;
    redis: CircuitBreakerConfig;
    notification: CircuitBreakerConfig;
    sse: CircuitBreakerConfig;
    external: CircuitBreakerConfig;
  };
  healthCheck: HealthCheckConfig;
  retryPolicy: {
    database: RetryPolicyConfig;
    redis: RetryPolicyConfig;
    notification: RetryPolicyConfig;
    sse: RetryPolicyConfig;
    external: RetryPolicyConfig;
  };
  errorBoundary: ErrorBoundaryConfig;
  logging: LoggingConfig;
  gracefulDegradation: GracefulDegradationConfig;
  rateLimiting: RateLimitingConfig;
}

/**
 * Serviço de configuração para resiliência SSE
 */
@Injectable()
export class SseResilienceConfigService {
  private readonly config: SseResilienceConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = this.loadConfiguration();
  }

  /**
   * Obter configuração completa
   */
  getConfig(): SseResilienceConfig {
    return this.config;
  }

  /**
   * Obter configuração de Circuit Breaker
   */
  getCircuitBreakerConfig(type: keyof SseResilienceConfig['circuitBreaker']): CircuitBreakerConfig {
    return this.config.circuitBreaker[type];
  }

  /**
   * Obter configuração de Health Check
   */
  getHealthCheckConfig(): HealthCheckConfig {
    return this.config.healthCheck;
  }

  /**
   * Obter configuração de Retry Policy
   */
  getRetryPolicyConfig(type: keyof SseResilienceConfig['retryPolicy']): RetryPolicyConfig {
    return this.config.retryPolicy[type];
  }

  /**
   * Obter configuração de Error Boundary
   */
  getErrorBoundaryConfig(): ErrorBoundaryConfig {
    return this.config.errorBoundary;
  }

  /**
   * Obter configuração de Logging
   */
  getLoggingConfig(): LoggingConfig {
    return this.config.logging;
  }

  /**
   * Obter configuração de Graceful Degradation
   */
  getGracefulDegradationConfig(): GracefulDegradationConfig {
    return this.config.gracefulDegradation;
  }

  /**
   * Obter configuração de Rate Limiting
   */
  getRateLimitingConfig(): RateLimitingConfig {
    return this.config.rateLimiting;
  }

  /**
   * Carregar configuração do ambiente
   */
  private loadConfiguration(): SseResilienceConfig {
    return {
      circuitBreaker: {
        database: {
          failureThreshold: this.configService.get<number>('SSE_CB_DB_FAILURE_THRESHOLD', 5),
          recoveryTimeout: this.configService.get<number>('SSE_CB_DB_RECOVERY_TIMEOUT', 30000),
          monitoringPeriod: this.configService.get<number>('SSE_CB_DB_MONITORING_PERIOD', 60000),
          halfOpenMaxCalls: this.configService.get<number>('SSE_CB_DB_HALF_OPEN_MAX_CALLS', 3),
          resetTimeout: this.configService.get<number>('SSE_CB_DB_RESET_TIMEOUT', 60000),
        },
        redis: {
          failureThreshold: this.configService.get<number>('SSE_CB_REDIS_FAILURE_THRESHOLD', 3),
          recoveryTimeout: this.configService.get<number>('SSE_CB_REDIS_RECOVERY_TIMEOUT', 15000),
          monitoringPeriod: this.configService.get<number>('SSE_CB_REDIS_MONITORING_PERIOD', 30000),
          halfOpenMaxCalls: this.configService.get<number>('SSE_CB_REDIS_HALF_OPEN_MAX_CALLS', 2),
          resetTimeout: this.configService.get<number>('SSE_CB_REDIS_RESET_TIMEOUT', 30000),
        },
        notification: {
          failureThreshold: this.configService.get<number>('SSE_CB_NOTIFICATION_FAILURE_THRESHOLD', 5),
          recoveryTimeout: this.configService.get<number>('SSE_CB_NOTIFICATION_RECOVERY_TIMEOUT', 20000),
          monitoringPeriod: this.configService.get<number>('SSE_CB_NOTIFICATION_MONITORING_PERIOD', 45000),
          halfOpenMaxCalls: this.configService.get<number>('SSE_CB_NOTIFICATION_HALF_OPEN_MAX_CALLS', 3),
          resetTimeout: this.configService.get<number>('SSE_CB_NOTIFICATION_RESET_TIMEOUT', 45000),
        },
        sse: {
          failureThreshold: this.configService.get<number>('SSE_CB_SSE_FAILURE_THRESHOLD', 10),
          recoveryTimeout: this.configService.get<number>('SSE_CB_SSE_RECOVERY_TIMEOUT', 10000),
          monitoringPeriod: this.configService.get<number>('SSE_CB_SSE_MONITORING_PERIOD', 30000),
          halfOpenMaxCalls: this.configService.get<number>('SSE_CB_SSE_HALF_OPEN_MAX_CALLS', 5),
          resetTimeout: this.configService.get<number>('SSE_CB_SSE_RESET_TIMEOUT', 30000),
        },
        external: {
          failureThreshold: this.configService.get<number>('SSE_CB_EXTERNAL_FAILURE_THRESHOLD', 3),
          recoveryTimeout: this.configService.get<number>('SSE_CB_EXTERNAL_RECOVERY_TIMEOUT', 60000),
          monitoringPeriod: this.configService.get<number>('SSE_CB_EXTERNAL_MONITORING_PERIOD', 120000),
          halfOpenMaxCalls: this.configService.get<number>('SSE_CB_EXTERNAL_HALF_OPEN_MAX_CALLS', 2),
          resetTimeout: this.configService.get<number>('SSE_CB_EXTERNAL_RESET_TIMEOUT', 120000),
        },
      },
      healthCheck: {
        interval: this.configService.get<number>('SSE_HEALTH_CHECK_INTERVAL', 30000),
        timeout: this.configService.get<number>('SSE_HEALTH_CHECK_TIMEOUT', 5000),
        retries: this.configService.get<number>('SSE_HEALTH_CHECK_RETRIES', 3),
        gracePeriod: this.configService.get<number>('SSE_HEALTH_CHECK_GRACE_PERIOD', 10000),
        endpoints: {
          database: this.configService.get<string>('SSE_HEALTH_DB_ENDPOINT', 'postgresql://localhost:5432'),
          redis: this.configService.get<string>('SSE_HEALTH_REDIS_ENDPOINT', 'redis://localhost:6379'),
          external: this.configService.get<string>('SSE_HEALTH_EXTERNAL_ENDPOINTS', '').split(',').filter(Boolean),
        },
      },
      retryPolicy: {
        database: {
          maxAttempts: this.configService.get<number>('SSE_RETRY_DB_MAX_ATTEMPTS', 3),
          baseDelay: this.configService.get<number>('SSE_RETRY_DB_BASE_DELAY', 1000),
          maxDelay: this.configService.get<number>('SSE_RETRY_DB_MAX_DELAY', 10000),
          backoffMultiplier: this.configService.get<number>('SSE_RETRY_DB_BACKOFF_MULTIPLIER', 2),
          jitterEnabled: this.configService.get<boolean>('SSE_RETRY_DB_JITTER_ENABLED', true),
          timeout: this.configService.get<number>('SSE_RETRY_DB_TIMEOUT', 30000),
        },
        redis: {
          maxAttempts: this.configService.get<number>('SSE_RETRY_REDIS_MAX_ATTEMPTS', 3),
          baseDelay: this.configService.get<number>('SSE_RETRY_REDIS_BASE_DELAY', 500),
          maxDelay: this.configService.get<number>('SSE_RETRY_REDIS_MAX_DELAY', 5000),
          backoffMultiplier: this.configService.get<number>('SSE_RETRY_REDIS_BACKOFF_MULTIPLIER', 1.5),
          jitterEnabled: this.configService.get<boolean>('SSE_RETRY_REDIS_JITTER_ENABLED', true),
          timeout: this.configService.get<number>('SSE_RETRY_REDIS_TIMEOUT', 10000),
        },
        notification: {
          maxAttempts: this.configService.get<number>('SSE_RETRY_NOTIFICATION_MAX_ATTEMPTS', 5),
          baseDelay: this.configService.get<number>('SSE_RETRY_NOTIFICATION_BASE_DELAY', 2000),
          maxDelay: this.configService.get<number>('SSE_RETRY_NOTIFICATION_MAX_DELAY', 30000),
          backoffMultiplier: this.configService.get<number>('SSE_RETRY_NOTIFICATION_BACKOFF_MULTIPLIER', 2),
          jitterEnabled: this.configService.get<boolean>('SSE_RETRY_NOTIFICATION_JITTER_ENABLED', true),
          timeout: this.configService.get<number>('SSE_RETRY_NOTIFICATION_TIMEOUT', 60000),
        },
        sse: {
          maxAttempts: this.configService.get<number>('SSE_RETRY_SSE_MAX_ATTEMPTS', 2),
          baseDelay: this.configService.get<number>('SSE_RETRY_SSE_BASE_DELAY', 100),
          maxDelay: this.configService.get<number>('SSE_RETRY_SSE_MAX_DELAY', 1000),
          backoffMultiplier: this.configService.get<number>('SSE_RETRY_SSE_BACKOFF_MULTIPLIER', 1.2),
          jitterEnabled: this.configService.get<boolean>('SSE_RETRY_SSE_JITTER_ENABLED', false),
          timeout: this.configService.get<number>('SSE_RETRY_SSE_TIMEOUT', 5000),
        },
        external: {
          maxAttempts: this.configService.get<number>('SSE_RETRY_EXTERNAL_MAX_ATTEMPTS', 3),
          baseDelay: this.configService.get<number>('SSE_RETRY_EXTERNAL_BASE_DELAY', 5000),
          maxDelay: this.configService.get<number>('SSE_RETRY_EXTERNAL_MAX_DELAY', 60000),
          backoffMultiplier: this.configService.get<number>('SSE_RETRY_EXTERNAL_BACKOFF_MULTIPLIER', 3),
          jitterEnabled: this.configService.get<boolean>('SSE_RETRY_EXTERNAL_JITTER_ENABLED', true),
          timeout: this.configService.get<number>('SSE_RETRY_EXTERNAL_TIMEOUT', 120000),
        },
      },
      errorBoundary: {
        maxErrors: this.configService.get<number>('SSE_ERROR_BOUNDARY_MAX_ERRORS', 100),
        timeWindow: this.configService.get<number>('SSE_ERROR_BOUNDARY_TIME_WINDOW', 300000), // 5 minutos
        criticalErrorThreshold: this.configService.get<number>('SSE_ERROR_BOUNDARY_CRITICAL_THRESHOLD', 10),
        notificationEnabled: this.configService.get<boolean>('SSE_ERROR_BOUNDARY_NOTIFICATION_ENABLED', true),
        logLevel: this.configService.get<string>('SSE_ERROR_BOUNDARY_LOG_LEVEL', 'error'),
      },
      logging: {
        level: this.configService.get<string>('SSE_LOG_LEVEL', 'info'),
        enableConsole: this.configService.get<boolean>('SSE_LOG_ENABLE_CONSOLE', true),
        enableFile: this.configService.get<boolean>('SSE_LOG_ENABLE_FILE', false),
        enableElastic: this.configService.get<boolean>('SSE_LOG_ENABLE_ELASTIC', false),
        filePath: this.configService.get<string>('SSE_LOG_FILE_PATH'),
        elasticUrl: this.configService.get<string>('SSE_LOG_ELASTIC_URL'),
        rateLimitEnabled: this.configService.get<boolean>('SSE_LOG_RATE_LIMIT_ENABLED', true),
        rateLimitWindow: this.configService.get<number>('SSE_LOG_RATE_LIMIT_WINDOW', 60000),
        rateLimitMax: this.configService.get<number>('SSE_LOG_RATE_LIMIT_MAX', 1000),
        samplingEnabled: this.configService.get<boolean>('SSE_LOG_SAMPLING_ENABLED', false),
        samplingRate: this.configService.get<number>('SSE_LOG_SAMPLING_RATE', 0.1),
      },
      gracefulDegradation: {
        monitoringInterval: this.configService.get<number>('SSE_DEGRADATION_MONITORING_INTERVAL', 30000),
        recoveryCheckInterval: this.configService.get<number>('SSE_DEGRADATION_RECOVERY_CHECK_INTERVAL', 60000),
        thresholds: {
          minor: {
            errorRate: this.configService.get<number>('SSE_DEGRADATION_MINOR_ERROR_RATE', 0.05),
            responseTime: this.configService.get<number>('SSE_DEGRADATION_MINOR_RESPONSE_TIME', 1000),
            cpuUsage: this.configService.get<number>('SSE_DEGRADATION_MINOR_CPU_USAGE', 0.7),
            memoryUsage: this.configService.get<number>('SSE_DEGRADATION_MINOR_MEMORY_USAGE', 0.8),
          },
          moderate: {
            errorRate: this.configService.get<number>('SSE_DEGRADATION_MODERATE_ERROR_RATE', 0.1),
            responseTime: this.configService.get<number>('SSE_DEGRADATION_MODERATE_RESPONSE_TIME', 2000),
            cpuUsage: this.configService.get<number>('SSE_DEGRADATION_MODERATE_CPU_USAGE', 0.8),
            memoryUsage: this.configService.get<number>('SSE_DEGRADATION_MODERATE_MEMORY_USAGE', 0.85),
          },
          severe: {
            errorRate: this.configService.get<number>('SSE_DEGRADATION_SEVERE_ERROR_RATE', 0.2),
            responseTime: this.configService.get<number>('SSE_DEGRADATION_SEVERE_RESPONSE_TIME', 5000),
            cpuUsage: this.configService.get<number>('SSE_DEGRADATION_SEVERE_CPU_USAGE', 0.9),
            memoryUsage: this.configService.get<number>('SSE_DEGRADATION_SEVERE_MEMORY_USAGE', 0.9),
          },
          critical: {
            errorRate: this.configService.get<number>('SSE_DEGRADATION_CRITICAL_ERROR_RATE', 0.5),
            responseTime: this.configService.get<number>('SSE_DEGRADATION_CRITICAL_RESPONSE_TIME', 10000),
            cpuUsage: this.configService.get<number>('SSE_DEGRADATION_CRITICAL_CPU_USAGE', 0.95),
            memoryUsage: this.configService.get<number>('SSE_DEGRADATION_CRITICAL_MEMORY_USAGE', 0.95),
          },
        },
        features: {
          rate_limiting: {
            degradationLevels: ['minor', 'moderate', 'severe', 'critical'],
            fallbackStrategies: ['reduce_limits', 'basic_limiting', 'emergency_limiting'],
          },
          authentication: {
            degradationLevels: ['severe', 'critical'],
            fallbackStrategies: ['basic_auth', 'token_only'],
          },
          logging: {
            degradationLevels: ['moderate', 'severe', 'critical'],
            fallbackStrategies: ['reduce_logging', 'essential_only', 'disable_logging'],
          },
          notifications: {
            degradationLevels: ['minor', 'moderate', 'severe', 'critical'],
            fallbackStrategies: ['reduce_frequency', 'essential_only', 'local_only'],
          },
          redis_operations: {
            degradationLevels: ['moderate', 'severe', 'critical'],
            fallbackStrategies: ['local_cache', 'memory_only', 'disable_cache'],
          },
        },
      },
      rateLimiting: {
        windowMs: this.configService.get<number>('SSE_RATE_LIMIT_WINDOW_MS', 60000),
        maxRequests: this.configService.get<number>('SSE_RATE_LIMIT_MAX_REQUESTS', 100),
        skipSuccessfulRequests: this.configService.get<boolean>('SSE_RATE_LIMIT_SKIP_SUCCESSFUL', false),
        skipFailedRequests: this.configService.get<boolean>('SSE_RATE_LIMIT_SKIP_FAILED', false),
        keyPrefix: this.configService.get<string>('SSE_RATE_LIMIT_KEY_PREFIX', 'sse_rate_limit'),
        degradationMultipliers: {
          minor: this.configService.get<number>('SSE_RATE_LIMIT_MINOR_MULTIPLIER', 0.8),
          moderate: this.configService.get<number>('SSE_RATE_LIMIT_MODERATE_MULTIPLIER', 0.6),
          severe: this.configService.get<number>('SSE_RATE_LIMIT_SEVERE_MULTIPLIER', 0.3),
          critical: this.configService.get<number>('SSE_RATE_LIMIT_CRITICAL_MULTIPLIER', 0.1),
        },
      },
    };
  }
}