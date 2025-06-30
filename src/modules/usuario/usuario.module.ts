import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuarioController } from './controllers/usuario.controller';
import { UsuarioService } from './services/usuario.service';
import { UsuarioRepository } from './repositories/usuario.repository';
import { AuthModule } from '../../auth/auth.module';
import { EmailModule } from '../../common/email.module';
import { Usuario, Role, NotificationTemplate } from '../../entities';
import { AuditoriaSharedModule } from '../../shared/auditoria/auditoria-shared.module';

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
    EmailModule,
    AuditoriaSharedModule,
  ],
  controllers: [UsuarioController],
  providers: [UsuarioService, UsuarioRepository],
  exports: [UsuarioService, UsuarioRepository],
})
export class UsuarioModule {}
