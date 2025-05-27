// src/auth/guards/jwt-auth.guard.ts
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { STRATEGY_JWT_AUTH } from '../constants/strategy.constant';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtBlacklistService } from '../services/jwt-blacklist.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard(STRATEGY_JWT_AUTH) {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private jwtBlacklistService: JwtBlacklistService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
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

    // Extrair o token do cabeçalho
    const token = authHeader.substring(7);

    try {
      // Decodificar o token para obter o JTI
      const decodedToken = this.jwtService.decode(token) as any;
      
      if (!decodedToken || !decodedToken.jti) {
        throw new UnauthorizedException('Token inválido - JTI não encontrado');
      }

      // Verificar se o token está na blacklist, usando o formato correto
      const checkBlacklistResult = await this.jwtBlacklistService.isTokenBlacklisted({
        jti: decodedToken.jti
      });
      
      if (checkBlacklistResult.is_blacklisted) {
        throw new UnauthorizedException('Token foi revogado');
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // Se houver erro na decodificação, deixar o passport lidar com isso
    }

    // Continuar com a validação padrão do passport
    const result = await super.canActivate(context);
    return result as boolean;
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
