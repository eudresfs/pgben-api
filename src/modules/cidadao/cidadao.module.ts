import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CidadaoController } from './controllers/cidadao.controller';
import { CidadaoService } from './services/cidadao.service';
import { CidadaoRepository } from './repositories/cidadao.repository';
import { Cidadao } from './entities/cidadao.entity';

/**
 * Módulo de cidadãos
 * 
 * Responsável por gerenciar os cidadãos/beneficiários do sistema,
 * incluindo cadastro, consulta e composição familiar.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Cidadao]),
  ],
  controllers: [CidadaoController],
  providers: [CidadaoService, CidadaoRepository],
  exports: [CidadaoService, CidadaoRepository],
})
export class CidadaoModule {}
