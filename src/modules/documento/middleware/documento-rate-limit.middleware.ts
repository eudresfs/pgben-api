import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggingService } from '../../../shared/logging/logging.service';
import { ConfigService } from '@nestjs/config';

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

interface UserRateLimit {
  downloads: RateLimitEntry;
  uploads: RateLimitEntry;
  views: RateLimitEntry;
}

/**
 * Middleware de rate limiting específico para operações de documentos
 *
 * Implementa limites diferenciados por tipo de operação:
 * - Downloads: 50 por hora por usuário
 * - Uploads: 20 por hora por usuário
 * - Visualizações: 200 por hora por usuário
 */
@Injectable()
export class DocumentoRateLimitMiddleware implements NestMiddleware {
  private readonly rateLimits = new Map<string, UserRateLimit>();
  private readonly cleanupInterval: NodeJS.Timeout;

  // Limites configuráveis
  private readonly limits = {
    downloads: {
      max: this.configService.get<number>('DOCUMENTO_DOWNLOAD_RATE_LIMIT', 50),
      windowMs: this.configService.get<number>(
        'DOCUMENTO_DOWNLOAD_WINDOW_MS',
        3600000,
      ), // 1 hora
    },
    uploads: {
      max: this.configService.get<number>('DOCUMENTO_UPLOAD_RATE_LIMIT', 20),
      windowMs: this.configService.get<number>(
        'DOCUMENTO_UPLOAD_WINDOW_MS',
        3600000,
      ), // 1 hora
    },
    views: {
      max: this.configService.get<number>('DOCUMENTO_VIEW_RATE_LIMIT', 200),
      windowMs: this.configService.get<number>(
        'DOCUMENTO_VIEW_WINDOW_MS',
        3600000,
      ), // 1 hora
    },
  };

  constructor(
    private readonly logger: LoggingService,
    private readonly configService: ConfigService,
  ) {
    // Limpeza automática a cada 10 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 600000);
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const user = (req as any).user;

    // Se não há usuário autenticado, permitir (será bloqueado por outros guards)
    if (!user || !user.id) {
      return next();
    }

    const userId = user.id;
    const operationType = this.getOperationType(req);

    // Se não é uma operação que precisa de rate limiting, continuar
    if (!operationType) {
      return next();
    }

    try {
      const isAllowed = this.checkRateLimit(userId, operationType, req);

      if (!isAllowed) {
        const limit = this.limits[operationType];
        const resetTime = Math.ceil(limit.windowMs / 1000 / 60); // em minutos

        this.logger.warn(
          `Rate limit excedido para usuário ${userId} na operação ${operationType}`,
          DocumentoRateLimitMiddleware.name,
          {
            userId,
            operationType,
            limit: limit.max,
            windowMinutes: resetTime,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
          },
        );

        // Headers informativos sobre o rate limit
        res.set({
          'X-RateLimit-Limit': limit.max.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(
            Date.now() + limit.windowMs,
          ).toISOString(),
          'Retry-After': resetTime.toString(),
        });

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `Muitas requisições. Limite de ${limit.max} ${operationType} por hora excedido.`,
            error: 'Too Many Requests',
            retryAfter: `${resetTime} minutos`,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Adicionar headers informativos
      const userLimit = this.rateLimits.get(userId);
      if (userLimit && userLimit[operationType]) {
        const limit = this.limits[operationType];
        const remaining = Math.max(
          0,
          limit.max - userLimit[operationType].count,
        );

        res.set({
          'X-RateLimit-Limit': limit.max.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': new Date(
            userLimit[operationType].resetTime,
          ).toISOString(),
        });
      }

      next();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Erro no rate limiting para usuário ${userId}`,
        error,
        DocumentoRateLimitMiddleware.name,
        { userId, operationType },
      );

      // Em caso de erro, permitir a requisição
      next();
    }
  }

  private getOperationType(req: Request): keyof typeof this.limits | null {
    const method = req.method;
    const path = req.path;

    // Downloads
    if (method === 'GET' && path.includes('/download')) {
      return 'downloads';
    }

    // Uploads
    if (method === 'POST' && path.includes('/upload')) {
      return 'uploads';
    }

    // Visualizações (GET de documentos específicos)
    if (method === 'GET' && /\/documento\/[a-f0-9-]{36}$/.test(path)) {
      return 'views';
    }

    return null;
  }

  private checkRateLimit(
    userId: string,
    operationType: keyof typeof this.limits,
    req: Request,
  ): boolean {
    const now = Date.now();
    const limit = this.limits[operationType];

    // Obter ou criar entrada do usuário
    let userLimit = this.rateLimits.get(userId);
    if (!userLimit) {
      userLimit = {
        downloads: { count: 0, resetTime: 0, firstRequest: 0 },
        uploads: { count: 0, resetTime: 0, firstRequest: 0 },
        views: { count: 0, resetTime: 0, firstRequest: 0 },
      };
      this.rateLimits.set(userId, userLimit);
    }

    const operationLimit = userLimit[operationType];

    // Se o tempo de reset passou, resetar contador
    if (now >= operationLimit.resetTime) {
      operationLimit.count = 0;
      operationLimit.resetTime = now + limit.windowMs;
      operationLimit.firstRequest = now;
    }

    // Verificar se excedeu o limite
    if (operationLimit.count >= limit.max) {
      return false;
    }

    // Incrementar contador
    operationLimit.count++;

    // Log para monitoramento
    if (operationLimit.count === 1) {
      this.logger.debug(
        `Iniciando janela de rate limit para usuário ${userId} - ${operationType}`,
        DocumentoRateLimitMiddleware.name,
        { userId, operationType, windowMs: limit.windowMs },
      );
    }

    // Log de aviso quando próximo do limite
    if (operationLimit.count >= limit.max * 0.8) {
      this.logger.warn(
        `Usuário ${userId} próximo do limite de ${operationType}: ${operationLimit.count}/${limit.max}`,
        DocumentoRateLimitMiddleware.name,
        {
          userId,
          operationType,
          count: operationLimit.count,
          max: limit.max,
          ip: req.ip,
        },
      );
    }

    return true;
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [userId, userLimit] of this.rateLimits.entries()) {
      let hasActiveLimit = false;

      // Verificar se alguma operação ainda está ativa
      for (const operationType of Object.keys(this.limits) as Array<
        keyof typeof this.limits
      >) {
        if (
          now < userLimit[operationType].resetTime &&
          userLimit[operationType].count > 0
        ) {
          hasActiveLimit = true;
          break;
        }
      }

      // Se não há limites ativos, remover entrada
      if (!hasActiveLimit) {
        this.rateLimits.delete(userId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(
        `Limpeza de rate limits: ${cleanedCount} entradas removidas`,
        DocumentoRateLimitMiddleware.name,
        { cleanedCount, totalEntries: this.rateLimits.size },
      );
    }
  }

  // Método para obter estatísticas (útil para monitoramento)
  getStats(): {
    totalUsers: number;
    activeWindows: { [key: string]: number };
  } {
    const now = Date.now();
    const activeWindows = {
      downloads: 0,
      uploads: 0,
      views: 0,
    };

    for (const userLimit of this.rateLimits.values()) {
      for (const operationType of Object.keys(this.limits) as Array<
        keyof typeof this.limits
      >) {
        if (
          now < userLimit[operationType].resetTime &&
          userLimit[operationType].count > 0
        ) {
          activeWindows[operationType]++;
        }
      }
    }

    return {
      totalUsers: this.rateLimits.size,
      activeWindows,
    };
  }

  // Cleanup ao destruir o middleware
  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}
