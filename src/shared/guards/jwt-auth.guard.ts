import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Guarda de autenticação JWT que respeita o decorador @Public()
 * Endpoints marcados como públicos não requerem autenticação
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * Verifica se o endpoint requer autenticação
   * @param context Contexto de execução
   * @returns true se o endpoint não requer autenticação ou se o usuário está autenticado
   */
  canActivate(context: ExecutionContext) {
    // Verifica se o endpoint está marcado como público
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Se for público, permite o acesso sem autenticação
    if (isPublic) {
      return true;
    }

    // Caso contrário, verifica a autenticação JWT
    return super.canActivate(context);
  }

  /**
   * Manipula erros de autenticação
   * @param err Erro ocorrido
   * @returns Nunca retorna, sempre lança uma exceção
   */
  handleRequest(err: any, user: any) {
    // Se ocorrer um erro ou o usuário não for encontrado, lança uma exceção
    if (err || !user) {
      throw err || new UnauthorizedException('Não autorizado');
    }
    return user;
  }
}
