import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';

// Entities
import {
  AcaoCritica,
  ConfiguracaoAprovacao,
  SolicitacaoAprovacao,
  Aprovador,
  HistoricoAprovacao,
  DelegacaoAprovacao,
} from './entities';

// Controladores
import { AprovacaoController } from './controllers/aprovacao.controller';
import { ConfiguracaoAprovacaoController } from './controllers/configuracao-aprovacao.controller';
import { SolicitacaoAprovacaoController } from './controllers/solicitacao-aprovacao.controller';
import { WorkflowAprovacaoController } from './controllers/workflow-aprovacao.controller';

// Serviços
import {
  AprovacaoService,
  AcaoCriticaService,
  ConfiguracaoAprovacaoService,
  SolicitacaoAprovacaoService,
  AprovadorService,
  HistoricoAprovacaoService,
  DelegacaoAprovacaoService,
  AprovacaoMetricsService,
} from './services';

// Guards
import { AprovadorAutorizadoGuard } from './guards/aprovador-autorizado.guard';
import {
  AprovacaoGuard,
  PermissaoAcaoCriticaGuard,
  AprovadorGuard,
} from './guards/aprovacao.guard';

// Interceptors
import { AcaoCriticaInterceptor } from './interceptors/acao-critica.interceptor';
import { AprovacaoInterceptor } from './interceptors/aprovacao.interceptor';

// Pipes
import {
  AprovacaoValidationPipe,
  SolicitacaoIdValidationPipe,
  FiltrosAprovacaoValidationPipe,
} from './pipes/aprovacao-validation.pipe';

// Middleware
import { AuditoriaAprovacaoMiddleware, AuditoriaDelegacaoMiddleware } from './middleware/auditoria-aprovacao.middleware';

// Serviços adicionais
import { NotificacaoAprovacaoService } from './services/notificacao-aprovacao.service';
import { EscalacaoAprovacaoService } from './services/escalacao-aprovacao.service';

// Estratégias de aprovação
import { EstrategiaAprovacaoFactory } from './strategies/estrategia-aprovacao.factory';
import { AprovacaoUnanimeStrategy } from './strategies/aprovacao-unanime.strategy';
import { AprovacaoMaioriaStrategy } from './strategies/aprovacao-maioria.strategy';
import { AprovacaoHierarquicaStrategy } from './strategies/aprovacao-hierarquica.strategy';
import { AprovacaoPonderadaStrategy } from './strategies/aprovacao-ponderada.strategy';

// Constantes
import { APROVACAO_QUEUE, NOTIFICACAO_QUEUE, ESCALACAO_QUEUE } from './constants/aprovacao.constants';

// Repositories
import {
  AcaoCriticaRepository,
  ConfiguracaoAprovacaoRepository,
  SolicitacaoAprovacaoRepository,
  AprovadorRepository,
  HistoricoAprovacaoRepository,
} from './repositories';

// Processors
import { AprovacaoProcessor } from './processors/aprovacao.processor';
import { NotificacaoProcessor } from './processors/notificacao.processor';
import { EscalacaoProcessor } from './processors/escalacao.processor';

// Módulos relacionados
import { UsuarioModule } from '../usuario/usuario.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { NotificacaoModule } from '../notificacao/notificacao.module';
import { AuthModule } from '../../auth/auth.module';

/**
 * Módulo responsável pelo sistema de aprovação de ações críticas
 *
 * Funcionalidades:
 * - Configuração de regras de aprovação por ação e perfil
 * - Workflow de aprovação com múltiplas estratégias
 * - Escalação automática por prazo
 * - Auditoria completa do processo
 * - Notificações multi-canal
 *
 * Integração:
 * - Módulo de Auditoria para logging
 * - Módulo de Notificação para alertas
 * - Módulo de Usuário para aprovadores
 * - Sistema de filas BullMQ para processamento assíncrono
 */
