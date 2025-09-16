import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import {
  IUserIdentifierService,
  UserIdentificationResult,
  UserIdentificationStrategy,
} from '../interfaces/user-identifier.interface';

/**
 * Serviço responsável por identificar usuários para rate limiting
 * Implementa estratégias seguras de identificação baseadas no contexto da requisição
 */
@Injectable()
export class UserIdentifierService implements IUserIdentifierService {
  private readonly logger = new Logger(UserIdentifierService.name);

  /**
   * Identifica o usuário baseado na requisição
   * @param req Objeto de requisição Express
   * @param strategy Estratégia de identificação (opcional)
   * @returns Resultado da identificação
   */
  identifyUser(
    req: Request,
    strategy?: UserIdentificationStrategy,
  ): UserIdentificationResult {
    const metadata = {
      ip: this.extractClientIp(req),
      userAgent: req.get('User-Agent') || 'unknown',
      route: req.path,
    };

    // Verificar se o usuário está autenticado
    const user = (req as any).user;
    const isAuthenticated = !!(user && user.id);

    // Se usuário autenticado, usar ID do usuário
    if (isAuthenticated) {
      const userId = user.id;
      const sanitizedUserId = this.sanitizeIdentifier(userId);

      this.logger.debug(
        `Usuário autenticado identificado: ${sanitizedUserId}`,
        {
          userId: sanitizedUserId,
          route: req.path,
        },
      );

      return {
        identifier: `user:${sanitizedUserId}`,
        strategy: UserIdentificationStrategy.USER_ID,
        isAuthenticated: true,
        userId: sanitizedUserId,
        metadata,
      };
    }

    // Para usuários não autenticados, aplicar estratégia específica
    const appliedStrategy = strategy || this.determineStrategy(req);

    switch (appliedStrategy) {
      case UserIdentificationStrategy.IP_FALLBACK:
        return this.identifyByIp(req, metadata);

      case UserIdentificationStrategy.GLOBAL_LIMIT:
        return this.identifyAsGlobal(req, metadata);

      default:
        // Fallback para IP em casos não especificados
        return this.identifyByIp(req, metadata);
    }
  }

  /**
   * Verifica se o identificador é válido
   * @param identifier Identificador a ser validado
   * @returns true se válido
   */
  isValidIdentifier(identifier: string): boolean {
    if (!identifier || typeof identifier !== 'string') {
      return false;
    }

    // Verificar comprimento mínimo e máximo
    if (identifier.length < 3 || identifier.length > 100) {
      return false;
    }

    // Verificar caracteres permitidos (alfanuméricos, hífen, underscore, dois pontos)
    const validPattern = /^[a-zA-Z0-9\-_:\.]+$/;
    return validPattern.test(identifier);
  }

  /**
   * Sanitiza o identificador para uso seguro
   * @param identifier Identificador a ser sanitizado
   * @returns Identificador sanitizado
   */
  sanitizeIdentifier(identifier: string): string {
    if (!identifier) {
      return 'unknown';
    }

    // Remover caracteres especiais e limitar comprimento
    const sanitized = identifier
      .toString()
      .replace(/[^a-zA-Z0-9\-_]/g, '')
      .substring(0, 50);

    return sanitized || 'unknown';
  }

  /**
   * Determina a estratégia baseada na rota
   * @param req Objeto de requisição
   * @returns Estratégia apropriada
   */
  private determineStrategy(req: Request): UserIdentificationStrategy {
    const path = req.path.toLowerCase();

    // Rotas de autenticação podem usar IP temporariamente
    if (path.includes('/auth/login') || path.includes('/auth/register')) {
      return UserIdentificationStrategy.IP_FALLBACK;
    }

    // Rotas públicas usam limite global
    if (
      path.includes('/health') ||
      path.includes('/metrics') ||
      path.includes('/public')
    ) {
      return UserIdentificationStrategy.GLOBAL_LIMIT;
    }

    // Default para IP fallback
    return UserIdentificationStrategy.IP_FALLBACK;
  }

  /**
   * Identifica usuário por IP (fallback)
   * @param req Objeto de requisição
   * @param metadata Metadados da requisição
   * @returns Resultado da identificação
   */
  private identifyByIp(
    req: Request,
    metadata: any,
  ): UserIdentificationResult {
    const ip = this.extractClientIp(req);
    const sanitizedIp = this.sanitizeIdentifier(ip);

    this.logger.debug(`Usuário não autenticado identificado por IP: ${sanitizedIp}`, {
      ip: sanitizedIp,
      route: req.path,
    });

    return {
      identifier: `ip:${sanitizedIp}`,
      strategy: UserIdentificationStrategy.IP_FALLBACK,
      isAuthenticated: false,
      metadata,
    };
  }

  /**
   * Identifica como limite global
   * @param req Objeto de requisição
   * @param metadata Metadados da requisição
   * @returns Resultado da identificação
   */
  private identifyAsGlobal(
    req: Request,
    metadata: any,
  ): UserIdentificationResult {
    this.logger.debug(`Aplicando limite global para rota: ${req.path}`);

    return {
      identifier: 'global:public',
      strategy: UserIdentificationStrategy.GLOBAL_LIMIT,
      isAuthenticated: false,
      metadata,
    };
  }

  /**
   * Extrai o IP do cliente da requisição
   * @param req Objeto de requisição
   * @returns IP do cliente
   */
  private extractClientIp(req: Request): string {
    // Verificar headers de proxy primeiro
    const forwarded = req.get('x-forwarded-for');
    if (forwarded) {
      // Pegar o primeiro IP da lista (cliente original)
      return forwarded.split(',')[0].trim();
    }

    // Verificar outros headers comuns
    const realIp = req.get('x-real-ip');
    if (realIp) {
      return realIp.trim();
    }

    // Fallback para IP da conexão
    return req.ip || req.connection?.remoteAddress || 'unknown';
  }
}