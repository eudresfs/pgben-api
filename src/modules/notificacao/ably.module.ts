import { Module, Global, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Configuração
import { AblyConfig } from '../../config/ably.config';

// Serviços Ably
import { AblyService } from './services/ably.service';
import { AblyAuthService } from './services/ably-auth.service';
import { AblyChannelService } from './services/ably-channel.service';
import { NotificationOrchestratorService } from './services/notification-orchestrator.service';

// Controladores
import { AblyController } from './controllers/ably.controller';

// Entidades
import { NotificacaoSistema } from '../../entities/notification.entity';
import { NotificationTemplate } from '../../entities/notification-template.entity';
import { PermissionModule } from '../../auth/permission.module';
import { AuthModule } from '../../auth/auth.module';

/**
 * Módulo Ably - Integração de Notificações em Tempo Real
 *
 * Este módulo é responsável por:
 * - Gerenciar conexões com o Ably Cloud
 * - Autenticação JWT para clientes
 * - Gerenciamento de canais e subscrições
 * - Orquestração entre Ably e SSE (fallback)
 * - Métricas e monitoramento
 *
 * Funcionalidades:
 * - Notificações em tempo real via WebSockets
 * - Fallback automático para SSE
 * - Circuit breaker para resiliência
 * - Rate limiting e throttling
 * - Auditoria e logs estruturados
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    EventEmitterModule,
    forwardRef(() => AuthModule),

    PermissionModule,
    TypeOrmModule.forFeature([NotificacaoSistema, NotificationTemplate]),
  ],
  controllers: [AblyController],
  providers: [
    // Configuração
    {
      provide: 'ABLY_CONFIG',
      useFactory: (configService: ConfigService) => {
        return new AblyConfig(configService);
      },
      inject: [ConfigService],
    },

    // Serviços principais
    AblyService,
    AblyAuthService,
    AblyChannelService,
    NotificationOrchestratorService,
  ],
  exports: [
    AblyService,
    AblyAuthService,
    AblyChannelService,
    NotificationOrchestratorService,
    'ABLY_CONFIG',
  ],
})
export class AblyModule {
  constructor(
    private readonly ablyService: AblyService,
    private readonly configService: ConfigService,
  ) {
    // Inicialização assíncrona do Ably
    this.initializeAbly();
  }

  /**
   * Inicializa o serviço Ably de forma assíncrona
   */
  private async initializeAbly(): Promise<void> {
    try {
      const isAblyEnabled =
        this.configService.get<string>('ABLY_API_KEY') !== 'disabled';

      if (isAblyEnabled) {
        console.log('🚀 Inicializando integração Ably...');
        // A inicialização real acontece no onModuleInit do AblyService
      } else {
        console.log('⚠️  Ably desabilitado - funcionando apenas com SSE');
      }
    } catch (error) {
      console.error('❌ Erro na inicialização do módulo Ably:', error);
    }
  }
}
