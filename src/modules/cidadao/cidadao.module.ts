import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CidadaoController } from './controllers/cidadao.controller';
import { CidadaoService } from './services/cidadao.service';
import { CidadaoRepository } from './repositories/cidadao.repository';
import { Cidadao } from './entities/cidadao.entity';
import { PapelCidadao } from './entities/papel-cidadao.entity';
import { CacheModule } from '../../shared/cache';
import { CidadaoAuditInterceptor } from './interceptors/cidadao-audit.interceptor';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { PapelCidadaoService } from './services/papel-cidadao.service';
import { PapelCidadaoController } from './controllers/papel-cidadao.controller';

/**
 * Módulo de cidadãos
 * 
 * Responsável por gerenciar os cidadãos/beneficiários do sistema,
 * incluindo cadastro, consulta e composição familiar.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Cidadao, PapelCidadao]),
    CacheModule,
    AuditoriaModule,
  ],
  controllers: [CidadaoController, PapelCidadaoController],
  providers: [
    CidadaoService, 
    CidadaoRepository,
    PapelCidadaoService,
    {
      provide: APP_INTERCEPTOR,
      useClass: CidadaoAuditInterceptor
    }
  ],
  exports: [CidadaoService, CidadaoRepository, PapelCidadaoService],
})
export class CidadaoModule {}
