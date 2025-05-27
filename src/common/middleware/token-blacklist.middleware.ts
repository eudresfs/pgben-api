// src/common/middleware/token-blacklist.middleware.ts
import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { JwtBlacklistService } from '../../auth/services/jwt-blacklist.service';

/**
 * Middleware para verificação de tokens na blacklist
 * 
 * Intercepta requisições e verifica se o token JWT está na blacklist
 * antes de permitir o acesso aos recursos protegidos
 */
@Injectable()
export class TokenBlacklistMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TokenBlacklistMiddleware.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly jwtBlacklistService: JwtBlacklistService,
  ) {}

  /**
   * Middleware principal para verificação de blacklist
   * @param req Request object
   * @param res Response object
   * @param next Next function
   */
  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Extrair token do header Authorization ou cookies
      const token = this.extractTokenFromRequest(req);

      // Se não há token, prosseguir (será tratado pelo AuthGuard)
      if (!token) {
        return next();
      }

      // Decodificar token para obter o JTI
      const jti = await this.extractJtiFromToken(token);

      // Se não conseguiu extrair JTI, prosseguir
      if (!jti) {
        return next();
      }

      // Verificar se o token está na blacklist
      const blacklistCheck = await this.jwtBlacklistService.isTokenBlacklisted({
        jti,
      });

      if (blacklistCheck.is_blacklisted) {
        this.logger.warn(`Token blacklisted detectado`, {
          jti,
          reason: blacklistCheck.reason,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
        });

        throw new UnauthorizedException({
          message: 'Token foi revogado',
          error: 'TOKEN_REVOKED',
          reason: blacklistCheck.reason,
          timestamp: new Date().toISOString(),
        });
      }

      // Token válido, prosseguir
      next();
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // Log do erro mas não bloquear a requisição
      // Deixar o AuthGuard tratar a validação do token
      this.logger.error(`Erro no middleware de blacklist: ${error.message}`, {
        error: error.stack,
        path: req.path,
        method: req.method,
      });

      next();
    }
  }

  /**
   * Extrai o token JWT da requisição
   * @param req Request object
   * @returns Token JWT ou null
   */
  private extractTokenFromRequest(req: Request): string | null {
    // Tentar extrair do header Authorization
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Tentar extrair dos cookies
    const cookieToken = req.cookies?.['access_token'];
    if (cookieToken) {
      return cookieToken;
    }

    return null;
  }

  /**
   * Extrai o JTI (JWT ID) do token
   * @param token Token JWT
   * @returns JTI ou null
   */
  private async extractJtiFromToken(token: string): Promise<string | null> {
    try {
      // Decodificar sem verificar assinatura (apenas para extrair JTI)
      const decoded = this.jwtService.decode(token) as any;
      
      if (!decoded || typeof decoded !== 'object') {
        return null;
      }

      return decoded.jti || null;
    } catch (error) {
      this.logger.debug(`Erro ao decodificar token para extrair JTI: ${error.message}`);
      return null;
    }
  }
}