import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pino from 'pino';
import { Request, Response } from 'express';

/**
 * Níveis de log
 */
export enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

/**
 * Categorias de log do SSE
 */
export enum SseLogCategory {
  CONNECTION = 'sse-connection',
  NOTIFICATION = 'sse-notification',
  AUTHENTICATION = 'sse-auth',
  AUTHORIZATION = 'sse-authz',
  DATABASE = 'sse-database',
  REDIS = 'sse-redis',
  CIRCUIT_BREAKER = 'sse-circuit-breaker',
  RATE_LIMIT = 'sse-rate-limit',
  ERROR_BOUNDARY = 'sse-error-boundary',
  HEALTH_CHECK = 'sse-health-check',
  METRICS = 'sse-metrics',
  PERFORMANCE = 'sse-performance',
  SECURITY = 'sse-security',
  AUDIT = 'sse-audit',
}

/**
 * Contexto base para logs
 */
export interface BaseLogContext {
  /** ID da requisição */
  requestId?: string;
  /** ID do usuário */
  userId?: number;
  /** ID da sessão */
  sessionId?: string;
  /** IP do cliente */
  clientIp?: string;
  /** User Agent */
  userAgent?: string;
  /** Timestamp */
  timestamp: Date;
  /** Categoria do log */
  category: SseLogCategory;
  /** Componente que gerou o log */
  component?: string;
  /** Operação sendo executada */
  operation?: string;
  /** Dados adicionais */
  metadata?: Record<string, any>;
}

/**
 * Contexto para logs de conexão SSE
 */
export interface SseConnectionLogContext extends BaseLogContext {
  category: SseLogCategory.CONNECTION;
  /** Número de conexões ativas */
  activeConnections?: number;
  /** Duração da conexão em ms */
  connectionDuration?: number;
  /** Motivo da desconexão */
  disconnectionReason?: string;
}

/**
 * Contexto para logs de notificação
 */
export interface SseNotificationLogContext extends BaseLogContext {
  category: SseLogCategory.NOTIFICATION;
  /** ID da notificação */
  notificationId?: number;
  /** Tipo da notificação */
  notificationType?: string;
  /** Número de destinatários */
  recipientCount?: number;
  /** Tempo de processamento em ms */
  processingTime?: number;
}

/**
 * Contexto para logs de performance
 */
export interface SsePerformanceLogContext extends BaseLogContext {
  category: SseLogCategory.PERFORMANCE;
  /** Duração da operação em ms */
  duration: number;
  /** Uso de memória em MB */
  memoryUsage?: number;
  /** Uso de CPU em % */
  cpuUsage?: number;
}

/**
 * Configuração do logging estruturado
 */
export interface SseLoggingConfig {
  level: LogLevel;
  enablePerformanceLogs: boolean;
  enableSecurityLogs: boolean;
  enableRequestCorrelation: boolean;
  outputFormat: 'json' | 'pretty';
  includeStackTrace: boolean;
  maxLogsPerMinute: number;
  enableLogSampling: boolean;
  samplingRate: number;
}

/**
 * Serviço de logging estruturado para SSE
 * Fornece logging padronizado com contexto rico e métricas
 */
@Injectable()
export class SseStructuredLoggingService {
  private readonly logger = new Logger(SseStructuredLoggingService.name);
  private readonly pinoLogger: pino.Logger;
  private readonly config: SseLoggingConfig;
  private logCounter = 0;
  private readonly logTimestamps: Date[] = [];
  private readonly logCounts = new Map<string, number>();

  constructor(private readonly configService: ConfigService) {
    // Configuração do serviço
    this.config = {
      level: this.configService.get<LogLevel>('SSE_LOG_LEVEL', LogLevel.INFO),
      enablePerformanceLogs: this.configService.get<boolean>('SSE_LOG_ENABLE_PERFORMANCE', true),
      enableSecurityLogs: this.configService.get<boolean>('SSE_LOG_ENABLE_SECURITY', true),
      enableRequestCorrelation: this.configService.get<boolean>('SSE_LOG_ENABLE_REQUEST_CORRELATION', true),
      outputFormat: this.configService.get<'json' | 'pretty'>('SSE_LOG_OUTPUT_FORMAT', 'json'),
      includeStackTrace: this.configService.get<boolean>('SSE_LOG_INCLUDE_STACK_TRACE', true),
      maxLogsPerMinute: this.configService.get<number>('SSE_LOG_MAX_PER_MINUTE', 1000),
      enableLogSampling: this.configService.get<boolean>('SSE_LOG_ENABLE_SAMPLING', false),
      samplingRate: this.configService.get<number>('SSE_LOG_SAMPLING_RATE', 0.1),
    };

    // Configurar Pino logger
    this.pinoLogger = pino({
      level: this.config.level,
      formatters: {
        level: (label) => ({ level: label }),
        bindings: () => ({}),
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      transport: this.config.outputFormat === 'pretty' ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      } : undefined,
    });

    this.logger.log('SseStructuredLoggingService inicializado', {
      config: this.config,
    });
  }

