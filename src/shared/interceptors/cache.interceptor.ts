import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { CacheService } from '../services/cache.service';
import { Request, Response } from 'express';

/**
 * Interceptor de cache HTTP
 *
 * Este interceptor automatiza o cache de responses HTTP baseado em decorators,
 * melhorando significativamente a performance de endpoints frequentemente acessados.
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Verificar se o cache está habilitado para este endpoint
    const cacheOptions = this.reflector.get<CacheOptions>(
      'cache',
      context.getHandler(),
    );

    if (!cacheOptions || !this.shouldCache(request)) {
      return next.handle();
    }

    // Gerar chave de cache baseada na URL e parâmetros
    const cacheKey = this.generateCacheKey(request, cacheOptions);

    try {
      // Tentar obter do cache
      const cachedResponse = await this.cacheService.get(cacheKey);
      if (cachedResponse) {
        this.logger.debug(`Cache HIT para: ${cacheKey}`);

        // Definir headers de cache
        this.setCacheHeaders(response, true);

        return of(cachedResponse);
      }

      this.logger.debug(`Cache MISS para: ${cacheKey}`);

      // Se não estiver no cache, executar o handler e armazenar o resultado
      return next.handle().pipe(
        tap(async (data) => {
          if (this.isSuccessResponse(response) && data) {
            await this.cacheService.set(cacheKey, data, cacheOptions.ttl);
            this.setCacheHeaders(response, false);
            this.logger.debug(`Resultado armazenado no cache: ${cacheKey}`);
          }
        }),
      );
    } catch (error) {
      this.logger.error(
        `Erro no cache interceptor: ${error.message}`,
        error.stack,
      );
      return next.handle();
    }
  }

  /**
   * Verifica se a requisição deve ser cacheada
   */
  private shouldCache(request: Request): boolean {
    // Apenas cachear requisições GET
    if (request.method !== 'GET') {
      return false;
    }

    // Não cachear se houver headers que indicam dados dinâmicos
    const authHeader = request.headers.authorization;
    if (authHeader && this.isUserSpecificRequest(request)) {
      return false;
    }

    return true;
  }

  /**
   * Verifica se é uma requisição específica do usuário
   */
  private isUserSpecificRequest(request: Request): boolean {
    const userSpecificPaths = [
      '/profile',
      '/me',
      '/dashboard',
      '/notifications',
    ];

    return userSpecificPaths.some((path) => request.path.includes(path));
  }

  /**
   * Gera chave de cache baseada na requisição
   */
  private generateCacheKey(request: Request, options: CacheOptions): string {
    const baseKey = `http:${request.method}:${request.path}`;

    // Incluir query parameters se especificado
    if (options.includeQuery && Object.keys(request.query).length > 0) {
      const sortedQuery = Object.keys(request.query)
        .sort()
        .map((key) => `${key}=${request.query[key]}`)
        .join('&');
      return `${baseKey}?${sortedQuery}`;
    }

    // Incluir parâmetros de rota
    if (request.params && Object.keys(request.params).length > 0) {
      const params = Object.values(request.params).join(':');
      return `${baseKey}:${params}`;
    }

    return baseKey;
  }

  /**
   * Verifica se a response é de sucesso
   */
  private isSuccessResponse(response: Response): boolean {
    return response.statusCode >= 200 && response.statusCode < 300;
  }

  /**
   * Define headers de cache na response
   */
  private setCacheHeaders(response: Response, fromCache: boolean): void {
    if (fromCache) {
      response.setHeader('X-Cache', 'HIT');
      response.setHeader('X-Cache-Source', 'memory');
    } else {
      response.setHeader('X-Cache', 'MISS');
    }

    // Definir headers de controle de cache
    response.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutos
    response.setHeader('Vary', 'Accept-Encoding');
  }
}

/**
 * Interface para opções de cache
 */
export interface CacheOptions {
  ttl?: number; // Time to live em milissegundos
  includeQuery?: boolean; // Incluir query parameters na chave
  key?: string; // Chave customizada
}

/**
 * Decorator para habilitar cache em endpoints
 */
export const Cacheable = (options: CacheOptions = {}) => {
  const defaultOptions: CacheOptions = {
    ttl: 300000, // 5 minutos
    includeQuery: true,
    ...options,
  };

  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata('cache', defaultOptions, descriptor.value);
    return descriptor;
  };
};

/**
 * Decorator para cache de longa duração (1 hora)
 */
export const CacheableLong = (options: Partial<CacheOptions> = {}) => {
  return Cacheable({
    ttl: 3600000, // 1 hora
    ...options,
  });
};

/**
 * Decorator para cache de curta duração (1 minuto)
 */
export const CacheableShort = (options: Partial<CacheOptions> = {}) => {
  return Cacheable({
    ttl: 60000, // 1 minuto
    ...options,
  });
};
