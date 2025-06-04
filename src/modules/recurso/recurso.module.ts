import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecursoController } from './controllers/recurso.controller';
import { RecursoService } from './services/recurso.service';
import { Recurso, RecursoHistorico, Solicitacao } from '../../entities';

/**
 * Módulo de Recursos de Primeira Instância
 *
 * Responsável por gerenciar os recursos de primeira instância para solicitações indeferidas
 */
import { forwardRef } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Recurso, RecursoHistorico, Solicitacao]),
    forwardRef(() => AuthModule),
  ],
  controllers: [RecursoController],
  providers: [RecursoService],
  exports: [RecursoService],
})
export class RecursoModule {}
