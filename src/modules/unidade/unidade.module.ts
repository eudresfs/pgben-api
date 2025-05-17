import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnidadeController } from './controllers/unidade.controller';
import { SetorController } from './controllers/setor.controller';
import { UnidadeService } from './services/unidade.service';
import { SetorService } from './services/setor.service';
import { UnidadeRepository } from './repositories/unidade.repository';
import { SetorRepository } from './repositories/setor.repository';
import { Unidade } from './entities/unidade.entity';
import { Setor } from './entities/setor.entity';

/**
 * Módulo de unidades
 *
 * Responsável por gerenciar as unidades (CRAS, CREAS, etc.) e seus setores,
 * incluindo cadastro, atualização e consulta.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Unidade, Setor])],
  controllers: [UnidadeController, SetorController],
  providers: [UnidadeService, SetorService, UnidadeRepository, SetorRepository],
  exports: [UnidadeService, SetorService, UnidadeRepository, SetorRepository],
})
export class UnidadeModule {}