  /**
   * Log de conexão SSE
   */
  logConnection(
    level: LogLevel,
    message: string,
    context: Partial<SseConnectionLogContext>,
  ): void {
    this.log(level, message, {
      ...context,
      category: SseLogCategory.CONNECTION,
      component: context.component || 'sse-connection',
    });
  }

  /**
   * Log de notificação
   */
  logNotification(
    level: LogLevel,
    message: string,
    context: Partial<SseNotificationLogContext>,
  ): void {
    this.log(level, message, {
      ...context,
      category: SseLogCategory.NOTIFICATION,
      component: context.component || 'sse-notification',
    });
  }

  /**
   * Log de performance
   */
  logPerformance(
    message: string,
    context: Partial<SsePerformanceLogContext>,
  ): void {
    if (!this.config.enablePerformanceLogs) return;

    this.log(LogLevel.DEBUG, message, {
      ...context,
      category: SseLogCategory.PERFORMANCE,
      component: context.component || 'sse-performance',
    });
  }

  /**
   * Log de autenticação
   */
  logAuthentication(
    level: LogLevel,
    message: string,
    context: Partial<BaseLogContext>,
  ): void {
    this.log(level, message, {
      ...context,
      category: SseLogCategory.AUTHENTICATION,
      component: context.component || 'sse-auth',
    });
  }

  /**
   * Log de autorização
   */
  logAuthorization(
    level: LogLevel,
    message: string,
    context: Partial<BaseLogContext>,
  ): void {
    this.log(level, message, {
      ...context,
      category: SseLogCategory.AUTHORIZATION,
      component: context.component || 'sse-authz',
    });
  }

  /**
   * Log de database
   */
  logDatabase(
    level: LogLevel,
    message: string,
    context: Partial<BaseLogContext>,
  ): void {
    this.log(level, message, {
      ...context,
      category: SseLogCategory.DATABASE,
      component: context.component || 'sse-database',
    });
  }

  /**
   * Log de Redis
   */
  logRedis(
    level: LogLevel,
    message: string,
    context: Partial<BaseLogContext>,
  ): void {
    this.log(level, message, {
      ...context,
      category: SseLogCategory.REDIS,
      component: context.component || 'sse-redis',
    });
  }

  /**
   * Log de circuit breaker
   */
  logCircuitBreaker(
    level: LogLevel,
    message: string,
    context: Partial<BaseLogContext>,
  ): void {
    this.log(level, message, {
      ...context,
      category: SseLogCategory.CIRCUIT_BREAKER,
      component: context.component || 'sse-circuit-breaker',
    });
  }

  /**
   * Log de rate limiting
   */
  logRateLimit(
    level: LogLevel,
    message: string,
    context: Partial<BaseLogContext>,
  ): void {
    this.log(level, message, {
      ...context,
      category: SseLogCategory.RATE_LIMIT,
      component: context.component || 'sse-rate-limit',
    });
  }

  /**
   * Log de health check
   */
  logHealthCheck(
    level: LogLevel,
    message: string,
    context: Partial<BaseLogContext>,
  ): void {
    this.log(level, message, {
      ...context,
      category: SseLogCategory.HEALTH_CHECK,
      component: context.component || 'sse-health-check',
    });
  }

  /**
   * Log de métricas
   */
  logMetrics(
    message: string,
    context: Partial<BaseLogContext>,
  ): void {
    this.log(LogLevel.DEBUG, message, {
      ...context,
      category: SseLogCategory.METRICS,
      component: context.component || 'sse-metrics',
    });
  }

  /**
   * Log de segurança
   */
  logSecurity(
    message: string,
    context: Partial<BaseLogContext>,
  ): void {
    this.log(LogLevel.WARN, message, {
      ...context,
      category: SseLogCategory.SECURITY,
      component: context.component || 'sse-security',
    });
  }

