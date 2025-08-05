import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleAdapterModule } from '../../shared/schedule/schedule-adapter.module';
import { AuthModule } from '../../auth/auth.module';
import { HealthCheckService } from '../../shared/services/health-check.service';

// Controladores
import { MetricasController } from './controllers/metricas.controller';
import { MetricasDefinicaoController } from './controllers/metricas-definicao.controller';
import { MetricasAnomaliasController } from './controllers/metricas-anomalias.controller';
import { MetricasValoresController } from './controllers/metricas-valores.controller';
import { MetricasAnaliseController } from './controllers/metricas-analise.controller';
import { MetricasDashboardController } from './controllers/metricas-dashboard.controller';
import { MetricasExportacaoController } from './controllers/metricas-exportacao.controller';

// Serviços
import { MetricasService } from './services/metricas.service';
import { MetricasService as MetricasDefinicaoService } from './services/metricas-definicao.service';
import { HealthService } from './services/health.service';
import { MetricasColetaService } from './services/metricas-coleta.service';
import { MetricaCalculoService } from './services/metrica-calculo.service';
import { MetricasCacheService } from './services/metricas-cache.service';
import { DashboardService } from './services/dashboard.service';
import { MetricasAnomaliasService } from './services/metricas-anomalia.service';

// Middleware
import { MetricasMiddleware } from './middlewares/metricas.middleware';

// Entidades
import {
  LogAuditoria,
  MetricaDefinicao,
  MetricaSnapshot,
  MetricaConfiguracao,
  Solicitacao,
  Recurso,
  TipoBeneficio,
  Unidade,
  Usuario,
  ComposicaoFamiliar,
  Concessao,
  Pagamento,
  Pendencia,
} from '../../entities';

// Módulos externos
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

// Serviços compartilhados
import { RequestContextHolder } from '../../common/services/request-context-holder.service';

/**
 * Módulo responsável pelo monitoramento, observabilidade e análise de métricas do sistema
 *
 * Este módulo implementa:
 * 1. Coleta e exposição de métricas para o Prometheus
 * 2. Sistema completo de definição, coleta e armazenamento de métricas de negócio
 * 3. Análise de tendências e detecção de anomalias
 * 4. Cacheamento eficiente para consultas de alta performance
 * 5. API para alimentação de dashboards e relatórios
 */
@Module({
  imports: [
    // Configuração do Prometheus para métricas de sistema
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
      },
      path: '/prometheus',
    }),

    // Módulo de agendamento personalizado para coleta programada de métricas
    ScheduleAdapterModule,

    // Módulo de eventos para comunicação entre serviços
    EventEmitterModule.forRoot(),

    // Entidades de banco de dados
    TypeOrmModule.forFeature([
      LogAuditoria,
      MetricaDefinicao,
      MetricaSnapshot,
      MetricaConfiguracao,
      // Entidades para dashboard
      Solicitacao,
      Concessao,
      ComposicaoFamiliar,
      Pagamento,
      Pendencia,
      Recurso,
      TipoBeneficio,
      Unidade,
      Usuario,
    ]),

    // Importa o módulo compartilhado de autenticação
    AuthModule,
  ],

  // Controladores para API
  controllers: [
    MetricasController,
    MetricasDefinicaoController,
    MetricasAnomaliasController,
    MetricasValoresController,
    MetricasAnaliseController,
    MetricasDashboardController,
    MetricasExportacaoController,
  ],

  // Serviços do módulo
  providers: [
    // Serviços originais
    MetricasService,
    HealthService,

    // Novos serviços
    MetricasDefinicaoService,
    MetricasColetaService,
    MetricaCalculoService,
    MetricasCacheService,
    MetricasAnomaliasService,
    DashboardService,

    // Serviço de health check compartilhado
    HealthCheckService,

    // Serviços compartilhados para escopo
    RequestContextHolder,
  ],

  // Serviços exportados para outros módulos
  exports: [
    MetricasService,
    HealthService,
    MetricasColetaService,
    MetricasCacheService,
  ],
})
export class MetricasModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Aplica o middleware de métricas a todas as rotas
    consumer.apply(MetricasMiddleware).forRoutes('*');
  }
}
