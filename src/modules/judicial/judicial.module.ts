

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../../auth/auth.module';

// Entidades
import { ProcessoJudicial } from './entities/processo-judicial.entity';
import { DeterminacaoJudicial } from './entities/determinacao-judicial.entity';

// Repositories
import { DeterminacaoJudicialRepository } from './repositories/determinacao-judicial.repository';
import { ProcessoJudicialRepository } from './repositories/processo-judicial.repository';

// Controllers
import { DeterminacaoJudicialController } from './controllers/determinacao-judicial.controller';
import { ProcessoJudicialController } from './controllers/processo-judicial.controller';

// Serviços
import { ProcessoJudicialService } from './services/processo-judicial.service';
import { DeterminacaoJudicialService } from './services/determinacao-judicial.service';

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
    ]),
    AuthModule,
  ],
  controllers: [
    DeterminacaoJudicialController,
    ProcessoJudicialController,
  ],
  providers: [
    DeterminacaoJudicialRepository,
    ProcessoJudicialRepository,
    ProcessoJudicialService,
    DeterminacaoJudicialService,
  ],
  exports: [
    DeterminacaoJudicialRepository,
    ProcessoJudicialRepository,
    ProcessoJudicialService,
    DeterminacaoJudicialService,
  ],
})
export class JudicialModule {}
