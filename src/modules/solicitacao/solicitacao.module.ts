import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@/auth/auth.module'
import { SolicitacaoController } from './controllers/solicitacao.controller';
import { SolicitacaoService } from './services/solicitacao.service';
import { Solicitacao } from './entities/solicitacao.entity';
import { HistoricoSolicitacao } from './entities/historico-solicitacao.entity';
import { Pendencia } from './entities/pendencia.entity';

/**
 * Módulo de Solicitações
 *
 * Responsável por gerenciar as solicitações de benefícios,
 * incluindo criação, aprovação, liberação e acompanhamento.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Solicitacao, HistoricoSolicitacao, Pendencia]),
    // Importa o módulo compartilhado de autenticação
    AuthModule,
  ],
  controllers: [SolicitacaoController],
  providers: [SolicitacaoService],
  exports: [SolicitacaoService],
})
export class SolicitacaoModule {}
