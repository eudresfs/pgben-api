import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleAdapterModule } from '../../shared/schedule/schedule-adapter.module';
import { AuthModule } from '../../auth/auth.module';
// import { UsuarioModule } from '../usuario/usuario.module'; // Removido - usando injeção lazy

// Controladores
import { NotificacaoController } from './controllers/notificacao.controller';
import { NotificationTemplateController } from './controllers/notification-template.controller';
// import { NotificationSseController } from './controllers/notification-sse.controller';

// Serviços
import { NotificacaoService } from './services/notificacao.service';
import { NotificationManagerService } from './services/notification-manager.service';
import { TemplateRendererService } from './services/template-renderer.service';
import { EmailModule } from '../../common/email.module';
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
    EmailModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [
   NotificacaoController, 
   NotificationTemplateController, 
   // NotificationSseController
   ],
  providers: [
    NotificacaoService,
    NotificationManagerService,
    TemplateRendererService,
    SseService,
    SseGuard,
  ],
  exports: [TypeOrmModule, NotificacaoService, NotificationManagerService, SseService],
})
export class NotificacaoModule {}
