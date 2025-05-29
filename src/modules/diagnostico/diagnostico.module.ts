import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiagnosticoController } from './diagnostico.controller';
import { Cidadao } from '../cidadao/entities/cidadao.entity';

/**
 * Módulo independente para diagnóstico de performance
 * Isolado do resto da aplicação para evitar interferências
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Cidadao]),
  ],
  controllers: [
    DiagnosticoController,
  ],
  providers: [],
})
export class DiagnosticoModule {}
