import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Configuração para políticas de retry
 */
export interface RetryPolicyConfig {
  /** Número máximo de tentativas */
  maxAttempts: number;
  /** Delay inicial em ms */
  initialDelay: number;
  /** Multiplicador para backoff exponencial */
  backoffMultiplier: number;
  /** Delay máximo em ms */
  maxDelay: number;
  /** Jitter máximo em ms para randomização */
  maxJitter: number;
  /** Timeout para cada tentativa em ms */
  attemptTimeout: number;
  /** Habilitar backoff exponencial */
  enableExponentialBackoff: boolean;
  /** Habilitar jitter */
  enableJitter: boolean;
}

/**
 * Resultado de uma operação com retry
 */
export interface RetryResult<T> {
  /** Sucesso da operação */
  success: boolean;
  /** Resultado da operação (se bem-sucedida) */
  result?: T;
  /** Erro da operação (se falhou) */
  error?: Error;
  /** Número de tentativas realizadas */
  attempts: number;
  /** Tempo total gasto em ms */
  totalTime: number;
  /** Detalhes de cada tentativa */
  attemptDetails: AttemptDetail[];
}

/**
 * Detalhes de uma tentativa individual
 */
export interface AttemptDetail {
  /** Número da tentativa */
  attempt: number;
  /** Timestamp do início */
  startTime: Date;
  /** Tempo gasto em ms */
  duration: number;
  /** Sucesso da tentativa */
  success: boolean;
  /** Erro da tentativa (se houver) */
  error?: string;
  /** Delay antes desta tentativa em ms */
  delayBefore: number;
}

/**
 * Função que determina se um erro deve ser retentado
 */
export type ShouldRetryFunction = (error: Error, attempt: number) => boolean;

/**
 * Função que será executada com retry
 */
export type RetryableFunction<T> = () => Promise<T>;

/**
 * Função de callback para eventos de retry
 */
export type RetryEventCallback = (event: {
  type: 'attempt' | 'retry' | 'success' | 'failure';
  attempt: number;
  error?: Error;
  delay?: number;
}) => void;

/**
 * Serviço que implementa políticas de retry para operações críticas do SSE
 */
@Injectable()
export class SseRetryPolicyService {
  private readonly logger = new Logger(SseRetryPolicyService.name);
  private readonly defaultConfig: RetryPolicyConfig;

  // Configurações predefinidas para diferentes tipos de operação
  private readonly presetConfigs: Record<string, RetryPolicyConfig> = {
    database: {
      maxAttempts: 3,
      initialDelay: 1000,
      backoffMultiplier: 2,
      maxDelay: 10000,
      maxJitter: 500,
      attemptTimeout: 5000,
      enableExponentialBackoff: true,
      enableJitter: true,
    },
    redis: {
      maxAttempts: 5,
      initialDelay: 500,
      backoffMultiplier: 1.5,
      maxDelay: 5000,
      maxJitter: 200,
      attemptTimeout: 3000,
      enableExponentialBackoff: true,
      enableJitter: true,
    },
    notification: {
      maxAttempts: 3,
      initialDelay: 2000,
      backoffMultiplier: 2,
      maxDelay: 15000,
      maxJitter: 1000,
      attemptTimeout: 10000,
      enableExponentialBackoff: true,
      enableJitter: true,
    },
    sse: {
      maxAttempts: 2,
      initialDelay: 100,
      backoffMultiplier: 2,
      maxDelay: 1000,
      maxJitter: 50,
      attemptTimeout: 2000,
      enableExponentialBackoff: false,
      enableJitter: true,
    },
    external: {
      maxAttempts: 4,
      initialDelay: 2000,
      backoffMultiplier: 2.5,
      maxDelay: 30000,
      maxJitter: 2000,
      attemptTimeout: 15000,
      enableExponentialBackoff: true,
      enableJitter: true,
    },
  };

