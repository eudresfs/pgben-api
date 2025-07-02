import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleAdapterModule } from '../../shared/schedule/schedule-adapter.module';
import { AuthModule } from '../../auth/auth.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EmailModule } from '../../common/email.module';
import { MonitoringModule } from '../../shared/monitoring/monitoring.module';
import { UsuarioModule } from '../usuario/usuario.module';

// Controladores
import { NotificacaoController } from './controllers/notificacao.controller';
import { NotificationSseController } from './controllers/notification-sse.controller';
import { NotificacaoAvancadaController } from './controllers/notificacao-avancada.controller';

// Serviços
import { NotificacaoService } from './services/notificacao.service';
import { NotificationManagerService } from './services/notification-manager.service';
import { SseService } from './services/sse.service';
import { SseRedisService } from './services/sse-redis.service';
import { SseEventStoreService } from './services/sse-event-store.service';
import { SseMetricsService } from './services/sse-metrics.service';
import { SseHeartbeatService } from './services/sse-heartbeat.service';
import { SseRateLimiterService } from './services/sse-rate-limiter.service';
import { SseRetryPolicyService } from './services/sse-retry-policy.service';
import { SseGracefulDegradationService } from './services/sse-graceful-degradation.service';
import { SseStructuredLoggingService } from './services/sse-structured-logging.service';
import { SseErrorBoundaryService } from './services/sse-error-boundary.service';
import { SseHealthCheckService } from './services/sse-health-check.service';
import { SseCircuitBreakerService } from './services/sse-circuit-breaker.service';
import { SseRateLimitGuard } from './guards/sse-rate-limit.guard';
import { SseRateLimitController } from './controllers/sse-rate-limit.controller';
import { TemplateRendererService } from './services/template-renderer.service';
import { createSseConfig, SSE_CONFIG } from '../../config/sse.config';
import { SseRedisCircuitBreakerService } from './services/sse-redis-circuit-breaker.service';
import { NotificacaoPreferenciasService } from './services/notificacao-preferencias.service';
import { NotificacaoProativaService } from './services/notificacao-proativa.service';
import { SseDatabaseCircuitBreakerService } from './services/sse-database-circuit-breaker.service';

// Listener
import { NotificationSseListener } from './listeners/notification-sse.listener';
import { NotificationEmailListener } from './listeners/notification-email.listener';
import { NotificationMetricsListener } from './listeners/notification-metrics.listener';

// Guards
import { SseGuard } from './guards/sse.guard';

// Interceptors
import { NotificationMetricsInterceptor } from './interceptors/notification-metrics.interceptor';
import { UsuarioEventsListener } from './listeners/usuario-events.listener';
import { WorkflowProativoListener } from './listeners/workflow-proativo.listener';

// Módulo Ably - Importação limpa sem duplicação
import { AblyModule } from './ably.module';

// Entidades
import {
  Notificacao,
  NotificacaoSistema,
  NotificationTemplate,
  Usuario,
} from '../../entities';
import { Solicitacao } from '../../entities/solicitacao.entity';
import { NotificacaoProativaScheduler } from './schedulers/notificacao-proativa.scheduler';

/**
 * Módulo de Notificações
 *
 * Responsável por:
 *  - Gerenciar notificações (criação, leitura, arquivamento)
 *  - Expor endpoints REST e SSE para clientes
 *  - Emitir eventos de domínio para integração com outros módulos
 *  - Permitir extensão via listeners (SSE, e-mail, auditoria, etc)
 *  - Integração com Ably via AblyModule (@Global)
 *
 * ## Exemplo de Integração com outros módulos
 *
 * // Em qualquer service de outro módulo:
 * import { EventEmitter2 } from '@nestjs/event-emitter';
 * ...
 * constructor(private eventEmitter: EventEmitter2) {}
 * ...
 * this.eventEmitter.emit(
 *   NOTIFICATION_CREATED,
 *   new NotificationCreatedEvent({
 *     destinatario_id: userId,
 *     tipo: 'INFO',
 *     titulo: 'Algo relevante',
 *     conteudo: 'Mensagem',
 *   })
 * );
 *
 * ## Registrando listeners adicionais
 * Basta implementar uma classe com @OnEvent('notification.created') e registrar no providers.
 * Veja exemplo em NotificationSseListener e NotificationEmailListener.
 *
 * ## Integração com Ably
 * Os serviços Ably (AblyService, AblyAuthService, AblyChannelService) são fornecidos
 * pelo AblyModule que é marcado como @Global(), evitando dependência circular.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notificacao,
      NotificacaoSistema,
      NotificationTemplate,
      Solicitacao,
      Usuario,
    ]),
    ConfigModule,
    ScheduleAdapterModule,
    AuthModule,
    forwardRef(() => UsuarioModule),
    EventEmitterModule,
    EmailModule,
    forwardRef(() => MonitoringModule),
    AblyModule,
  ],
  controllers: [
    NotificacaoController,
    NotificationSseController,
    SseRateLimitController,
    NotificacaoAvancadaController,
  ],
  providers: [
    // Configurações
    {
      provide: SSE_CONFIG,
      useFactory: createSseConfig,
      inject: [ConfigService],
    },

    // Serviços principais
    NotificacaoService,
    NotificationManagerService,
    TemplateRendererService,
    SseRedisService,
    SseEventStoreService,
    SseService,
    SseHeartbeatService,
    SseMetricsService,
    SseRateLimiterService,
    SseRetryPolicyService,
    SseGracefulDegradationService,
    SseStructuredLoggingService,
    SseErrorBoundaryService,
    SseHealthCheckService,
    SseCircuitBreakerService,
    SseRedisCircuitBreakerService,
    SseDatabaseCircuitBreakerService,
    SseGuard,
    SseRateLimitGuard,
    NotificacaoProativaService,
    NotificacaoPreferenciasService,

    // Listeners
    NotificationSseListener,
    NotificationEmailListener,
    NotificationMetricsListener,
    UsuarioEventsListener,
    WorkflowProativoListener,

    // Scheduler
    NotificacaoProativaScheduler,

    // Interceptors
    NotificationMetricsInterceptor,
  ],
  exports: [
    TypeOrmModule,
    NotificacaoService,
    NotificationManagerService,
    SseService,
    SseEventStoreService,
    SseMetricsService,
    SseRateLimiterService,
    NotificationMetricsInterceptor,
    NotificacaoProativaService,
    NotificacaoPreferenciasService,
    TemplateRendererService,
  ],
})
export class NotificacaoModule {}
