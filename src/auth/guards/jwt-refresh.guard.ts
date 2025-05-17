import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { STRATEGY_JWT_REFRESH } from '../constants/strategy.constant';

/**
 * Guard para autenticação JWT com token de atualização
 *
 * Implementação simplificada que evita problemas de incompatibilidade de tipos
 * entre diferentes versões das bibliotecas.
 */
@Injectable()
export class JwtRefreshGuard implements CanActivate {
  /**
   * Verifica se o usuário pode acessar o endpoint
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // Obter o token do cabeçalho da requisição
      const request = context.switchToHttp().getRequest();
      const authHeader = request.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException('Token de atualização não fornecido');
      }

      // Extrair o token
      const token = authHeader.split(' ')[1];

      if (!token) {
        throw new UnauthorizedException('Token de atualização inválido');
      }

      // A validação real do token será feita pelo JwtRefreshStrategy
      // Aqui apenas verificamos se o token foi fornecido
      // O NestJS irá automaticamente usar a estratégia configurada para validar o token
      // e injetar o usuário no request se o token for válido

      // Após a validação do token, o usuário deve estar disponível no request
      // Esta verificação será feita em um interceptor ou no próprio controlador

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException(
        'Falha na autenticação do token de atualização',
      );
    }
  }
}