  /**
   * Log de requisição HTTP
   */
  logHttpRequest(
    req: Request,
    res: Response,
    duration: number,
  ): void {
    const context: Partial<BaseLogContext> = {
      requestId: req.headers['x-request-id'] as string,
      userId: (req as any).user?.id,
      clientIp: req.ip,
      userAgent: req.get('User-Agent'),
      category: SseLogCategory.CONNECTION,
      component: 'http-request',
      operation: `${req.method} ${req.path}`,
      metadata: {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        contentLength: res.get('Content-Length'),
        referer: req.get('Referer'),
      },
    };

    const level = res.statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    this.log(level, `HTTP ${req.method} ${req.path} - ${res.statusCode}`, context);
  }

  /**
   * Log de erro com stack trace
   */
  logError(
    error: Error,
    context: Partial<BaseLogContext> = {},
  ): void {
    const errorContext = {
      ...context,
      category: SseLogCategory.ERROR_BOUNDARY,
      component: context.component || 'error-handler',
      metadata: {
        ...context.metadata,
        errorName: error.constructor.name,
        errorMessage: error.message,
        stackTrace: this.config.includeStackTrace ? error.stack : undefined,
      },
    };

    this.log(LogLevel.ERROR, `Erro capturado: ${error.message}`, errorContext);
  }

  /**
   * Cria contexto de log a partir de requisição
   */
  createContextFromRequest(req: Request): Partial<BaseLogContext> {
    return {
      requestId: req.headers['x-request-id'] as string,
      userId: (req as any).user?.id,
      clientIp: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
    };
  }

  /**
   * Obtém métricas de logging
   */
  getMetrics() {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    
    const recentLogs = this.logTimestamps.filter(timestamp => timestamp > oneMinuteAgo);
    
    return {
      totalLogs: this.logCounter,
      logsLastMinute: recentLogs.length,
      logCounts: Object.fromEntries(this.logCounts),
      averageLogsPerMinute: this.logCounter / Math.max(1, (now.getTime() - this.logTimestamps[0]?.getTime() || 0) / 60000),
    };
  }

  /**
   * Verifica se deve fazer sampling do log
   */
  private shouldSample(): boolean {
    if (!this.config.enableLogSampling) return true;
    return Math.random() < this.config.samplingRate;
  }

  /**
   * Verifica rate limiting de logs
   */
  private checkRateLimit(): boolean {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    
    const recentLogs = this.logTimestamps.filter(timestamp => timestamp > oneMinuteAgo);
    
    return recentLogs.length < this.config.maxLogsPerMinute;
  }

  /**
   * Método principal de log
   */
  private log(
    level: LogLevel,
    message: string,
    context: Partial<BaseLogContext>,
  ): void {
    // Verificar sampling
    if (!this.shouldSample()) return;
    
    // Verificar rate limiting
    if (!this.checkRateLimit()) return;

    // Preparar contexto completo
    const fullContext = {
      ...context,
      timestamp: context.timestamp || new Date(),
    };

    // Log estruturado com Pino
    const nestLogMessage = `[${fullContext.category}] ${message}`;
    this.pinoLogger[level](fullContext, nestLogMessage);

    // Log com NestJS Logger para compatibilidade
    this.logWithNestLogger(level, nestLogMessage, fullContext);

    // Atualizar métricas
    if (fullContext.category) {
      this.updateMetrics(level, fullContext.category, fullContext.timestamp);
    }
  }

  /**
   * Log com NestJS Logger mapeando níveis corretamente
   */
  private logWithNestLogger(
    level: LogLevel,
    message: string,
    context: any,
  ): void {
    switch (level) {
      case LogLevel.TRACE:
      case LogLevel.DEBUG:
        this.logger.debug(message, context);
        break;
      case LogLevel.INFO:
        this.logger.log(message, context);
        break;
      case LogLevel.WARN:
        this.logger.warn(message, context);
        break;
      case LogLevel.ERROR:
        this.logger.error(message, context);
        break;
      case LogLevel.FATAL:
        this.logger.error(message, context);
        break;
      default:
        this.logger.log(message, context);
    }
  }

  /**
   * Atualiza métricas internas
   */
  private updateMetrics(
    level: LogLevel,
    category: SseLogCategory,
    timestamp: Date,
  ): void {
    this.logCounter++;
    this.logTimestamps.push(timestamp);

    // Atualizar contadores
    const levelKey = `level:${level}`;
    const categoryKey = `category:${category}`;
    
    this.logCounts.set(levelKey, (this.logCounts.get(levelKey) || 0) + 1);
    this.logCounts.set(categoryKey, (this.logCounts.get(categoryKey) || 0) + 1);

    // Manter apenas os últimos 10000 timestamps
    if (this.logTimestamps.length > 10000) {
      this.logTimestamps.shift();
    }
  }
}