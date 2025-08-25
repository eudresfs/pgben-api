import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../../auth/auth.module';
import { SharedModule } from '../../shared/shared.module';
import { UsuarioModule } from '../usuario/usuario.module';
import { CidadaoModule } from '../cidadao/cidadao.module';
import { UnidadeModule } from '../unidade/unidade.module';

// Entidades
import {
  AgendamentoVisita,
  VisitaDomiciliar,
  Usuario,
  Cidadao,
  Unidade,
  Concessao,
  Pagamento,
} from '../../entities';
import { AvaliacaoVisita } from './entities/avaliacao-visita.entity';
import { HistoricoMonitoramento } from './entities/historico-monitoramento.entity';

// Controllers
import {
  AgendamentoController,
  VisitaController,
} from './controllers';
import { RelatorioMonitoramentoController } from './controllers/relatorio-monitoramento.controller';

// Services
import {
  AgendamentoService,
  VisitaService,
} from './services';
import { AgendamentoBatchService } from './services/agendamento-batch.service';
import { RelatorioMonitoramentoService } from './services/relatorio-monitoramento.service';

// Repositories
import { AgendamentoRepository } from './repositories/agendamento.repository';
import { VisitaRepository } from './repositories/visita.repository';

/**
 * Módulo de Monitoramento Domiciliar do PGBen
 *
 * Responsável por gerenciar o agendamento e execução de visitas domiciliares
 * para beneficiários do programa, incluindo:
 *
 * - Agendamento de visitas com técnicos responsáveis
 * - Controle de prioridades e status dos agendamentos
 * - Registro e avaliação de visitas realizadas
 * - Monitoramento de prazos e atrasos
 * - Recomendações para renovação de benefícios
 * - Identificação de problemas de elegibilidade
 *
 * Este módulo integra-se com os módulos de usuário, cidadão e unidade
 * para fornecer uma gestão completa do processo de monitoramento.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AgendamentoVisita,
      VisitaDomiciliar,
      AvaliacaoVisita,
      HistoricoMonitoramento,
      Usuario,
      Cidadao,
      Unidade,
      Concessao,
      Pagamento,
    ]),
    // Módulo compartilhado para serviços utilitários
    SharedModule,
    // Módulo de autenticação para controle de acesso
    AuthModule,
    // Módulos necessários para relacionamentos
    UsuarioModule,
    CidadaoModule,
    UnidadeModule,
  ],
  controllers: [
    AgendamentoController,
    VisitaController,
    RelatorioMonitoramentoController,
  ],
  providers: [
    // Repositories
    AgendamentoRepository,
    VisitaRepository,
    // Services
    AgendamentoService,
    AgendamentoBatchService,
    VisitaService,
    RelatorioMonitoramentoService,
  ],
  exports: [
    // Exportamos os serviços para uso em outros módulos
    AgendamentoService,
    VisitaService,
  ],
})
export class MonitoramentoModule {
  /**
   * Documentação do módulo de monitoramento
   *
   * Este módulo fornece:
   *
   * 1. Sistema de agendamento de visitas domiciliares
   * 2. Controle de prioridades e status dos agendamentos
   * 3. Registro detalhado de visitas realizadas
   * 4. Avaliação de condições socioeconômicas
   * 5. Monitoramento de prazos e identificação de atrasos
   * 6. Recomendações automáticas para renovação
   * 7. Detecção de problemas de elegibilidade
   *
   * Implementado seguindo os princípios SOLID e Clean Architecture,
   * com separação clara de responsabilidades entre agendamento
   * e execução de visitas.
   */
}