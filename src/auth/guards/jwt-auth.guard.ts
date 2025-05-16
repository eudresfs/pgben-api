// src/auth/guards/jwt-auth.guard.ts
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { STRATEGY_JWT_AUTH } from '../constants/strategy.constant';

@Injectable()
export class JwtAuthGuard extends AuthGuard(STRATEGY_JWT_AUTH) {
  constructor() {
    super();
  }

  canActivate(context: ExecutionContext) {
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
      throw err || new UnauthorizedException(info instanceof Error ? info.message : 'Falha na autenticação');
    }
    return user;
  }
}