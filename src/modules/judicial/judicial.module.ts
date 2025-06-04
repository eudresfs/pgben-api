import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../../auth/auth.module';

// Entidades
import {
  ProcessoJudicial,
  DeterminacaoJudicial,
  Solicitacao,
} from '../../entities';

// Repositories
import { DeterminacaoJudicialRepository } from './repositories/determinacao-judicial.repository';
import { ProcessoJudicialRepository } from './repositories/processo-judicial.repository';

// Controllers
import { DeterminacaoJudicialController } from './controllers/determinacao-judicial.controller';
import { ProcessoJudicialController } from './controllers/processo-judicial.controller';

// Serviços
import { ProcessoJudicialService } from './services/processo-judicial.service';
import { DeterminacaoJudicialService } from './services/determinacao-judicial.service';
import { DeterminacaoJudicialConsolidadoService } from './services/determinacao-judicial-consolidado.service';

/**
 * Módulo Judicial
 *
 * Responsável por gerenciar processos judiciais e determinações judiciais
 * relacionadas a solicitações de benefício.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProcessoJudicial,
      DeterminacaoJudicial,
      Solicitacao,
    ]),
    AuthModule,
  ],
  controllers: [DeterminacaoJudicialController, ProcessoJudicialController],
  providers: [
    DeterminacaoJudicialRepository,
    ProcessoJudicialRepository,
    ProcessoJudicialService,
    DeterminacaoJudicialService,
    DeterminacaoJudicialConsolidadoService,
  ],
  exports: [
    DeterminacaoJudicialRepository,
    ProcessoJudicialRepository,
    ProcessoJudicialService,
    DeterminacaoJudicialService,
    DeterminacaoJudicialConsolidadoService,
  ],
})
export class JudicialModule {}