  constructor(private readonly configService: ConfigService) {
    this.defaultConfig = {
      maxAttempts: this.configService.get<number>('SSE_RETRY_MAX_ATTEMPTS', 3),
      initialDelay: this.configService.get<number>('SSE_RETRY_INITIAL_DELAY', 1000),
      backoffMultiplier: this.configService.get<number>('SSE_RETRY_BACKOFF_MULTIPLIER', 2),
      maxDelay: this.configService.get<number>('SSE_RETRY_MAX_DELAY', 10000),
      maxJitter: this.configService.get<number>('SSE_RETRY_MAX_JITTER', 500),
      attemptTimeout: this.configService.get<number>('SSE_RETRY_ATTEMPT_TIMEOUT', 5000),
      enableExponentialBackoff: this.configService.get<boolean>('SSE_RETRY_ENABLE_EXPONENTIAL_BACKOFF', true),
      enableJitter: this.configService.get<boolean>('SSE_RETRY_ENABLE_JITTER', true),
    };

    this.logger.log('SseRetryPolicyService inicializado', {
      defaultConfig: this.defaultConfig,
      presetConfigs: Object.keys(this.presetConfigs),
    });
  }

  /**
   * Executa uma função com política de retry
   */
  async executeWithRetry<T>(
    fn: RetryableFunction<T>,
    config?: Partial<RetryPolicyConfig>,
    shouldRetry?: ShouldRetryFunction,
    onRetryEvent?: RetryEventCallback,
  ): Promise<RetryResult<T>> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const startTime = Date.now();
    const attemptDetails: AttemptDetail[] = [];
    let lastError: Error | undefined;

    this.logger.debug('Iniciando execução com retry', {
      config: finalConfig,
    });

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      const attemptStartTime = new Date();
      const delayBefore = attempt === 1 ? 0 : this.calculateDelay(attempt - 1, finalConfig);

      // Aplicar delay antes da tentativa (exceto na primeira)
      if (delayBefore > 0) {
        this.logger.debug(`Aguardando ${delayBefore}ms antes da tentativa ${attempt}`);
        await this.sleep(delayBefore);
      }

      onRetryEvent?.({
        type: 'attempt',
        attempt,
        delay: delayBefore,
      });

