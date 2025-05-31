import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from '../../auth/auth.module';
import { JudicialModule } from '../judicial/judicial.module'
import { SolicitacaoController } from './controllers/solicitacao.controller';
import { SolicitacaoService } from './services/solicitacao.service';
import { DeterminacaoJudicialController } from './controllers/determinacao-judicial.controller';
import { DeterminacaoJudicialService } from './services/determinacao-judicial.service';
import { DeterminacaoJudicialAdapterService } from './services/determinacao-judicial-adapter.service';
import { WorkflowSolicitacaoController } from './controllers/workflow-solicitacao.controller';
import { MonitoramentoAluguelSocialController } from './controllers/monitoramento-aluguel-social.controller';
import { WorkflowSolicitacaoService } from './services/workflow-solicitacao.service';
import { TransicaoEstadoService } from './services/transicao-estado.service';
import { ValidacaoSolicitacaoService } from './services/validacao-solicitacao.service';
import { PrazoSolicitacaoService } from './services/prazo-solicitacao.service';
import { PriorizacaoSolicitacaoService } from './services/priorizacao-solicitacao.service';
import { NotificacaoService } from './services/notificacao.service';
import { EventosService } from './services/eventos.service';
import { ValidacaoExclusividadeService } from './services/validacao-exclusividade.service';
import { SolicitacaoEventListener } from './listeners/solicitacao-event.listener';
import { Solicitacao } from './entities/solicitacao.entity';
import { HistoricoSolicitacao } from './entities/historico-solicitacao.entity';
import { Pendencia } from './entities/pendencia.entity';
import { DeterminacaoJudicial } from '../judicial/entities/determinacao-judicial.entity';
import { MonitoramentoAluguelSocialService } from './services/monitoramento-aluguel-social.service';

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
      DeterminacaoJudicial
    ]),
    // Importa o módulo judicial para acesso aos repositórios e serviços
    JudicialModule,
    // Importa o módulo compartilhado de autenticação
    AuthModule,
    // Módulo de eventos para notificações
    EventEmitterModule.forRoot(),
    // Módulo de agendamento para tarefas programadas
    ScheduleModule.forRoot(),
  ],
  controllers: [
    SolicitacaoController,
    DeterminacaoJudicialController,
    WorkflowSolicitacaoController,
    MonitoramentoAluguelSocialController
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
    SolicitacaoEventListener
  ],
  exports: [
    SolicitacaoService,
    DeterminacaoJudicialService,
    DeterminacaoJudicialAdapterService,
    WorkflowSolicitacaoService,
    PrazoSolicitacaoService,
    PriorizacaoSolicitacaoService,
    NotificacaoService,
    EventosService,
    MonitoramentoAluguelSocialService
  ],
})
export class SolicitacaoModule {}