@Module({
  imports: [
    // Configuração do TypeORM para as entidades do módulo
    TypeOrmModule.forFeature([
      AcaoCritica,
      ConfiguracaoAprovacao,
      SolicitacaoAprovacao,
      Aprovador,
      HistoricoAprovacao,
      DelegacaoAprovacao,
    ]),

    // Módulo de configuração para acessar variáveis de ambiente
    ConfigModule,

    // BullMQ queue for async processing
    BullModule.registerQueue(
      { name: APROVACAO_QUEUE },
      { name: NOTIFICACAO_QUEUE },
      { name: ESCALACAO_QUEUE },
    ),

    // Módulos relacionados (usando forwardRef para evitar dependências circulares)
    forwardRef(() => UsuarioModule),
    forwardRef(() => AuditoriaModule),
    forwardRef(() => NotificacaoModule),
    forwardRef(() => AuthModule),
  ],

  controllers: [
    AprovacaoController,
    ConfiguracaoAprovacaoController,
    SolicitacaoAprovacaoController,
    WorkflowAprovacaoController,
  ],

  providers: [
    // === Repositories ===
    AcaoCriticaRepository,
    ConfiguracaoAprovacaoRepository,
    SolicitacaoAprovacaoRepository,
    AprovadorRepository,
    HistoricoAprovacaoRepository,

    // === Serviços Principais ===
    AprovacaoService,
    AcaoCriticaService,
    ConfiguracaoAprovacaoService,
    AprovadorService,
    HistoricoAprovacaoService,
    SolicitacaoAprovacaoService,
    DelegacaoAprovacaoService,
    NotificacaoAprovacaoService,
    EscalacaoAprovacaoService,
    
    // === Serviços de Métricas e Análise ===
    AprovacaoMetricsService,

    // === Guards ===
    AprovadorAutorizadoGuard,
    AprovacaoGuard,
    PermissaoAcaoCriticaGuard,
    AprovadorGuard,
    
    // === Interceptors ===
    AcaoCriticaInterceptor,
    AprovacaoInterceptor,
    
    // === Middleware ===
    AuditoriaAprovacaoMiddleware,
    AuditoriaDelegacaoMiddleware,
    
    // === Pipes ===
    AprovacaoValidationPipe,
    SolicitacaoIdValidationPipe,
    FiltrosAprovacaoValidationPipe,

    // Queue processors
    AprovacaoProcessor,
    NotificacaoProcessor,
    EscalacaoProcessor,

    // Strategy implementations
    EstrategiaAprovacaoFactory,
    AprovacaoUnanimeStrategy,
    AprovacaoMaioriaStrategy,
    AprovacaoHierarquicaStrategy,
    AprovacaoPonderadaStrategy,
  ],

  exports: [
    // === Serviços Principais (para uso em outros módulos) ===
    AprovacaoService,
    AcaoCriticaService,
    ConfiguracaoAprovacaoService,
    AprovadorService,
    HistoricoAprovacaoService,
    SolicitacaoAprovacaoService,
    DelegacaoAprovacaoService,
    NotificacaoAprovacaoService,
    EscalacaoAprovacaoService,
    
    // === Serviços de Métricas ===
    AprovacaoMetricsService,
    
    // === Guards (para uso global) ===
    AprovadorAutorizadoGuard,
    AprovacaoGuard,
    PermissaoAcaoCriticaGuard,
    AprovadorGuard,
    
    // === Interceptors (para uso global) ===
    AcaoCriticaInterceptor,
    AprovacaoInterceptor,
    
    // === Middleware (para uso global) ===
    AuditoriaAprovacaoMiddleware,
    AuditoriaDelegacaoMiddleware,
    
    // === Pipes (para uso global) ===
    AprovacaoValidationPipe,
    SolicitacaoIdValidationPipe,
    FiltrosAprovacaoValidationPipe,

    // === Repositórios TypeORM (para injeção direta se necessário) ===
    AcaoCriticaRepository,
    ConfiguracaoAprovacaoRepository,
    SolicitacaoAprovacaoRepository,
    AprovadorRepository,
    HistoricoAprovacaoRepository,
    
    // === Módulo TypeORM ===
    TypeOrmModule,
  ],
})
export class AprovacaoModule {}
