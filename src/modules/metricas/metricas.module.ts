import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricasService } from './services/metricas.service';
import { HealthService } from './services/health.service';
import { MetricasMiddleware } from './middlewares/metricas.middleware';
import { MetricasController } from './controllers/metricas.controller';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { LogAuditoria } from '../auditoria/entities/log-auditoria.entity';

/**
 * Módulo responsável pelo monitoramento e observabilidade do sistema
 * através da coleta e exposição de métricas para o Prometheus.
 */
@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
      },
      path: '/prometheus',
    }),
    TypeOrmModule.forFeature([LogAuditoria]),
  ],
  controllers: [MetricasController],
  providers: [MetricasService, HealthService],
  exports: [MetricasService, HealthService],
})
export class MetricasModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Aplica o middleware de métricas a todas as rotas
    consumer.apply(MetricasMiddleware).forRoutes('*');
  }
}
