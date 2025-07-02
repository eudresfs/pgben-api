import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import {
  SseStructuredLoggingService,
  LogLevel,
} from '../services/sse-structured-logging.service';
import {
  SseGracefulDegradationService,
  DegradationLevel,
} from '../services/sse-graceful-degradation.service';
import { SseRetryPolicyService } from '../services/sse-retry-policy.service';
import { SseErrorBoundaryService } from '../services/sse-error-boundary.service';
import { SseRedisService } from '../services/sse-redis.service';

/**
 * Interface para configuração de rate limiting
 */
interface RateLimitConfig {
  windowMs: number; // Janela de tempo em milissegundos
  maxRequests: number; // Máximo de requests por janela
  skipSuccessfulRequests?: boolean; // Pular requests bem-sucedidos
  skipFailedRequests?: boolean; // Pular requests falhados
  keyGenerator?: (req: Request) => string; // Gerador de chave customizado
  onLimitReached?: (req: Request, res: Response) => void; // Callback quando limite é atingido
}

/**
 * Interface para informações de rate limiting
 */
interface RateLimitInfo {
  totalHits: number;
  totalHitsInWindow: number;
  remainingPoints: number;
  msBeforeNext: number;
  isFirstInWindow: boolean;
}

/**
 * Interface para resultado de verificação de rate limit
 */
interface RateLimitResult {
  allowed: boolean;
  info: RateLimitInfo;
  retryAfter?: number;
}

/**
 * Middleware de rate limiting para SSE com integração de resiliência
 */
@Injectable()
export class SseRateLimitMiddleware implements NestMiddleware {
  private readonly defaultConfig: RateLimitConfig = {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 100, // 100 requests por minuto
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  };

  constructor(
    private readonly redisService: SseRedisService,
    private readonly loggingService: SseStructuredLoggingService,
    private readonly gracefulDegradationService: SseGracefulDegradationService,
    private readonly retryPolicyService: SseRetryPolicyService,
    private readonly errorBoundaryService: SseErrorBoundaryService,
  ) {}

  /**
   * Middleware principal de rate limiting
   */
  async use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const clientIp = this.getClientIp(req);
    const userId = this.getUserId(req);

