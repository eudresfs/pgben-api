import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { performance } from 'perf_hooks';

/**
 * Metadata key para configuração de otimização
 */
export const QUERY_OPTIMIZATION_KEY = 'query_optimization';

/**
 * Interface para configuração de otimização por endpoint
 */
interface QueryOptimizationConfig {
  enablePagination?: boolean;
  enableCaching?: boolean;
  cacheTTL?: number;
  enableProfiling?: boolean;
  slowQueryThreshold?: number;
  maxLimit?: number;
}

/**
 * Decorator para configurar otimização de consultas
 */
export const QueryOptimization =
  Reflector.createDecorator<QueryOptimizationConfig>();

/**
 * Interceptor para aplicar otimizações automáticas de consulta
 * Monitora performance e aplica configurações específicas por endpoint
 */
@Injectable()
export class QueryOptimizationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(QueryOptimizationInterceptor.name);

  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Obter configuração de otimização do metadata
    const optimizationConfig = this.reflector.getAllAndOverride(
      QueryOptimization,
      [handler, controller],
    );

    const startTime = performance.now();
    const startMemory = process.memoryUsage();

    // Aplicar configurações de paginação automática
    if (optimizationConfig?.enablePagination) {
      this.applyPaginationDefaults(request, optimizationConfig);
    }

    // Adicionar headers de cache se habilitado
    if (optimizationConfig?.enableCaching) {
      this.applyCacheHeaders(response, optimizationConfig);
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          const endTime = performance.now();
          const endMemory = process.memoryUsage();
          const duration = endTime - startTime;

          // Log de performance se habilitado
          if (optimizationConfig?.enableProfiling) {
            this.logPerformanceMetrics({
              method: request.method,
              url: request.url,
              duration,
              memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
              resultSize: this.calculateResultSize(data),
              config: optimizationConfig,
            });
          }

          // Log de queries lentas
          if (
            optimizationConfig?.slowQueryThreshold &&
            duration > optimizationConfig.slowQueryThreshold
          ) {
            this.logger.warn(
              `Slow endpoint detected: ${request.method} ${request.url} - ${duration.toFixed(2)}ms`,
              {
                duration,
                memoryUsage: endMemory.heapUsed - startMemory.heapUsed,
                config: optimizationConfig,
              },
            );
          }

          // Adicionar headers de performance
          response.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`);
          response.setHeader(
            'X-Memory-Usage',
            `${Math.round((endMemory.heapUsed - startMemory.heapUsed) / 1024)}KB`,
          );

          return data;
        },
        error: (error) => {
          const endTime = performance.now();
          const duration = endTime - startTime;

          this.logger.error(
            `Error in optimized endpoint: ${request.method} ${request.url} - ${duration.toFixed(2)}ms`,
            {
              error: error.message,
              stack: error.stack,
              duration,
              config: optimizationConfig,
            },
          );

          throw error;
        },
      }),
    );
  }

  /**
   * Aplica configurações padrão de paginação
   */
  private applyPaginationDefaults(
    request: any,
    config: QueryOptimizationConfig,
  ): void {
    const query = request.query;

    // Aplicar limite padrão se não especificado
    if (!query.limit) {
      query.limit = '20'; // String porque vem da query
    }

    // Aplicar limite máximo
    if (config.maxLimit && parseInt(query.limit) > config.maxLimit) {
      query.limit = config.maxLimit.toString();
      this.logger.warn(`Limit reduced to maximum allowed: ${config.maxLimit}`, {
        originalLimit: query.limit,
        maxLimit: config.maxLimit,
        url: request.url,
      });
    }

    // Aplicar página padrão se não especificada
    if (!query.page) {
      query.page = '1';
    }

    // Validar valores numéricos
    const limit = parseInt(query.limit);
    const page = parseInt(query.page);

    if (isNaN(limit) || limit < 1) {
      query.limit = '20';
    }

    if (isNaN(page) || page < 1) {
      query.page = '1';
    }
  }

  /**
   * Aplica headers de cache
   */
  private applyCacheHeaders(
    response: any,
    config: QueryOptimizationConfig,
  ): void {
    const ttl = config.cacheTTL || 300; // 5 minutos padrão

    response.setHeader('Cache-Control', `public, max-age=${ttl}`);
    response.setHeader('ETag', this.generateETag());
    response.setHeader('Vary', 'Accept-Encoding, Authorization');
  }

  /**
   * Gera ETag simples baseado no timestamp
   */
  private generateETag(): string {
    const timestamp = Date.now();
    return `"${Buffer.from(timestamp.toString()).toString('base64')}"`;
  }

  /**
   * Calcula o tamanho aproximado do resultado
   */
  private calculateResultSize(data: any): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  /**
   * Log de métricas de performance
   */
  private logPerformanceMetrics(metrics: {
    method: string;
    url: string;
    duration: number;
    memoryDelta: number;
    resultSize: number;
    config: QueryOptimizationConfig;
  }): void {
    const { method, url, duration, memoryDelta, resultSize, config } = metrics;

    this.logger.debug(`Performance metrics: ${method} ${url}`, {
      duration: `${duration.toFixed(2)}ms`,
      memoryDelta: `${Math.round(memoryDelta / 1024)}KB`,
      resultSize: `${Math.round(resultSize / 1024)}KB`,
      optimizations: {
        pagination: config.enablePagination,
        caching: config.enableCaching,
        profiling: config.enableProfiling,
      },
    });
  }
}

/**
 * Decorator para aplicar otimização automática com configuração padrão
 */
export const OptimizeQuery = (config?: Partial<QueryOptimizationConfig>) =>
  QueryOptimization({
    enablePagination: true,
    enableCaching: false, // Desabilitado por padrão para evitar problemas
    enableProfiling: process.env.NODE_ENV === 'development',
    slowQueryThreshold: 1000,
    maxLimit: 100,
    cacheTTL: 300,
    ...config,
  });

/**
 * Decorator para endpoints que retornam listas
 */
export const OptimizeListQuery = (config?: Partial<QueryOptimizationConfig>) =>
  QueryOptimization({
    enablePagination: true,
    enableCaching: true,
    enableProfiling: true,
    slowQueryThreshold: 500,
    maxLimit: 50,
    cacheTTL: 180, // 3 minutos para listas
    ...config,
  });

/**
 * Decorator para endpoints de detalhes
 */
export const OptimizeDetailQuery = (
  config?: Partial<QueryOptimizationConfig>,
) =>
  QueryOptimization({
    enablePagination: false,
    enableCaching: true,
    enableProfiling: true,
    slowQueryThreshold: 800,
    cacheTTL: 600, // 10 minutos para detalhes
    ...config,
  });
