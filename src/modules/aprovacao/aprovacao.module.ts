import { Module, Scope } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

// Entidades do módulo simplificado
import { AcaoAprovacao, SolicitacaoAprovacao, Aprovador } from './entities';

// Serviços
import { AprovacaoService } from './services';
import { ExecucaoAcaoService } from './services/execucao-acao.service';
import { SystemContextService } from '../../common/services/system-context.service';

// Controllers
import { AprovacaoController, ConfiguracaoAprovacaoController } from './controllers';

// Interceptors
import { AprovacaoInterceptor } from './interceptors';

// Listeners
import { AprovacaoAuditListener } from './listeners/aprovacao-audit.listener';
import { AprovacaoAblyListener } from './listeners/aprovacao-ably.listener';

// Serviços especializados
import { AprovacaoNotificationService } from './services/aprovacao-notification.service';

// Módulos existentes para integração
import { NotificacaoModule } from '../notificacao/notificacao.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { SharedBullModule } from '../../shared/bull/bull.module';
import { AuthModule } from '../../auth/auth.module';
import { UsuarioModule } from '../usuario/usuario.module';

/**
 * Módulo simplificado de aprovação
 * Consolida funcionalidades que antes estavam espalhadas em múltiplos módulos
 */
@Module({
  imports: [
    // Configuração das entidades TypeORM
    TypeOrmModule.forFeature([
      AcaoAprovacao,
      SolicitacaoAprovacao,
      Aprovador
    ]),
    
    // Integração com módulos existentes
    HttpModule,
    ConfigModule,
    NotificacaoModule,
    AuditoriaModule,
    SharedBullModule,
    AuthModule,
    UsuarioModule
  ],
  
  controllers: [
    AprovacaoController,
    ConfiguracaoAprovacaoController
  ],
  
  providers: [
    // Reflector deve ser inicializado antes dos interceptors
    Reflector,
    
    // Serviços principais (ordem de inicialização importante)
    SystemContextService,
    AprovacaoService,
    AprovacaoNotificationService,
    
    // ExecucaoAcaoService como REQUEST-scoped para acessar o token do usuário
    // Ajustado para DEFAULT scope para evitar problemas de inicialização
    {
      provide: ExecucaoAcaoService,
      useClass: ExecucaoAcaoService,
      scope: Scope.DEFAULT, // Alterado de REQUEST para DEFAULT
    },
    
    // Interceptor removido do registro global
    AprovacaoInterceptor,
    
    // Listeners para eventos
    AprovacaoAuditListener,
    AprovacaoAblyListener
  ],
  
  exports: [
    AprovacaoService,
    TypeOrmModule
  ]
})
export class AprovacaoModule {}