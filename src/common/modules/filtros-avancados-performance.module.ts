import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TerminusModule } from '@nestjs/terminus';
import { APP_INTERCEPTOR } from '@nestjs/core';

// Serviços de performance
import { FiltrosAvancadosCacheService } from '../cache/filtros-avancados-cache.service';
import { PerformanceMonitoringInterceptor, PerformanceMetricsService } from '../interceptors/performance-monitoring.interceptor';
import { FiltrosAvancadosHealthIndicator, FiltrosAvancadosHealthController } from '../health/filtros-avancados.health';

// Configuração de cache
import { cacheConfig } from './cache.config';

/**
 * Módulo global para otimização de performance dos filtros avançados
 * 
 * Funcionalidades:
 * - Cache inteligente com Redis/In-Memory
 * - Monitoramento de performance em tempo real
 * - Health checks específicos
 * - Métricas e alertas
 * - Interceptors automáticos
 */
@Global()
@Module({
  imports: [
    ConfigModule.forFeature(cacheConfig),
    TerminusModule,
  ],
  providers: [
    // Serviços de cache
    FiltrosAvancadosCacheService,
    
    // Monitoramento de performance
    PerformanceMetricsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceMonitoringInterceptor,
    },
    
    // Health checks
    FiltrosAvancadosHealthIndicator,
  ],
  controllers: [
    FiltrosAvancadosHealthController,
  ],
  exports: [
    FiltrosAvancadosCacheService,
    PerformanceMetricsService,
    FiltrosAvancadosHealthIndicator,
  ],
})
export class FiltrosAvancadosPerformanceModule {
  constructor(
    private readonly cacheService: FiltrosAvancadosCacheService,
  ) {
    // Inicializar warming do cache
    this.initializeCache();
  }

  /**
   * Inicializa o cache com dados frequentes
   */
  private async initializeCache(): Promise<void> {
    try {
      await this.cacheService.warmupCache();
    } catch (error) {
      console.warn('Erro no warming inicial do cache:', error.message);
    }
  }
}