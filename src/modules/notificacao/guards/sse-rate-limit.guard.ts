import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import {
  SseRateLimiterService,
  RateLimitResult,
} from '../services/sse-rate-limiter.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * Interface para configuração de rate limiting via decorator
 */
interface SseRateLimitOptions {
  /** Perfil de rate limiting a ser usado */
  profile?: 'default' | 'admin' | 'system' | 'premium';
  /** Se deve pular rate limiting */
  skip?: boolean;
  /** Identificador customizado */
  customIdentifier?: string;
}

/**
 * Decorator para configurar rate limiting em endpoints SSE
 * @param options Opções de configuração
 */
export const SseRateLimit = (options: SseRateLimitOptions = {}) => {
  return SetMetadata('sse-rate-limit', options);
};

/**
 * Guard para rate limiting específico de SSE
 *
 * Integra autenticação JWT com rate limiting granular,
 * suportando diferentes perfis de usuário e identificadores customizados.
 */
@Injectable()
export class SseRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(SseRateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimiterService: SseRateLimiterService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Obter configurações do decorator
    const options =
      this.reflector.get<SseRateLimitOptions>(
        'sse-rate-limit',
        context.getHandler(),
      ) || {};

    // Pular rate limiting se configurado
    if (options.skip) {
      this.logger.debug('Rate limiting pulado via decorator');
      return true;
    }

    try {
      // Extrair informações da requisição
      const { identifier, profile, ip } = await this.extractRequestInfo(
        request,
        options,
      );

      // Verificar rate limit
      const rateLimitResult = await this.rateLimiterService.checkRateLimit(
        identifier,
        profile,
        ip,
      );

      // Adicionar headers de rate limiting
      this.addRateLimitHeaders(response, rateLimitResult);

      // Verificar se requisição é permitida
      if (!rateLimitResult.allowed) {
        this.logger.warn(
          `Rate limit excedido para ${identifier} (IP: ${ip}, Perfil: ${profile})`,
        );

        throw new HttpException(
          {
            error: 'Rate Limit Exceeded',
            message: 'Muitas requisições. Tente novamente mais tarde.',
            retryAfter: rateLimitResult.resetTime,
            limit: rateLimitResult.limit,
            remaining: rateLimitResult.remaining,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      this.logger.debug(
        `Rate limit OK para ${identifier} (${rateLimitResult.remaining}/${rateLimitResult.limit} restantes)`,
      );

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Erro no rate limiting: ${error.message}`, error.stack);

      // Em caso de erro interno, permitir requisição (fail-open)
      return true;
    }
  }

  /**
   * Extrai informações da requisição para rate limiting
   * @param request Requisição HTTP
   * @param options Opções do decorator
   * @returns Informações extraídas
   */
  private async extractRequestInfo(
    request: Request,
    options: SseRateLimitOptions,
  ): Promise<{
    identifier: string;
    profile: 'default' | 'admin' | 'system' | 'premium';
    ip: string;
  }> {
    const ip = this.extractClientIP(request);

    // Usar identificador customizado se fornecido
    if (options.customIdentifier) {
      return {
        identifier: options.customIdentifier,
        profile: options.profile || 'default',
        ip,
      };
    }

    // Tentar extrair token JWT
    const token = this.extractToken(request);

    if (token) {
      try {
        const payload = await this.jwtService.verifyAsync(token, {
          secret: this.configService.get<string>('JWT_SECRET'),
        });

        // Determinar perfil baseado no usuário
        const profile = this.determineUserProfile(payload);

        return {
          identifier: `user:${payload.sub || payload.userId}`,
          profile,
          ip,
        };
      } catch (jwtError) {
        this.logger.debug(`Token JWT inválido: ${jwtError.message}`);
      }
    }

    // Fallback para IP como identificador
    return {
      identifier: `ip:${ip}`,
      profile: options.profile || 'default',
      ip,
    };
  }

  /**
   * Extrai token JWT da requisição
   * @param request Requisição HTTP
   * @returns Token JWT ou null
   */
  private extractToken(request: Request): string | null {
    // Verificar query parameter
    if (request.query.token && typeof request.query.token === 'string') {
      return request.query.token;
    }

    // Verificar Authorization header
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Verificar cookies
    if (request.cookies && request.cookies.access_token) {
      return request.cookies.access_token;
    }

    return null;
  }

  /**
   * Extrai IP do cliente
   * @param request Requisição HTTP
   * @returns Endereço IP
   */
  private extractClientIP(request: Request): string {
    // Verificar headers de proxy
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      return ips.split(',')[0].trim();
    }

    const realIP = request.headers['x-real-ip'];
    if (realIP && typeof realIP === 'string') {
      return realIP;
    }

    const clientIP = request.headers['x-client-ip'];
    if (clientIP && typeof clientIP === 'string') {
      return clientIP;
    }

    // Fallback para IP da conexão
    return request.ip || request.connection.remoteAddress || '127.0.0.1';
  }

  /**
   * Determina perfil do usuário baseado no payload JWT
   * @param payload Payload do JWT
   * @returns Perfil do usuário
   */
  private determineUserProfile(
    payload: any,
  ): 'default' | 'admin' | 'system' | 'premium' {
    // Verificar se é usuário do sistema
    if (payload.type === 'system' || payload.isSystem) {
      return 'system';
    }

    // Verificar roles/permissions
    const roles = payload.roles || payload.permissions || [];

    if (roles.includes('admin') || roles.includes('administrator')) {
      return 'admin';
    }

    if (roles.includes('premium') || payload.isPremium) {
      return 'premium';
    }

    return 'default';
  }

  /**
   * Adiciona headers de rate limiting à resposta
   * @param response Resposta HTTP
   * @param rateLimitResult Resultado do rate limiting
   */
  private addRateLimitHeaders(
    response: Response,
    rateLimitResult: RateLimitResult,
  ): void {
    response.setHeader('X-RateLimit-Limit', rateLimitResult.limit.toString());
    response.setHeader(
      'X-RateLimit-Remaining',
      rateLimitResult.remaining.toString(),
    );
    response.setHeader(
      'X-RateLimit-Reset',
      rateLimitResult.resetTime.toString(),
    );
    response.setHeader(
      'X-RateLimit-Window',
      rateLimitResult.windowSeconds.toString(),
    );

    if (!rateLimitResult.allowed) {
      response.setHeader('Retry-After', rateLimitResult.resetTime.toString());
    }
  }
}

/**
 * Decorator para pular rate limiting
 */
export const SkipSseRateLimit = () => SseRateLimit({ skip: true });

/**
 * Decorator para rate limiting de admin
 */
export const SseRateLimitAdmin = () => SseRateLimit({ profile: 'admin' });

/**
 * Decorator para rate limiting de sistema
 */
export const SseRateLimitSystem = () => SseRateLimit({ profile: 'system' });

/**
 * Decorator para rate limiting premium
 */
export const SseRateLimitPremium = () => SseRateLimit({ profile: 'premium' });
