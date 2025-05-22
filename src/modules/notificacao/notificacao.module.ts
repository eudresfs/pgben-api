import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleAdapterModule } from '../../shared/schedule/schedule-adapter.module';
import { AuthModule } from '@/auth/auth.module'

// Controladores
import { NotificacaoController } from './controllers/notificacao.controller';
import { NotificationController } from './controllers/notification.controller';
import { NotificationTemplateController } from './controllers/notification-template.controller';

// Serviços
import { NotificacaoService } from './services/notificacao.service';
import { NotificationManagerService } from './services/notification-manager.service';
import { TemplateRendererService } from './services/template-renderer.service';
import { EmailChannelService } from './channels/email-channel.service';

// Entidades
import { NotificacaoSistema } from './entities/notification.entity';
import { NotificationTemplate } from './entities/notification-template.entity';

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
    AuthModule,
  ],
  controllers: [
    NotificacaoController,
    NotificationController,
    NotificationTemplateController,
  ],
  providers: [
    NotificacaoService,
    NotificationManagerService,
    TemplateRendererService,
    EmailChannelService,
  ],
  exports: [NotificacaoService, NotificationManagerService],
})
export class NotificacaoModule {}
