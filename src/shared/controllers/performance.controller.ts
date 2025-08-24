import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CacheService, CacheStats } from '../services/cache.service';
import {
  PerformanceMonitoringMiddleware,
  PerformanceStats,
} from '../middleware/compression.middleware';

/**
 * Controller para monitoramento e gestão de performance
 *
 * Este controller fornece endpoints para monitorar cache, métricas de performance
 * e gerenciar otimizações do sistema.
 */
@Controller('performance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PerformanceController {
  constructor(
    private readonly cacheService: CacheService,
    private readonly performanceMonitoring: PerformanceMonitoringMiddleware,
  ) {}

  /**
   * Obtém estatísticas do cache
   */
  @Get('cache/stats')
  @ApiOperation({ summary: 'Obter estatísticas do cache' })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas do cache retornadas com sucesso',
  })
  async getCacheStats(): Promise<CacheStats> {
    return this.cacheService.getStats();
  }

  /**
   * Limpa todo o cache
   */
  @Delete('cache')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Limpar todo o cache' })
  @ApiResponse({
    status: 204,
    description: 'Cache limpo com sucesso',
  })
  async clearCache(): Promise<void> {
    await this.cacheService.clear();
  }

  /**
   * Remove itens expirados do cache
   */
  @Post('cache/cleanup')
  @ApiOperation({ summary: 'Executar limpeza de itens expirados do cache' })
  @ApiResponse({
    status: 200,
    description: 'Limpeza executada com sucesso',
  })
  async cleanupCache(): Promise<{ removedItems: number }> {
    const removedItems = await this.cacheService.cleanup();
    return { removedItems };
  }

  /**
   * Remove cache por padrão
   */
  @Delete('cache/pattern/:pattern')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover cache por padrão' })
  @ApiResponse({
    status: 204,
    description: 'Cache removido com sucesso',
  })
  async deleteCachePattern(
    @Param('pattern') pattern: string,
  ): Promise<{ removedItems: number }> {
    const removedItems = await this.cacheService.deletePattern(pattern);
    return { removedItems };
  }

  /**
   * Obtém estatísticas de performance das requisições
   */
  @Get('requests/stats')
  @ApiOperation({
    summary: 'Obter estatísticas de performance das requisições',
  })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas de performance retornadas com sucesso',
  })
  async getRequestStats(): Promise<PerformanceStats> {
    return this.performanceMonitoring.getPerformanceStats();
  }

  /**
   * Reseta estatísticas de performance
   */
  @Delete('requests/stats')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Resetar estatísticas de performance' })
  @ApiResponse({
    status: 204,
    description: 'Estatísticas resetadas com sucesso',
  })
  async resetRequestStats(): Promise<void> {
    this.performanceMonitoring.resetStats();
  }

  /**
   * Obtém métricas gerais do sistema
   */
  @Get('system/metrics')
  @ApiOperation({ summary: 'Obter métricas gerais do sistema' })
  @ApiResponse({
    status: 200,
    description: 'Métricas do sistema retornadas com sucesso',
  })
  async getSystemMetrics(): Promise<SystemMetrics> {
    const cacheStats = this.cacheService.getStats();
    const requestStats = this.performanceMonitoring.getPerformanceStats();

    // Calcular métricas de performance
    const avgResponseTime =
      requestStats.endpoints.length > 0
        ? requestStats.endpoints.reduce(
            (sum, endpoint) => sum + endpoint.averageResponseTime,
            0,
          ) / requestStats.endpoints.length
        : 0;

    const slowEndpoints = requestStats.endpoints.filter(
      (endpoint) => endpoint.averageResponseTime > 1000,
    );

    return {
      cache: {
        hitRate: this.calculateCacheHitRate(cacheStats),
        memoryUsage: cacheStats.memoryUsage,
        itemCount: cacheStats.size,
        expiredItems: cacheStats.expiredCount,
      },
      requests: {
        totalRequests: requestStats.totalRequests,
        averageResponseTime: avgResponseTime,
        slowEndpointsCount: slowEndpoints.length,
        topEndpoints: requestStats.endpoints.slice(0, 5),
      },
      system: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform,
      },
    };
  }

  /**
   * Força otimização do sistema
   */
  @Post('optimize')
  @ApiOperation({ summary: 'Executar otimizações do sistema' })
  @ApiResponse({
    status: 200,
    description: 'Otimizações executadas com sucesso',
  })
  async optimizeSystem(): Promise<OptimizationResult> {
    const startTime = Date.now();

    // Executar limpeza de cache
    const cleanedCacheItems = await this.cacheService.cleanup();

    // Forçar garbage collection se disponível
    if (global.gc) {
      global.gc();
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    return {
      duration,
      actions: [
        {
          action: 'cache_cleanup',
          result: `${cleanedCacheItems} items removed`,
          success: true,
        },
        {
          action: 'garbage_collection',
          result: global.gc ? 'executed' : 'not available',
          success: !!global.gc,
        },
      ],
      memoryAfter: process.memoryUsage(),
    };
  }

  /**
   * Calcula taxa de hit do cache
   */
  private calculateCacheHitRate(stats: CacheStats): number {
    // Esta é uma implementação simplificada
    // Em um cenário real, você manteria contadores de hits/misses
    const totalItems = stats.size + stats.expiredCount;
    return totalItems > 0 ? (stats.size / totalItems) * 100 : 0;
  }
}

/**
 * Interface para métricas do sistema
 */
export interface SystemMetrics {
  cache: {
    hitRate: number;
    memoryUsage: number;
    itemCount: number;
    expiredItems: number;
  };
  requests: {
    totalRequests: number;
    averageResponseTime: number;
    slowEndpointsCount: number;
    topEndpoints: any[];
  };
  system: {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    nodeVersion: string;
    platform: string;
  };
}

/**
 * Interface para resultado de otimização
 */
export interface OptimizationResult {
  duration: number;
  actions: OptimizationAction[];
  memoryAfter: NodeJS.MemoryUsage;
}

export interface OptimizationAction {
  action: string;
  result: string;
  success: boolean;
}
