import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

/**
 * Guard para autenticação de conexões SSE
 *
 * Valida o token JWT fornecido via query parameter para estabelecer
 * conexões SSE seguras. O token deve ser válido e não expirado.
 */
@Injectable()
export class SseGuard implements CanActivate {
  private readonly logger = new Logger(SseGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  /**
   * Valida se a requisição pode prosseguir
   * @param context Contexto de execução da requisição
   * @returns true se autorizado, lança exceção caso contrário
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Tenta obter o token do query parameter ou header Authorization
    const token = this.extractToken(request);

    if (!token) {
      this.logger.warn('Tentativa de conexão SSE sem token de acesso');
      throw new UnauthorizedException(
        'Token de acesso obrigatório para conexões SSE',
      );
    }

    try {
      // Verifica e decodifica o token JWT
      const payload = this.jwtService.verify(token);

      // Adiciona os dados do usuário à requisição
      request['user'] = {
        id: payload.sub || payload.id,
        email: payload.email,
        roles: payload.roles || [],
        ...payload,
      };

      this.logger.debug(
        `Conexão SSE autorizada para usuário: ${request['user'].id}`,
      );
      return true;
    } catch (error) {
      this.logger.warn(`Token SSE inválido: ${error.message}`);

      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException(
          'Token expirado. Faça login novamente.',
        );
      }

      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Token inválido ou malformado.');
      }

      throw new UnauthorizedException('Falha na autenticação do token.');
    }
  }

  /**
   * Extrai o token JWT da requisição
   * @param request Objeto da requisição HTTP
   * @returns Token JWT ou null se não encontrado
   */
  private extractToken(request: Request): string | null {
    // Primeiro tenta obter do query parameter 'token'
    const queryToken = request.query.token as string;
    if (queryToken) {
      return queryToken;
    }

    // Depois tenta obter do header Authorization
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Tenta obter de um cookie (se configurado)
    const cookieToken = request.cookies?.['access_token'];
    if (cookieToken) {
      return cookieToken;
    }

    return null;
  }
}
