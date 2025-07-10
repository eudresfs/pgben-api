import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from '../../auth/auth.module';

import { forwardRef } from '@nestjs/common';
import { BeneficioModule } from '../beneficio/beneficio.module';
import { JudicialModule } from '../judicial/judicial.module';
import { CidadaoModule } from '../cidadao/cidadao.module';
import { UsuarioModule } from '../usuario/usuario.module';
import { NotificacaoModule } from '../notificacao/notificacao.module';
import { ConfiguracaoModule } from '../configuracao/configuracao.module';
import { DocumentoModule } from '../documento/documento.module';
import { SolicitacaoController } from './controllers/solicitacao.controller';
import { SolicitacaoService } from './services/solicitacao.service';
import { DeterminacaoJudicialController } from './controllers/determinacao-judicial.controller';
import { DeterminacaoJudicialService } from './services/determinacao-judicial.service';
import { DeterminacaoJudicialAdapterService } from './services/determinacao-judicial-adapter.service';
import { WorkflowSolicitacaoController } from './controllers/workflow-solicitacao.controller';
import { MonitoramentoAluguelSocialController } from './controllers/monitoramento-aluguel-social.controller';
import { PendenciaController } from './controllers/pendencia.controller';
import { PendenciaService } from './services/pendencia.service';
import { WorkflowSolicitacaoService } from './services/workflow-solicitacao.service';
import { TransicaoEstadoService } from './services/transicao-estado.service';
import { ValidacaoSolicitacaoService } from './services/validacao-solicitacao.service';
import { PrazoSolicitacaoService } from './services/prazo-solicitacao.service';
import { PriorizacaoSolicitacaoService } from './services/priorizacao-solicitacao.service';
import { NotificacaoService } from './services/notificacao.service';
import { EventosService } from './services/eventos.service';
import { ValidacaoExclusividadeService } from './services/validacao-exclusividade.service';
import { SolicitacaoEventListener } from './listeners/solicitacao-event.listener';
import {
  Solicitacao,
  HistoricoSolicitacao,
  DeterminacaoJudicial,
  Pendencia,
  Usuario,
  NotificationTemplate,
  ComposicaoFamiliar,
} from '../../entities';
import { MonitoramentoAluguelSocialService } from './services/monitoramento-aluguel-social.service';
import { TemplateMappingService } from './services/template-mapping.service';

/**
 * Módulo de Solicitações
 *
 * Responsável por gerenciar as solicitações de benefícios,
 * incluindo criação, aprovação, liberação e acompanhamento.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Solicitacao,
      HistoricoSolicitacao,
      Pendencia,
      DeterminacaoJudicial,
      Usuario, // Adicionado para permitir injeção do Repository<Usuario>
      NotificationTemplate, // Adicionado para permitir injeção do TemplateRepository
      ComposicaoFamiliar, // Adicionado para validação cruzada com solicitações
    ]),
    // Importa o módulo judicial para acesso aos repositórios e serviços
    JudicialModule,
    // Importa o módulo de cidadão para validações
    CidadaoModule,
    // Importa o módulo de usuário para acesso ao UsuarioRepository
    UsuarioModule,
    // Importa o módulo de notificação para acesso ao NotificacaoService
    NotificacaoModule,
    // Importa o módulo de configuração para acesso ao TemplateRepository
    ConfiguracaoModule,
    // Importa o módulo compartilhado de autenticação
    AuthModule,

    // Módulo de eventos para notificações
    EventEmitterModule.forRoot(),
    // Módulo de agendamento para tarefas programadas
    ScheduleModule.forRoot(),
    forwardRef(() => BeneficioModule),
    // Módulo de documentos para validação de requisitos documentais
    DocumentoModule,
  ],
  controllers: [
    SolicitacaoController,
    DeterminacaoJudicialController,
    WorkflowSolicitacaoController,
    MonitoramentoAluguelSocialController,
    PendenciaController,
  ],
  providers: [
    SolicitacaoService,
    DeterminacaoJudicialService,
    DeterminacaoJudicialAdapterService,
    WorkflowSolicitacaoService,
    TransicaoEstadoService,
    ValidacaoSolicitacaoService,
    PrazoSolicitacaoService,
    PriorizacaoSolicitacaoService,
    NotificacaoService,
    EventosService,
    ValidacaoExclusividadeService,
    MonitoramentoAluguelSocialService,
    PendenciaService,
    SolicitacaoEventListener,
    TemplateMappingService,
  ],
  exports: [
    TypeOrmModule,
    SolicitacaoService,
    DeterminacaoJudicialService,
    DeterminacaoJudicialAdapterService,
    WorkflowSolicitacaoService,
    PrazoSolicitacaoService,
    PriorizacaoSolicitacaoService,
    NotificacaoService,
    EventosService,
    MonitoramentoAluguelSocialService,
    PendenciaService,
  ],
})
export class SolicitacaoModule {}
