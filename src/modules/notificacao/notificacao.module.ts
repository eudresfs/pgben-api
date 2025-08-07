import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleAdapterModule } from '../../shared/schedule/schedule-adapter.module';
import { AuthModule } from '../../auth/auth.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EmailModule } from '../../common/email.module';
import { MonitoringModule } from '../../shared/monitoring/monitoring.module';
import { UsuarioModule } from '../usuario/usuario.module';
import { NOTIFICATION_MANAGER_SERVICE } from './interfaces/notification-manager.interface';

// Controladores
import { NotificacaoController } from './controllers/notificacao.controller';
import { NotificacaoAvancadaController } from './controllers/notificacao-avancada.controller';
import { NotificationTemplateController } from './controllers/notification-template.controller';

// Serviços
import { NotificacaoService } from './services/notificacao.service';
import { NotificationManagerService } from './services/notification-manager.service';
import { TemplateRendererService } from './services/template-renderer.service';
import { NotificacaoPreferenciasService } from './services/notificacao-preferencias.service';
import { NotificacaoProativaService } from './services/notificacao-proativa.service';

// Listener
import { NotificationEmailListener } from './listeners/notification-email.listener';
import { NotificationMetricsListener } from './listeners/notification-metrics.listener';

// Interceptors
import { NotificationMetricsInterceptor } from './interceptors/notification-metrics.interceptor';
import { UsuarioEventsListener } from './listeners/usuario-events.listener';
import { WorkflowProativoListener } from './listeners/workflow-proativo.listener';
import { NotificationSchedulerListener } from './listeners/notification-scheduler.listener';

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
import { AgendamentoNotificacao } from '../../entities/agendamento-notificacao.entity';
import { PreferenciasNotificacao } from '../../entities/preferencias-notificacao.entity';
import { NotificacaoProativaScheduler } from './schedulers/notificacao-proativa.scheduler';

/**
 * Módulo de Notificações
 *
 * Responsável por:
 *  - Gerenciar notificações (criação, leitura, arquivamento)
 *  - Expor endpoints REST para clientes
 *  - Emitir eventos de domínio para integração com outros módulos
 *  - Permitir extensão via listeners (e-mail, auditoria, etc)
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
 * Veja exemplo em NotificationEmailListener.
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
      AgendamentoNotificacao,
      PreferenciasNotificacao,
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
  controllers: [NotificacaoController, NotificacaoAvancadaController, NotificationTemplateController],
  providers: [
    // Serviços principais
    NotificacaoService,
    NotificationManagerService,
    {
      provide: NOTIFICATION_MANAGER_SERVICE,
      useClass: NotificationManagerService,
    },
    TemplateRendererService,
    NotificacaoProativaService,
    NotificacaoPreferenciasService,

    // Listeners
    NotificationEmailListener,
    NotificationMetricsListener,
    UsuarioEventsListener,
    WorkflowProativoListener,
    NotificationSchedulerListener,

    // Scheduler
    NotificacaoProativaScheduler,

    // Interceptors
    NotificationMetricsInterceptor,
  ],
  exports: [
    TypeOrmModule,
    NotificacaoService,
    NotificationManagerService,
    NOTIFICATION_MANAGER_SERVICE,
    NotificationMetricsInterceptor,
    NotificacaoProativaService,
    NotificacaoPreferenciasService,
    TemplateRendererService,
  ],
})
export class NotificacaoModule {}
