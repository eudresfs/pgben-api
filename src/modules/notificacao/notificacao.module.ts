import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleAdapterModule } from '../../shared/schedule/schedule-adapter.module';
import { AuthModule } from '../../auth/auth.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EmailModule } from '../../common/email.module';
import { MonitoringModule } from '../../shared/monitoring/monitoring.module';

// Controladores
import { NotificacaoController } from './controllers/notificacao.controller';
import { NotificationTemplateController } from './controllers/notification-template.controller';
import { NotificationSseController } from './controllers/notification-sse.controller';

// Serviços
import { NotificacaoService } from './services/notificacao.service';
import { NotificationManagerService } from './services/notification-manager.service';
import { TemplateRendererService } from './services/template-renderer.service';
import { SseService } from './services/sse.service';
import { SseMetricsService } from './services/sse-metrics.service';

// Listener
import { NotificationSseListener } from './listeners/notification-sse.listener';
import { NotificationEmailListener } from './listeners/notification-email.listener';
import { NotificationMetricsListener } from './listeners/notification-metrics.listener';

// Guards
import { SseGuard } from './guards/sse.guard';

// Interceptors
import { NotificationMetricsInterceptor } from './interceptors/notification-metrics.interceptor';
import { UsuarioEventsListener } from './listeners/usuario-events.listener';

// Entidades
import { Notificacao, NotificacaoSistema, NotificationTemplate } from '../../entities';

/**
 * Módulo de Notificações
 *
 * Responsável por:
 *  - Gerenciar notificações (criação, leitura, arquivamento)
 *  - Expor endpoints REST e SSE para clientes
 *  - Emitir eventos de domínio para integração com outros módulos
 *  - Permitir extensão via listeners (SSE, e-mail, auditoria, etc)
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
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notificacao,
      NotificacaoSistema,
      NotificationTemplate,
    ]),
    ConfigModule,
    ScheduleAdapterModule,
    forwardRef(() => AuthModule),
    EventEmitterModule,
    EmailModule,
    forwardRef(() => MonitoringModule),
  ],
  controllers: [
    NotificacaoController,
    NotificationTemplateController,
    NotificationSseController,
  ],
  providers: [
    NotificacaoService,
    NotificationManagerService,
    TemplateRendererService,
    SseService,
    SseMetricsService,
    SseGuard,
    NotificationSseListener, // Listener SSE
    NotificationEmailListener, // Listener de e-mail
    NotificationMetricsListener,
    NotificationMetricsInterceptor,
    UsuarioEventsListener
  ],
  exports: [
    TypeOrmModule, 
    NotificacaoService, 
    NotificationManagerService, 
    SseService,
    SseMetricsService,
    NotificationMetricsInterceptor
  ],
})
export class NotificacaoModule {}