    try {
      // Verificar se o rate limiting está disponível
      const isRateLimitingAvailable =
        this.gracefulDegradationService.isFeatureAvailable('rate_limiting');

      if (!isRateLimitingAvailable) {
        this.loggingService.logConnection(
          LogLevel.WARN,
          'Rate limiting indisponível - permitindo request',
          {
            userId: userId ? parseInt(userId, 10) : undefined,
            clientIp,
            userAgent: req.get('User-Agent'),
            metadata: {
              degradationLevel:
                this.gracefulDegradationService.getCurrentStatus().currentLevel,
              reason: 'rate_limiting_unavailable',
            },
          },
        );

        return next();
      }

      // Obter configuração baseada no nível de degradação
      const config = this.getConfigForDegradationLevel();

      // Verificar rate limit com retry policy
      const retryResult = await this.retryPolicyService.executeWithRetry(
        () => this.checkRateLimit(req, config),
        { maxAttempts: 3, initialDelay: 100 },
      );

      const rateLimitResult = retryResult.result;
      const duration = Date.now() - startTime;

      if (!rateLimitResult) {
        // Erro no rate limit - permitir request (fail-open)
        this.loggingService.logError(
          new Error('Rate limit result is undefined'),
          {
            userId: userId ? parseInt(userId, 10) : undefined,
            component: 'sse-rate-limit-middleware',
            operation: 'rate_limit_check',
          },
        );
        next();
        return;
      }

      if (!rateLimitResult.allowed) {
        // Rate limit excedido
        this.handleRateLimitExceeded(req, res, rateLimitResult, duration);
        return;
      }

      // Rate limit OK - continuar
      this.logSuccessfulRateCheck(req, rateLimitResult, duration);

      // Adicionar headers informativos
      this.addRateLimitHeaders(res, rateLimitResult.info);

      next();
    } catch (error) {
      const duration = Date.now() - startTime;

      // Capturar erro com error boundary
      await this.errorBoundaryService.captureError(error as Error, {
        userId: userId ? parseInt(userId, 10) : undefined,
        clientIp,
        userAgent: req.get('User-Agent'),
        additionalData: {
          component: 'sse-rate-limit-middleware',
          operation: 'rate_limit_check',
          duration,
        },
      });

      // Em caso de erro, permitir o request (fail-open)
      this.loggingService.logError(error as Error, {
        userId: userId ? parseInt(userId, 10) : undefined,
        component: 'sse-rate-limit-middleware',
        operation: 'rate_limit_check',
        metadata: {
          clientIp,
          userAgent: req.get('User-Agent'),
          duration,
          fallbackAction: 'allow_request',
        },
      });

      next();
    }
  }

  /**
   * Verificar rate limit para um request
   */
  private async checkRateLimit(
    req: Request,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const key = this.generateKey(req, config);
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Usar pipeline Redis para operações atômicas
    const pipeline = this.redisService.getStorageClient().pipeline();

    // Remover entradas antigas
    pipeline.zremrangebyscore(key, 0, windowStart);

    // Contar requests na janela atual
    pipeline.zcard(key);

    // Adicionar request atual
    pipeline.zadd(key, now, `${now}-${Math.random()}`);

    // Definir expiração
    pipeline.expire(key, Math.ceil(config.windowMs / 1000));

    // Obter próximo reset
    pipeline.zrange(key, 0, 0, 'WITHSCORES');

    const results = await pipeline.exec();

    if (!results || results.some(([err]) => err)) {
      throw new Error('Falha na verificação de rate limit no Redis');
    }

    const totalHitsInWindow = (results[1][1] as number) || 0;
    const nextResetData = results[4][1] as string[];

    const isFirstInWindow = totalHitsInWindow === 1;
    const remainingPoints = Math.max(0, config.maxRequests - totalHitsInWindow);

    let msBeforeNext = config.windowMs;
    if (nextResetData && nextResetData.length >= 2) {
      const oldestTimestamp = parseInt(nextResetData[1]);
      msBeforeNext = Math.max(0, oldestTimestamp + config.windowMs - now);
    }

    const rateLimitInfo: RateLimitInfo = {
      totalHits: totalHitsInWindow,
      totalHitsInWindow,
      remainingPoints,
      msBeforeNext,
      isFirstInWindow,
    };

    const allowed = totalHitsInWindow <= config.maxRequests;
    const retryAfter = allowed ? undefined : Math.ceil(msBeforeNext / 1000);

    return {
      allowed,
      info: rateLimitInfo,
      retryAfter,
    };
  }

  /**
   * Gerar chave para rate limiting
   */
  private generateKey(req: Request, config: RateLimitConfig): string {
    if (config.keyGenerator) {
      return `rate_limit:${config.keyGenerator(req)}`;
    }

    const userId = this.getUserId(req);
    const clientIp = this.getClientIp(req);

    // Priorizar userId se disponível, senão usar IP
    const identifier = userId || clientIp;

    return `rate_limit:sse:${identifier}`;
  }

  /**
   * Obter configuração baseada no nível de degradação
   */
  private getConfigForDegradationLevel(): RateLimitConfig {
    const degradationLevel =
      this.gracefulDegradationService.getCurrentStatus().currentLevel;

    switch (degradationLevel) {
      case DegradationLevel.CRITICAL:
        return {
          ...this.defaultConfig,
          maxRequests: Math.floor(this.defaultConfig.maxRequests * 0.1), // 10% do normal
          windowMs: this.defaultConfig.windowMs * 2, // Janela maior
        };

      case DegradationLevel.SEVERE:
        return {
          ...this.defaultConfig,
          maxRequests: Math.floor(this.defaultConfig.maxRequests * 0.3), // 30% do normal
          windowMs: this.defaultConfig.windowMs * 1.5,
        };

      case DegradationLevel.MODERATE:
        return {
          ...this.defaultConfig,
          maxRequests: Math.floor(this.defaultConfig.maxRequests * 0.6), // 60% do normal
        };

      case DegradationLevel.LIGHT:
        return {
          ...this.defaultConfig,
          maxRequests: Math.floor(this.defaultConfig.maxRequests * 0.8), // 80% do normal
        };

      default:
        return this.defaultConfig;
    }
  }

  /**
   * Lidar com rate limit excedido
   */
  private handleRateLimitExceeded(
    req: Request,
    res: Response,
    rateLimitResult: RateLimitResult,
    duration: number,
  ) {
    const userId = this.getUserId(req);
    const clientIp = this.getClientIp(req);

    // Log do rate limit excedido
    this.loggingService.logSecurity('Rate limit excedido', {
      userId: userId ? parseInt(userId, 10) : undefined,
      component: 'sse-rate-limit-middleware',
      operation: 'rate_limit_exceeded',
      metadata: {
        clientIp,
        userAgent: req.get('User-Agent'),
        totalHits: rateLimitResult.info.totalHits,
        remainingPoints: rateLimitResult.info.remainingPoints,
        retryAfter: rateLimitResult.retryAfter,
        duration,
      },
    });

    // Adicionar headers de rate limit
    this.addRateLimitHeaders(res, rateLimitResult.info);

    if (rateLimitResult.retryAfter) {
      res.set('Retry-After', rateLimitResult.retryAfter.toString());
    }

    // Resposta de rate limit excedido
    res.status(429).json({
      error: 'Rate limit excedido',
      message: 'Muitas solicitações. Tente novamente mais tarde.',
      retryAfter: rateLimitResult.retryAfter,
      remainingPoints: rateLimitResult.info.remainingPoints,
      resetTime: new Date(
        Date.now() + rateLimitResult.info.msBeforeNext,
      ).toISOString(),
    });
  }

  /**
   * Log de verificação bem-sucedida
   */
  private logSuccessfulRateCheck(
    req: Request,
    rateLimitResult: RateLimitResult,
    duration: number,
  ) {
    const userId = this.getUserId(req);
    const clientIp = this.getClientIp(req);

    this.loggingService.logPerformance('Rate limit verificado com sucesso', {
      userId: userId ? parseInt(userId, 10) : undefined,
      component: 'sse-rate-limit-middleware',
      operation: 'rate_limit_check_success',
      duration,
      metadata: {
        clientIp,
        userAgent: req.get('User-Agent'),
        totalHits: rateLimitResult.info.totalHits,
        remainingPoints: rateLimitResult.info.remainingPoints,
        isFirstInWindow: rateLimitResult.info.isFirstInWindow,
      },
    });
  }

  /**
   * Adicionar headers de rate limit
   */
  private addRateLimitHeaders(res: Response, info: RateLimitInfo) {
    res.set({
      'X-RateLimit-Limit': this.defaultConfig.maxRequests.toString(),
      'X-RateLimit-Remaining': info.remainingPoints.toString(),
      'X-RateLimit-Reset': new Date(
        Date.now() + info.msBeforeNext,
      ).toISOString(),
      'X-RateLimit-Window': this.defaultConfig.windowMs.toString(),
    });
  }

  /**
   * Obter IP do cliente
   */
  private getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Obter ID do usuário do request
   */
  private getUserId(req: Request): string | undefined {
    // Assumindo que o usuário está disponível no request após autenticação
    return (req as any).user?.id || (req as any).user?.sub;
  }
}
