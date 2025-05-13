import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RelatorioController } from './controllers/relatorio.controller';
import { RelatorioService } from './services/relatorio.service';
import { Solicitacao } from '../solicitacao/entities/solicitacao.entity';
import { Unidade } from '../unidade/entities/unidade.entity';
import { TipoBeneficio } from '../beneficio/entities/tipo-beneficio.entity';

/**
 * Módulo de Relatórios
 * 
 * Responsável por gerenciar a geração de relatórios gerenciais e operacionais
 * do sistema de gestão de benefícios eventuais.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Solicitacao,
      Unidade,
      TipoBeneficio
    ]),
  ],
  controllers: [RelatorioController],
  providers: [RelatorioService],
  exports: [RelatorioService],
})
export class RelatorioModule {}
