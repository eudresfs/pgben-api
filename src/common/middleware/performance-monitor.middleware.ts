import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';

/**
 * Interface para métricas de performance
 */
export interface PerformanceMetrics {
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  timestamp: Date;
  userAgent?: string;
  ip?: string;
}

/**
 * Middleware para monitoramento de performance das requisições
 * Coleta métricas detalhadas para identificação de gargalos
 */
@Injectable()
export class PerformanceMonitorMiddleware implements NestMiddleware {
  private readonly logger = new Logger(PerformanceMonitorMiddleware.name);
  private readonly slowRequestThreshold = 1000; // 1 segundo
  private readonly memoryLeakThreshold = 100 * 1024 * 1024; // 100MB

  // Cache para armazenar métricas recentes
  private recentMetrics: PerformanceMetrics[] = [];
  private readonly maxMetricsCache = 1000;

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();

    // Interceptar o final da resposta
    const originalSend = res.send;
    res.send = function (body) {
      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      const duration = endTime - startTime;

      const metrics: PerformanceMetrics = {
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        duration: Math.round(duration * 100) / 100, // 2 casas decimais
        memoryUsage: {
          rss: endMemory.rss - startMemory.rss,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal,
          external: endMemory.external - startMemory.external,
          arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers,
        },
        timestamp: new Date(),
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
      };

      // Processar métricas
      this.processMetrics(metrics);

      return originalSend.call(this, body);
    }.bind(this);

    next();
  }

  /**
   * Processa as métricas coletadas
   */
  private processMetrics(metrics: PerformanceMetrics): void {
    // Adicionar ao cache de métricas recentes
    this.addToCache(metrics);

    // Log de requisições lentas
    if (metrics.duration > this.slowRequestThreshold) {
      this.logger.warn(
        `Slow request detected: ${metrics.method} ${metrics.url} - ` +
          `${metrics.duration}ms - Status: ${metrics.statusCode}`,
        {
          ...metrics,
          type: 'SLOW_REQUEST',
        },
      );
    }

    // Log de uso excessivo de memória
    if (metrics.memoryUsage.heapUsed > this.memoryLeakThreshold) {
      this.logger.warn(
        `High memory usage detected: ${metrics.method} ${metrics.url} - ` +
          `${Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024)}MB`,
        {
          ...metrics,
          type: 'HIGH_MEMORY_USAGE',
        },
      );
    }

    // Log de erros
    if (metrics.statusCode >= 400) {
      const logLevel = metrics.statusCode >= 500 ? 'error' : 'warn';
      this.logger[logLevel](
        `HTTP Error: ${metrics.method} ${metrics.url} - ` +
          `Status: ${metrics.statusCode} - Duration: ${metrics.duration}ms`,
        {
          ...metrics,
          type: 'HTTP_ERROR',
        },
      );
    }

    // Log de métricas normais (apenas em debug)
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(
        `${metrics.method} ${metrics.url} - ` +
          `${metrics.duration}ms - Status: ${metrics.statusCode}`,
        metrics,
      );
    }
  }

  /**
   * Adiciona métricas ao cache
   */
  private addToCache(metrics: PerformanceMetrics): void {
    this.recentMetrics.push(metrics);

    // Manter apenas as métricas mais recentes
    if (this.recentMetrics.length > this.maxMetricsCache) {
      this.recentMetrics = this.recentMetrics.slice(-this.maxMetricsCache);
    }
  }

  /**
   * Obtém estatísticas de performance
   */
  public getPerformanceStats(): {
    totalRequests: number;
    averageResponseTime: number;
    slowRequests: number;
    errorRate: number;
    memoryStats: {
      averageHeapUsed: number;
      maxHeapUsed: number;
      totalMemoryAllocated: number;
    };
    topSlowEndpoints: Array<{
      endpoint: string;
      averageTime: number;
      count: number;
    }>;
  } {
    if (this.recentMetrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        slowRequests: 0,
        errorRate: 0,
        memoryStats: {
          averageHeapUsed: 0,
          maxHeapUsed: 0,
          totalMemoryAllocated: 0,
        },
        topSlowEndpoints: [],
      };
    }

    const totalRequests = this.recentMetrics.length;
    const totalResponseTime = this.recentMetrics.reduce(
      (sum, m) => sum + m.duration,
      0,
    );
    const slowRequests = this.recentMetrics.filter(
      (m) => m.duration > this.slowRequestThreshold,
    ).length;
    const errorRequests = this.recentMetrics.filter(
      (m) => m.statusCode >= 400,
    ).length;

    const heapUsages = this.recentMetrics.map((m) => m.memoryUsage.heapUsed);
    const averageHeapUsed =
      heapUsages.reduce((sum, usage) => sum + usage, 0) / heapUsages.length;
    const maxHeapUsed = Math.max(...heapUsages);
    const totalMemoryAllocated = heapUsages.reduce(
      (sum, usage) => sum + usage,
      0,
    );

    // Calcular endpoints mais lentos
    const endpointStats = new Map<
      string,
      { totalTime: number; count: number }
    >();

    this.recentMetrics.forEach((metric) => {
      const endpoint = `${metric.method} ${metric.url.split('?')[0]}`; // Remove query params
      const current = endpointStats.get(endpoint) || { totalTime: 0, count: 0 };
      endpointStats.set(endpoint, {
        totalTime: current.totalTime + metric.duration,
        count: current.count + 1,
      });
    });

    const topSlowEndpoints = Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        averageTime: Math.round((stats.totalTime / stats.count) * 100) / 100,
        count: stats.count,
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 10);

    return {
      totalRequests,
      averageResponseTime:
        Math.round((totalResponseTime / totalRequests) * 100) / 100,
      slowRequests,
      errorRate: Math.round((errorRequests / totalRequests) * 10000) / 100, // Porcentagem com 2 casas
      memoryStats: {
        averageHeapUsed:
          Math.round((averageHeapUsed / 1024 / 1024) * 100) / 100, // MB
        maxHeapUsed: Math.round((maxHeapUsed / 1024 / 1024) * 100) / 100, // MB
        totalMemoryAllocated:
          Math.round((totalMemoryAllocated / 1024 / 1024) * 100) / 100, // MB
      },
      topSlowEndpoints,
    };
  }

  /**
   * Limpa o cache de métricas
   */
  public clearMetrics(): void {
    this.recentMetrics = [];
    this.logger.log('Performance metrics cache cleared');
  }

  /**
   * Obtém métricas recentes filtradas
   */
  public getRecentMetrics(filter?: {
    method?: string;
    statusCode?: number;
    minDuration?: number;
    maxDuration?: number;
    since?: Date;
  }): PerformanceMetrics[] {
    let filtered = [...this.recentMetrics];

    if (filter) {
      if (filter.method) {
        filtered = filtered.filter((m) => m.method === filter.method);
      }
      if (filter.statusCode) {
        filtered = filtered.filter((m) => m.statusCode === filter.statusCode);
      }
      if (filter.minDuration) {
        filtered = filtered.filter((m) => m.duration >= filter.minDuration!);
      }
      if (filter.maxDuration) {
        filtered = filtered.filter((m) => m.duration <= filter.maxDuration!);
      }
      if (filter.since) {
        filtered = filtered.filter((m) => m.timestamp >= filter.since!);
      }
    }

    return filtered;
  }
}
