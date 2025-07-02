import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request } from 'express';
import { PagamentoCacheService } from '../services/pagamento-cache.service';
import { CacheService } from '../../../shared/cache/cache.service';

/**
 * Interceptor de performance otimizado com execução condicional
 * Aplica otimizações baseadas no contexto da requisição
 */
@Injectable()
export class PagamentoPerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PagamentoPerformanceInterceptor.name);
  private readonly CACHE_TTL = 300; // 5 minutos
  private readonly SLOW_QUERY_THRESHOLD = 1000; // 1 segundo

  // Rotas que devem ser otimizadas com cache
  private readonly CACHEABLE_ROUTES = [
    '/pagamentos',
    '/pagamentos/estatisticas',
    '/pagamentos/relatorios',
  ];

  // Rotas que devem ter validação otimizada
  private readonly VALIDATION_ROUTES = [
    '/pagamentos',
    '/pagamentos/liberar',
    '/pagamentos/cancelar',
  ];

  // Rotas que devem ter logging detalhado
  private readonly MONITORED_ROUTES = [
    '/pagamentos/liberar',
    '/pagamentos/cancelar',
    '/comprovantes/validar',
  ];

  constructor(
    private readonly cacheService: CacheService,
    private readonly pagamentoCacheService: PagamentoCacheService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();
    const { method, url, body, query, params } = request;

    const startTime = Date.now();
    const requestId = this.generateRequestId();

    // Determinar se deve aplicar otimizações
    const shouldCache = this.shouldApplyCache(method, url);
    const shouldValidate = this.shouldApplyValidation(url);
    const shouldMonitor = this.shouldApplyMonitoring(url);

    // Log inicial apenas para rotas monitoradas
    if (shouldMonitor) {
      this.logger.log(`[${requestId}] ${method} ${url} - Iniciado`);
    }

    // Aplicar cache se necessário
    if (shouldCache && method === 'GET') {
      return this.handleCachedRequest(request, next, requestId, startTime);
    }

    // Aplicar validação otimizada se necessário
    if (shouldValidate && ['POST', 'PUT', 'PATCH'].includes(method)) {
      return this.handleValidatedRequest(
        request,
        next,
        requestId,
        startTime,
        shouldMonitor,
      );
    }

    // Execução normal com monitoramento condicional
    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;

        if (shouldMonitor || duration > this.SLOW_QUERY_THRESHOLD) {
          this.logger.log(
            `[${requestId}] ${method} ${url} - Concluído em ${duration}ms`,
          );

          if (duration > this.SLOW_QUERY_THRESHOLD) {
            this.logger.warn(
              `[${requestId}] Consulta lenta detectada: ${duration}ms`,
            );
          }
        }

        // Adicionar headers de performance
        response.setHeader('X-Response-Time', `${duration}ms`);
        response.setHeader('X-Request-ID', requestId);
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;

        if (shouldMonitor) {
          this.logger.error(
            `[${requestId}] ${method} ${url} - Erro em ${duration}ms: ${error.message}`,
          );
        }

        response.setHeader('X-Response-Time', `${duration}ms`);
        response.setHeader('X-Request-ID', requestId);

        throw error;
      }),
    );
  }

  /**
   * Manipula requisições com cache
   */
  private handleCachedRequest(
    request: Request,
    next: CallHandler,
    requestId: string,
    startTime: number,
  ): Observable<any> {
    const cacheKey = this.generateCacheKey(request);

    return new Observable((observer) => {
      this.cacheService
        .get(cacheKey)
        .then((cachedData) => {
          if (cachedData) {
            const duration = Date.now() - startTime;
            this.logger.log(
              `[${requestId}] Cache hit - Respondido em ${duration}ms`,
            );

            observer.next(cachedData);
            observer.complete();
          } else {
            // Cache miss - executar e armazenar
            next
              .handle()
              .pipe(
                tap((data) => {
                  const duration = Date.now() - startTime;

                  // Armazenar no cache apenas se a resposta for bem-sucedida
                  if (data && !data.error) {
                    this.cacheService
                      .set(cacheKey, data, this.CACHE_TTL)
                      .catch((error) => {
                        this.logger.warn(
                          `Erro ao armazenar no cache: ${error.message}`,
                        );
                      });
                  }

                  this.logger.log(
                    `[${requestId}] Cache miss - Executado em ${duration}ms`,
                  );
                }),
              )
              .subscribe({
                next: (data) => {
                  observer.next(data);
                  observer.complete();
                },
                error: (error) => {
                  observer.error(error);
                },
              });
          }
        })
        .catch((error) => {
          this.logger.warn(`Erro ao acessar cache: ${error.message}`);
          // Fallback para execução normal
          next.handle().subscribe({
            next: (data) => {
              observer.next(data);
              observer.complete();
            },
            error: (error) => {
              observer.error(error);
            },
          });
        });
    });
  }

  /**
   * Manipula requisições com validação otimizada
   */
  private handleValidatedRequest(
    request: Request,
    next: CallHandler,
    requestId: string,
    startTime: number,
    shouldMonitor: boolean,
  ): Observable<any> {
    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;

        if (shouldMonitor) {
          this.logger.log(
            `[${requestId}] Validação concluída em ${duration}ms`,
          );
        }

        // Invalidar cache relacionado após operações de escrita
        this.invalidateRelatedCache(request.url, request.body).catch(
          (error) => {
            this.logger.warn(`Erro ao invalidar cache: ${error.message}`);
          },
        );
      }),
    );
  }

  /**
   * Determina se deve aplicar cache
   */
  private shouldApplyCache(method: string, url: string): boolean {
    return (
      method === 'GET' &&
      this.CACHEABLE_ROUTES.some((route) => url.includes(route))
    );
  }

  /**
   * Determina se deve aplicar validação otimizada
   */
  private shouldApplyValidation(url: string): boolean {
    return this.VALIDATION_ROUTES.some((route) => url.includes(route));
  }

  /**
   * Determina se deve aplicar monitoramento
   */
  private shouldApplyMonitoring(url: string): boolean {
    return this.MONITORED_ROUTES.some((route) => url.includes(route));
  }

  /**
   * Gera chave de cache baseada na requisição
   */
  private generateCacheKey(request: Request): string {
    const { url, query, params } = request;
    const userId = request.user?.id || 'anonymous';

    return `pagamento:${url}:${userId}:${JSON.stringify({ query, params })}`;
  }

  /**
   * Gera ID único para a requisição
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Invalida cache relacionado após operações de escrita
   */
  private async invalidateRelatedCache(url: string, body: any): Promise<void> {
    try {
      if (url.includes('/pagamentos')) {
        // TODO: Implementar invalidação de cache por padrão
        // await this.cacheService.clear(); // Alternativa temporária

        // Invalidar cache de validações se necessário
        if (body?.status || body?.metodo_pagamento) {
          await this.pagamentoCacheService.invalidateValidationCache();
        }
      }

      if (url.includes('/comprovantes')) {
        // TODO: Implementar invalidação de cache por padrão
        // await this.cacheService.clear(); // Alternativa temporária
      }
    } catch (error) {
      this.logger.warn(`Erro ao invalidar cache relacionado: ${error.message}`);
    }
  }
}
