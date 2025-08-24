import { Module } from '@nestjs/common';
import { PerformanceController } from './performance.controller';
import { PerformanceMonitorMiddleware } from '../../common/middleware/performance-monitor.middleware';
import { AuthModule } from '../../auth/auth.module';

/**
 * Módulo de monitoramento do sistema
 * Responsável por coletar e expor métricas de performance
 */
@Module({
  imports: [AuthModule],
  controllers: [PerformanceController],
  providers: [PerformanceMonitorMiddleware],
  exports: [PerformanceMonitorMiddleware],
})
export class MonitoringModule {}
