import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as compression from 'compression';
import * as zlib from 'zlib';

/**
 * Middleware de compressão otimizado
 *
 * Este middleware aplica compressão gzip/deflate nas responses HTTP
 * para reduzir o tamanho dos dados transferidos e melhorar a performance.
 */
@Injectable()
export class CompressionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CompressionMiddleware.name);
  private compressionHandler: any;

  constructor() {
    this.compressionHandler = compression({
      // Configurações otimizadas de compressão
      level: zlib.constants.Z_BEST_COMPRESSION, // Máxima compressão
      threshold: 1024, // Comprimir apenas responses > 1KB

      // Filtro para determinar quais responses comprimir
      filter: (req: Request, res: Response) => {
        // Não comprimir se o cliente não suporta
        if (!req.headers['accept-encoding']) {
          return false;
        }

        // Não comprimir responses já comprimidas
        if (res.getHeader('content-encoding')) {
          return false;
        }

        // Não comprimir imagens e arquivos já comprimidos
        const contentType = res.getHeader('content-type') as string;
        if (contentType) {
          const skipTypes = [
            'image/',
            'video/',
            'audio/',
            'application/zip',
            'application/gzip',
            'application/x-rar',
            'application/pdf',
          ];

          if (skipTypes.some((type) => contentType.includes(type))) {
            return false;
          }
        }

        // Comprimir JSON, HTML, CSS, JS, XML
        const compressibleTypes = [
          'application/json',
          'text/html',
          'text/css',
          'text/javascript',
          'application/javascript',
          'text/xml',
          'application/xml',
          'text/plain',
        ];

        return (
          contentType &&
          compressibleTypes.some((type) => contentType.includes(type))
        );
      },

      // Configurações específicas do gzip
      chunkSize: 16 * 1024, // 16KB chunks
      windowBits: 15,
      memLevel: 8,
    });
  }

  use(req: Request, res: Response, next: NextFunction): void {
    // Adicionar headers de performance
    res.setHeader('X-Compression', 'enabled');

    // Interceptar o método end para logging
    const originalEnd = res.end;
    const startTime = Date.now();
    let originalSize = 0;

    res.end = function (chunk?: any, encoding?: any) {
      if (chunk) {
        originalSize = Buffer.isBuffer(chunk)
          ? chunk.length
          : Buffer.byteLength(chunk, encoding);
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Log de performance
      if (process.env.NODE_ENV === 'development') {
        const compressionRatio = res.getHeader('content-encoding')
          ? `${Math.round((1 - parseInt((res.getHeader('content-length') as string) || '0') / originalSize) * 100)}%`
          : 'none';

        console.log(
          `[Compression] ${req.method} ${req.path} - ${processingTime}ms - Compression: ${compressionRatio}`,
        );
      }

      return originalEnd.call(this, chunk, encoding);
    };

    // Aplicar compressão
    this.compressionHandler(req, res, next);
  }
}

/**
 * Middleware de otimização de headers HTTP
 */
@Injectable()
export class HttpOptimizationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(HttpOptimizationMiddleware.name);

  use(req: Request, res: Response, next: NextFunction): void {
    // Headers de performance
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Headers de cache para recursos estáticos
    if (this.isStaticResource(req.path)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // 1 ano
      res.setHeader(
        'Expires',
        new Date(Date.now() + 31536000000).toUTCString(),
      );
    }

    // Headers de API
    if (req.path.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    // Otimização de Keep-Alive
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Keep-Alive', 'timeout=5, max=1000');

    next();
  }

  private isStaticResource(path: string): boolean {
    const staticExtensions = [
      '.css',
      '.js',
      '.png',
      '.jpg',
      '.jpeg',
      '.gif',
      '.svg',
      '.ico',
      '.woff',
      '.woff2',
    ];
    return staticExtensions.some((ext) => path.endsWith(ext));
  }
}

/**
 * Middleware de monitoramento de performance
 */
@Injectable()
export class PerformanceMonitoringMiddleware implements NestMiddleware {
  private readonly logger = new Logger(PerformanceMonitoringMiddleware.name);
  private requestCounts = new Map<string, number>();
  private responseTimes = new Map<string, number[]>();

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = process.hrtime.bigint();
    const endpoint = `${req.method} ${req.route?.path || req.path}`;

    // Incrementar contador de requisições
    this.requestCounts.set(
      endpoint,
      (this.requestCounts.get(endpoint) || 0) + 1,
    );

    // Interceptar o fim da response
    const originalEnd = res.end;
    res.end = (...args: any[]) => {
      const endTime = process.hrtime.bigint();
      const responseTime = Number(endTime - startTime) / 1000000; // Converter para ms

      // Armazenar tempo de resposta
      if (!this.responseTimes.has(endpoint)) {
        this.responseTimes.set(endpoint, []);
      }
      const times = this.responseTimes.get(endpoint)!;
      times.push(responseTime);

      // Manter apenas os últimos 100 tempos
      if (times.length > 100) {
        times.shift();
      }

      // Log de performance para requests lentas
      if (responseTime > 1000) {
        // > 1 segundo
        this.logger.warn(
          `Slow request detected: ${endpoint} - ${responseTime.toFixed(2)}ms`,
        );
      }

      // Adicionar header de tempo de resposta
      res.setHeader('X-Response-Time', `${responseTime.toFixed(2)}ms`);

      return originalEnd.apply(res, args);
    };

    next();
  }

  /**
   * Obtém estatísticas de performance
   */
  getPerformanceStats(): PerformanceStats {
    const stats: PerformanceStats = {
      endpoints: [],
      totalRequests: 0,
    };

    for (const [endpoint, count] of this.requestCounts.entries()) {
      const times = this.responseTimes.get(endpoint) || [];
      const avgTime =
        times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
      const maxTime = times.length > 0 ? Math.max(...times) : 0;
      const minTime = times.length > 0 ? Math.min(...times) : 0;

      stats.endpoints.push({
        endpoint,
        requestCount: count,
        averageResponseTime: avgTime,
        maxResponseTime: maxTime,
        minResponseTime: minTime,
      });

      stats.totalRequests += count;
    }

    // Ordenar por número de requisições
    stats.endpoints.sort((a, b) => b.requestCount - a.requestCount);

    return stats;
  }

  /**
   * Reseta as estatísticas
   */
  resetStats(): void {
    this.requestCounts.clear();
    this.responseTimes.clear();
  }
}

/**
 * Interface para estatísticas de performance
 */
export interface PerformanceStats {
  endpoints: EndpointStats[];
  totalRequests: number;
}

export interface EndpointStats {
  endpoint: string;
  requestCount: number;
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
}
