import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

/**
 * Interceptor que gerencia cache automaticamente para operações CRUD
 * - Invalida cache após operações de modificação (create, update, delete)
 * - Gera chaves de cache baseadas no contexto da operação
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);
  private readonly CACHE_TTL = 300; // 5 minutos

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
    const controller = context.getClass();
    const methodName = handler.name;
    const controllerName = controller.name;

    return next.handle().pipe(
      tap(async (result) => {
        try {
          // Para operações que modificam dados, invalida cache relacionado
          if (['create', 'update', 'delete'].includes(methodName)) {
            await this.invalidateRelatedCache(
              controllerName,
              methodName,
              result,
            );
          }
        } catch (error) {
          // Log do erro mas não falha a operação principal
          this.logger.error(
            `Erro ao gerenciar cache para ${controllerName}.${methodName}:`,
            error.stack,
          );
        }
      }),
    );
  }

  /**
   * Invalida cache relacionado baseado na operação realizada
   */
  private async invalidateRelatedCache(
    controllerName: string,
    methodName: string,
    result: any,
  ): Promise<void> {
    const patterns = this.generateCachePatterns(controllerName, result);

    for (const pattern of patterns) {
      try {
        // Para cache-manager, precisamos deletar chaves específicas
        // Como não temos pattern matching nativo, deletamos chaves conhecidas
        await this.deleteCacheByPattern(pattern);

        this.logger.debug(`Cache invalidado para padrão: ${pattern}`);
      } catch (error) {
        this.logger.warn(`Erro ao invalidar cache ${pattern}:`, error.message);
      }
    }
  }

  /**
   * Gera padrões de chave de cache para invalidação
   */
  private generateCachePatterns(controllerName: string, result: any): string[] {
    const patterns: string[] = [];
    const baseKey = this.getBaseKeyFromController(controllerName);

    if (!baseKey) {
      return patterns;
    }

    // Padrões comuns de cache para invalidar
    patterns.push(`${baseKey}:list:*`);
    patterns.push(`${baseKey}:findAll:*`);

    // Se temos ID do resultado, invalida cache específico
    if (result?.id) {
      patterns.push(`${baseKey}:${result.id}`);
      patterns.push(`${baseKey}:findOne:${result.id}`);
    }

    // Se temos solicitacao_id, invalida cache relacionado
    if (result?.solicitacao_id) {
      patterns.push(`${baseKey}:solicitacao:${result.solicitacao_id}`);
      patterns.push(`${baseKey}:findBySolicitacao:${result.solicitacao_id}`);
    }

    return patterns;
  }

  /**
   * Mapeia nome do controller para chave base do cache
   */
  private getBaseKeyFromController(controllerName: string): string | null {
    const mapping: Record<string, string> = {
      DadosBeneficioController: 'dados-beneficio',
      DadosAluguelSocialController: 'dados-aluguel-social',
      DadosCestaBasicaController: 'dados-cesta-basica',
      DadosFuneralController: 'dados-funeral',
      DadosNatalidadeController: 'dados-natalidade',
    };

    return mapping[controllerName] || null;
  }

  /**
   * Deleta cache por padrão (implementação simplificada)
   * Em produção, considere usar Redis com SCAN para patterns complexos
   */
  private async deleteCacheByPattern(pattern: string): Promise<void> {
    // Para cache-manager básico, deletamos chaves conhecidas
    // Em ambiente com Redis, poderia usar SCAN + DEL com patterns

    if (pattern.includes('*')) {
      // Para padrões com wildcard, tentamos algumas chaves comuns
      const basePattern = pattern.replace(':*', '');

      // Tenta deletar algumas variações comuns
      const commonSuffixes = ['', ':page:1', ':page:2', ':page:3'];

      for (const suffix of commonSuffixes) {
        try {
          await this.cacheManager.del(`${basePattern}${suffix}`);
        } catch {
          // Ignora erros de chaves que não existem
        }
      }
    } else {
      // Para chaves específicas, deleta diretamente
      await this.cacheManager.del(pattern);
    }
  }

  /**
   * Gera chave de cache para operações de leitura
   */
  static generateCacheKey(
    entityName: string,
    operation: string,
    params: Record<string, any> = {},
  ): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}:${params[key]}`)
      .join(':');

    return sortedParams
      ? `${entityName}:${operation}:${sortedParams}`
      : `${entityName}:${operation}`;
  }
}
