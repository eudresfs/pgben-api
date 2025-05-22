// src/auth/guards/jwt-auth.guard.ts
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { STRATEGY_JWT_AUTH } from '../constants/strategy.constant';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard(STRATEGY_JWT_AUTH) {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Verificar se a rota está marcada como pública
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Se a rota for pública, permitir acesso sem autenticação
    if (isPublic) {
      return true;
    }

    // Adicionando verificações de token nos cabeçalhos
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de autenticação não fornecido');
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    // Você pode lançar uma exceção com base nos argumentos "info" ou "err"
    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException(
          info instanceof Error ? info.message : 'Falha na autenticação',
        )
      );
    }
    return user;
  }
}
