import { Module, forwardRef } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { MetricsInterceptor } from './metrics.interceptor';
import { EnhancedMetricsService } from './enhanced-metrics.service';
import { EnhancedMetricsController } from './enhanced-metrics.controller';
import { EnhancedMetricsInterceptor } from './enhanced-metrics.interceptor';
import { CacheMetricsInterceptor } from './cache-metrics.interceptor';
import { HealthCheckService } from '../services/health-check.service';

/**
 * Módulo Global de Monitoramento
 *
 * Configura o sistema de monitoramento para toda a aplicação
 * incluindo health checks e métricas
 */
// Módulo NÃO global para evitar problemas com interceptors
@Module({
  imports: [TerminusModule, HttpModule, ConfigModule],
  controllers: [HealthController, MetricsController, EnhancedMetricsController],
  providers: [
    MetricsService,
    MetricsInterceptor,
    EnhancedMetricsService,
    EnhancedMetricsInterceptor,
    CacheMetricsInterceptor,
    HealthCheckService,
  ],
  exports: [
    MetricsService,
    MetricsInterceptor,
    EnhancedMetricsService,
    EnhancedMetricsInterceptor,
    CacheMetricsInterceptor,
    HealthCheckService,
  ],
})
export class MonitoringModule {}
