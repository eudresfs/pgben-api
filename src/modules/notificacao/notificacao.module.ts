import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificacaoController } from './controllers/notificacao.controller';
import { NotificacaoService } from './services/notificacao.service';
import { Notificacao } from './entities/notificacao.entity';

/**
 * Módulo de Notificações
 * 
 * Responsável por gerenciar as notificações enviadas aos usuários do sistema,
 * incluindo criação, leitura e arquivamento.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Notificacao]),
  ],
  controllers: [NotificacaoController],
  providers: [NotificacaoService],
  exports: [NotificacaoService],
})
export class NotificacaoModule {}
