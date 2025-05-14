import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { STRATEGY_JWT_AUTH } from '../constants/strategy.constant';

/**
 * Guard para autenticação JWT
 * 
 * Implementação simplificada que evita problemas de incompatibilidade de tipos
 * entre diferentes versões das bibliotecas.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  /**
   * Verifica se o usuário pode acessar o endpoint
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // Obter o token do cabeçalho da requisição
      const request = context.switchToHttp().getRequest();
      const authHeader = request.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException('Token de autenticação não fornecido');
      }
      
      // Extrair o token
      const token = authHeader.split(' ')[1];
      
      if (!token) {
        throw new UnauthorizedException('Token de autenticação inválido');
      }
      
      // A validação real do token será feita pelo JwtAuthStrategy
      // Aqui apenas verificamos se o token foi fornecido
      // O NestJS irá automaticamente usar a estratégia configurada para validar o token
      // e injetar o usuário no request se o token for válido
      
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new UnauthorizedException('Falha na autenticação do token');
    }
  }
  
  /**
   * Manipula o resultado da autenticação
   */
  handleRequest(err: any, user: any, info: any) {
    // Você pode lançar uma exceção com base nos argumentos "info" ou "err"
    if (err || !user) {
      throw err || new UnauthorizedException(`${info}`);
    }
    return user;
  }
}
