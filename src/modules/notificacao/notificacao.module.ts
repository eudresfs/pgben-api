import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleAdapterModule } from '../../shared/schedule/schedule-adapter.module';
import { AuthModule } from '../../auth/auth.module';

// Controladores
import { NotificacaoController } from './controllers/notificacao.controller';
import { NotificationTemplateController } from './controllers/notification-template.controller';

// Serviços
import { NotificacaoService } from './services/notificacao.service';
import { NotificationManagerService } from './services/notification-manager.service';
import { TemplateRendererService } from './services/template-renderer.service';
import { EmailChannelService } from './channels/email-channel.service';
import { SseService } from './services/sse.service';
import { SseGuard } from './guards/sse.guard';

// Entidades
import { NotificacaoSistema, NotificationTemplate } from '../../entities';

/**
 * Módulo de Notificações
 *
 * Responsável por gerenciar as notificações enviadas aos usuários do sistema,
 * incluindo criação, leitura e arquivamento.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([NotificacaoSistema, NotificationTemplate]),
    ScheduleAdapterModule,
    ConfigModule,
    // Importa o módulo compartilhado de autenticação
    forwardRef(() => AuthModule),
  ],
  controllers: [NotificacaoController, NotificationTemplateController],
  providers: [
    NotificacaoService,
    NotificationManagerService,
    TemplateRendererService,
    EmailChannelService,
    SseService,
    SseGuard,
  ],
  exports: [NotificacaoService, NotificationManagerService, SseService],
})
export class NotificacaoModule {}
