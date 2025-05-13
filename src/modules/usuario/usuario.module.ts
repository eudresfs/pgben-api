import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuarioController } from './controllers/usuario.controller';
import { UsuarioService } from './services/usuario.service';
import { UsuarioRepository } from './repositories/usuario.repository';
import { Usuario } from './entities/usuario.entity';

/**
 * Módulo de usuários
 * 
 * Responsável por gerenciar os usuários do sistema, incluindo
 * cadastro, autenticação, perfis e permissões.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario]),
  ],
  controllers: [UsuarioController],
  providers: [UsuarioService, UsuarioRepository],
  exports: [UsuarioService, UsuarioRepository],
})
export class UsuarioModule {}
