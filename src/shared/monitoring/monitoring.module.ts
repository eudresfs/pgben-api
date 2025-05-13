import { Module, Global } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { MetricsInterceptor } from './metrics.interceptor';

/**
 * Módulo Global de Monitoramento
 * 
 * Configura o sistema de monitoramento para toda a aplicação
 * incluindo health checks e métricas
 */
@Global()
@Module({
  imports: [
    TerminusModule,
    HttpModule,
  ],
  controllers: [HealthController, MetricsController],
  providers: [MetricsService, MetricsInterceptor],
  exports: [MetricsService, MetricsInterceptor],
})
export class MonitoringModule {}
