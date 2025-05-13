import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Guard para proteção de rotas com autenticação JWT
 * 
 * Verifica se o usuário está autenticado através do token JWT.
 * Permite acesso a rotas marcadas como públicas com o decorator @Public()
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Verifica se a rota está marcada como pública
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Se for pública, permite o acesso sem verificação
    if (isPublic) {
      return true;
    }

    // Caso contrário, verifica a autenticação JWT
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    // Se houver erro ou o usuário não for encontrado, lança exceção
    if (err || !user) {
      throw err || new UnauthorizedException('Acesso não autorizado');
    }
    return user;
  }
}
