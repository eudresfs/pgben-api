import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BeneficioController } from './controllers/beneficio.controller';
import { BeneficioService } from './services/beneficio.service';
import { TipoBeneficio } from './entities/tipo-beneficio.entity';
import { RequisitoDocumento } from './entities/requisito-documento.entity';
import { FluxoBeneficio } from './entities/fluxo-beneficio.entity';
import { CampoDinamicoBeneficio } from './entities/campo-dinamico-beneficio.entity';
import { VersaoSchemaBeneficio } from './entities/versao-schema-beneficio.entity';
import { SolicitacaoBeneficio } from './entities/solicitacao-beneficio.entity';
import { HistoricoSolicitacaoBeneficio } from './entities/historico-solicitacao.entity';
import { CampoDinamicoController } from './controllers/campo-dinamico.controller';
import { FormularioDinamicoController } from './controllers/formulario-dinamico.controller';
import { SolicitacaoBeneficioController } from './controllers/solicitacao-beneficio.controller';
import { ExportacaoController } from './controllers/exportacao.controller';
import { CampoDinamicoService } from './services/campo-dinamico.service';
import { ValidacaoDinamicaService } from './services/validacao-dinamica.service';
import { DadosDinamicosService } from './services/dados-dinamicos.service';
import { ExportacaoService } from './services/exportacao.service';
import { TipoBeneficioRepository } from './repositories/tipo-beneficio.repository';

/**
 * Módulo de benefícios
 *
 * Responsável por gerenciar os benefícios do sistema, incluindo tipos de benefícios,
 * requisitos documentais, fluxos de aprovação e campos dinâmicos.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      TipoBeneficio,
      RequisitoDocumento,
      FluxoBeneficio,
      CampoDinamicoBeneficio,
      VersaoSchemaBeneficio,
      SolicitacaoBeneficio,
      HistoricoSolicitacaoBeneficio,
    ]),
  ],
  controllers: [
    BeneficioController,
    CampoDinamicoController,
    FormularioDinamicoController,
    SolicitacaoBeneficioController,
    ExportacaoController,
  ],
  providers: [
    BeneficioService,
    CampoDinamicoService,
    ValidacaoDinamicaService,
    DadosDinamicosService,
    ExportacaoService,
    TipoBeneficioRepository,
  ],
  exports: [
    BeneficioService,
    CampoDinamicoService,
    ValidacaoDinamicaService,
    DadosDinamicosService,
  ],
})
export class BeneficioModule {}