      try {
        this.logger.debug(`Executando tentativa ${attempt}/${finalConfig.maxAttempts}`);
        
        // Executar função com timeout
        const result = await this.executeWithTimeout(fn, finalConfig.attemptTimeout);
        
        const duration = Date.now() - attemptStartTime.getTime();
        
        attemptDetails.push({
          attempt,
          startTime: attemptStartTime,
          duration,
          success: true,
          delayBefore,
        });

        onRetryEvent?.({
          type: 'success',
          attempt,
        });

        this.logger.debug(`Tentativa ${attempt} bem-sucedida`, {
          duration,
          totalTime: Date.now() - startTime,
        });

        return {
          success: true,
          result,
          attempts: attempt,
          totalTime: Date.now() - startTime,
          attemptDetails,
        };
      } catch (error) {
        lastError = error as Error;
        const duration = Date.now() - attemptStartTime.getTime();
        
        attemptDetails.push({
          attempt,
          startTime: attemptStartTime,
          duration,
          success: false,
          error: lastError.message,
          delayBefore,
        });

        this.logger.warn(`Tentativa ${attempt} falhou`, {
          error: lastError.message,
          duration,
          attempt,
          maxAttempts: finalConfig.maxAttempts,
        });

        // Verificar se deve tentar novamente
        const isLastAttempt = attempt === finalConfig.maxAttempts;
        const shouldRetryError = shouldRetry ? shouldRetry(lastError, attempt) : this.defaultShouldRetry(lastError, attempt);

        if (isLastAttempt || !shouldRetryError) {
          onRetryEvent?.({
            type: 'failure',
            attempt,
            error: lastError,
          });
          break;
        }

        onRetryEvent?.({
          type: 'retry',
          attempt,
          error: lastError,
          delay: this.calculateDelay(attempt, finalConfig),
        });
      }
    }

    this.logger.error('Todas as tentativas falharam', {
      attempts: finalConfig.maxAttempts,
      totalTime: Date.now() - startTime,
      lastError: lastError?.message || 'Erro desconhecido',
    });

    return {
      success: false,
      error: lastError || new Error('Todas as tentativas falharam'),
      attempts: finalConfig.maxAttempts,
      totalTime: Date.now() - startTime,
      attemptDetails,
    };
  }

  /**
   * Executa uma função com retry usando configuração predefinida
   */
  async executeWithPresetRetry<T>(
    fn: RetryableFunction<T>,
    preset: keyof typeof this.presetConfigs,
    customConfig?: Partial<RetryPolicyConfig>,
    shouldRetry?: ShouldRetryFunction,
    onRetryEvent?: RetryEventCallback,
  ): Promise<RetryResult<T>> {
    const presetConfig = this.presetConfigs[preset];
    if (!presetConfig) {
      throw new Error(`Configuração predefinida '${preset}' não encontrada`);
    }

    const finalConfig = { ...presetConfig, ...customConfig };
    return this.executeWithRetry(fn, finalConfig, shouldRetry, onRetryEvent);
  }

  /**
   * Executa operação de banco de dados com retry
   */
  async executeDatabase<T>(
    fn: RetryableFunction<T>,
    customConfig?: Partial<RetryPolicyConfig>,
  ): Promise<RetryResult<T>> {
    return this.executeWithPresetRetry(
      fn,
      'database',
      customConfig,
      this.isDatabaseRetryableError,
      (event) => {
        if (event.type === 'retry') {
          this.logger.warn(`Retentar operação de banco (tentativa ${event.attempt})`, {
            error: event.error?.message,
            delay: event.delay,
          });
        }
      },
    );
  }

  /**
   * Executa operação do Redis com retry
   */
  async executeRedis<T>(
    fn: RetryableFunction<T>,
    customConfig?: Partial<RetryPolicyConfig>,
  ): Promise<RetryResult<T>> {
    return this.executeWithPresetRetry(
      fn,
      'redis',
      customConfig,
      this.isRedisRetryableError,
      (event) => {
        if (event.type === 'retry') {
          this.logger.warn(`Retentar operação Redis (tentativa ${event.attempt})`, {
            error: event.error?.message,
            delay: event.delay,
          });
        }
      },
    );
  }

  /**
   * Executa envio de notificação com retry
   */
  async executeNotification<T>(
    fn: RetryableFunction<T>,
    customConfig?: Partial<RetryPolicyConfig>,
  ): Promise<RetryResult<T>> {
    return this.executeWithPresetRetry(
      fn,
      'notification',
      customConfig,
      this.isNotificationRetryableError,
      (event) => {
        if (event.type === 'retry') {
          this.logger.warn(`Retentar envio de notificação (tentativa ${event.attempt})`, {
            error: event.error?.message,
            delay: event.delay,
          });
        }
      },
    );
  }

  /**
   * Executa operação SSE com retry
   */
  async executeSse<T>(
    fn: RetryableFunction<T>,
    customConfig?: Partial<RetryPolicyConfig>,
  ): Promise<RetryResult<T>> {
    return this.executeWithPresetRetry(
      fn,
      'sse',
      customConfig,
      this.isSseRetryableError,
      (event) => {
        if (event.type === 'retry') {
          this.logger.warn(`Retentar operação SSE (tentativa ${event.attempt})`, {
            error: event.error?.message,
            delay: event.delay,
          });
        }
      },
    );
  }

  /**
   * Executa chamada externa com retry
   */
  async executeExternal<T>(
    fn: RetryableFunction<T>,
    customConfig?: Partial<RetryPolicyConfig>,
  ): Promise<RetryResult<T>> {
    return this.executeWithPresetRetry(
      fn,
      'external',
      customConfig,
      this.isExternalRetryableError,
      (event) => {
        if (event.type === 'retry') {
          this.logger.warn(`Retentar chamada externa (tentativa ${event.attempt})`, {
            error: event.error?.message,
            delay: event.delay,
          });
        }
      },
    );
  }

  /**
   * Obtém configuração predefinida
   */
  getPresetConfig(preset: keyof typeof this.presetConfigs): RetryPolicyConfig {
    const config = this.presetConfigs[preset];
    if (!config) {
      throw new Error(`Configuração predefinida '${preset}' não encontrada`);
    }
    return { ...config };
  }

  /**
   * Lista todas as configurações predefinidas disponíveis
   */
  getAvailablePresets(): string[] {
    return Object.keys(this.presetConfigs);
  }

  /**
   * Calcula o delay para a próxima tentativa
   */
  private calculateDelay(attempt: number, config: RetryPolicyConfig): number {
    let delay = config.initialDelay;

    if (config.enableExponentialBackoff) {
      delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    }

    // Aplicar limite máximo
    delay = Math.min(delay, config.maxDelay);

    // Aplicar jitter se habilitado
    if (config.enableJitter) {
      const jitter = Math.random() * config.maxJitter;
      delay += jitter;
    }

    return Math.round(delay);
  }

  /**
   * Executa função com timeout
   */
  private async executeWithTimeout<T>(fn: RetryableFunction<T>, timeout: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operação excedeu timeout de ${timeout}ms`));
      }, timeout);

      fn()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Função de sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Política padrão para determinar se deve tentar novamente
   */
  private defaultShouldRetry(error: Error, attempt: number): boolean {
    // Não tentar novamente para erros de validação ou autorização
    const nonRetryableErrors = [
      'ValidationError',
      'UnauthorizedError',
      'ForbiddenError',
      'BadRequestError',
    ];

    if (nonRetryableErrors.some(errorType => error.constructor.name.includes(errorType))) {
      return false;
    }

    // Não tentar novamente se a mensagem indica erro não recuperável
    const nonRetryableMessages = [
      'invalid credentials',
      'access denied',
      'permission denied',
      'not found',
      'bad request',
    ];

    if (nonRetryableMessages.some(msg => error.message.toLowerCase().includes(msg))) {
      return false;
    }

    return true;
  }

  /**
   * Determina se erro de banco de dados deve ser retentado
   */
  private isDatabaseRetryableError = (error: Error, attempt: number): boolean => {
    const retryableErrors = [
      'connection',
      'timeout',
      'network',
      'ECONNRESET',
      'ENOTFOUND',
      'ETIMEDOUT',
      'lock',
      'deadlock',
    ];

    return retryableErrors.some(errorType => 
      error.message.toLowerCase().includes(errorType.toLowerCase())
    );
  };

  /**
   * Determina se erro do Redis deve ser retentado
   */
  private isRedisRetryableError = (error: Error, attempt: number): boolean => {
    const retryableErrors = [
      'connection',
      'timeout',
      'network',
      'ECONNRESET',
      'ENOTFOUND',
      'ETIMEDOUT',
      'redis',
      'cluster',
    ];

    return retryableErrors.some(errorType => 
      error.message.toLowerCase().includes(errorType.toLowerCase())
    );
  };

  /**
   * Determina se erro de notificação deve ser retentado
   */
  private isNotificationRetryableError = (error: Error, attempt: number): boolean => {
    const retryableErrors = [
      'network',
      'timeout',
      'service unavailable',
      'internal server error',
      'bad gateway',
      'gateway timeout',
    ];

    return retryableErrors.some(errorType => 
      error.message.toLowerCase().includes(errorType.toLowerCase())
    );
  };

  /**
   * Determina se erro SSE deve ser retentado
   */
  private isSseRetryableError = (error: Error, attempt: number): boolean => {
    const retryableErrors = [
      'connection',
      'network',
      'ECONNRESET',
      'EPIPE',
    ];

    return retryableErrors.some(errorType => 
      error.message.toLowerCase().includes(errorType.toLowerCase())
    );
  };

  /**
   * Determina se erro de chamada externa deve ser retentado
   */
  private isExternalRetryableError = (error: Error, attempt: number): boolean => {
    const retryableErrors = [
      'network',
      'timeout',
      'ECONNRESET',
      'ENOTFOUND',
      'ETIMEDOUT',
      '5', // Erros 5xx
      'service unavailable',
      'internal server error',
      'bad gateway',
      'gateway timeout',
    ];

    return retryableErrors.some(errorType => 
      error.message.toLowerCase().includes(errorType.toLowerCase())
    );
  };
}