import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BeneficioController } from './controllers/beneficio.controller';
import { BeneficioService } from './services/beneficio.service';
import { TipoBeneficio } from './entities/tipo-beneficio.entity';
import { RequisitoDocumento } from './entities/requisito-documento.entity';
import { FluxoBeneficio } from './entities/fluxo-beneficio.entity';

/**
 * Módulo de Benefícios
 * 
 * Responsável por gerenciar os tipos de benefícios, requisitos documentais
 * e fluxos de aprovação do sistema.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      TipoBeneficio,
      RequisitoDocumento,
      FluxoBeneficio
    ]),
  ],
  controllers: [BeneficioController],
  providers: [BeneficioService],
  exports: [BeneficioService],
})
export class BeneficioModule {}
