import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuarioController } from './controllers/usuario.controller';
import { UsuarioService } from './services/usuario.service';
import { UsuarioRepository } from './repositories/usuario.repository';
import { AuthModule } from '../../auth/auth.module';
import { NotificacaoModule } from '../notificacao/notificacao.module';
import { 
  Usuario, 
  Role, 
  NotificationTemplate 
} from '../../entities';

/**
 * Módulo de usuários
 *
 * Responsável por gerenciar os usuários do sistema, incluindo
 * cadastro, autenticação, perfis e permissões.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario, Role, NotificationTemplate]),
    forwardRef(() => AuthModule),
    NotificacaoModule,
  ],
  controllers: [UsuarioController],
  providers: [UsuarioService, UsuarioRepository],
  exports: [UsuarioService, UsuarioRepository],
})
export class UsuarioModule {}