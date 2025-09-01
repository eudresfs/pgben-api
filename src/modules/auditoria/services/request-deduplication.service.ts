/**
 * RequestDeduplicationService
 *
 * Serviço responsável por evitar registros duplicados de auditoria
 * para a mesma requisição HTTP processada por múltiplos interceptors.
 */

import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';

interface RequestCacheEntry {
  timestamp: number;
  processed: boolean;
}

@Injectable()
export class RequestDeduplicationService {
  private readonly logger = new Logger(RequestDeduplicationService.name);
  private readonly requestCache = new Map<string, RequestCacheEntry>();
  private readonly TTL_MS = 5 * 60 * 1000; // 5 minutos
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Inicia processo de limpeza automática do cache
    this.startCleanupProcess();
  }

  /**
   * Verifica se uma requisição já foi processada
   * @param requestContext Contexto da requisição para gerar hash único
   * @returns true se a requisição já foi processada, false caso contrário
   */
  isRequestProcessed(requestContext: {
    method: string;
    url: string;
    userId?: string;
    ip?: string;
    timestamp: number;
  }): boolean {
    const requestId = this.generateRequestId(requestContext);
    const entry = this.requestCache.get(requestId);

    if (!entry) {
      return false;
    }

    // Verifica se a entrada não expirou
    const isExpired = Date.now() - entry.timestamp > this.TTL_MS;
    if (isExpired) {
      this.requestCache.delete(requestId);
      return false;
    }

    return entry.processed;
  }

  /**
   * Marca uma requisição como processada
   * @param requestContext Contexto da requisição
   * @returns ID único da requisição
   */
  markRequestAsProcessed(requestContext: {
    method: string;
    url: string;
    userId?: string;
    ip?: string;
    timestamp: number;
  }): string {
    const requestId = this.generateRequestId(requestContext);
    
    this.requestCache.set(requestId, {
      timestamp: Date.now(),
      processed: true,
    });

    this.logger.debug(`Request marked as processed: ${requestId}`);
    return requestId;
  }

  /**
   * Gera um ID único para a requisição baseado no contexto
   * @param requestContext Contexto da requisição
   * @returns Hash único da requisição
   */
  private generateRequestId(requestContext: {
    method: string;
    url: string;
    userId?: string;
    ip?: string;
    timestamp: number;
  }): string {
    // Normaliza a URL removendo query parameters para evitar IDs diferentes
    const normalizedUrl = requestContext.url.split('?')[0];
    
    // Cria uma janela de tempo de 1 segundo para agrupar requisições simultâneas
    const timeWindow = Math.floor(requestContext.timestamp / 1000) * 1000;
    
    const contextString = [
      requestContext.method,
      normalizedUrl,
      requestContext.userId || 'anonymous',
      requestContext.ip || 'unknown',
      timeWindow.toString(),
    ].join('|');

    return createHash('sha256').update(contextString).digest('hex').substring(0, 16);
  }

  /**
   * Inicia o processo de limpeza automática do cache
   */
  private startCleanupProcess(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60 * 1000); // Executa a cada minuto

    this.logger.debug('Request deduplication cleanup process started');
  }

  /**
   * Remove entradas expiradas do cache
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [requestId, entry] of this.requestCache.entries()) {
      if (now - entry.timestamp > this.TTL_MS) {
        this.requestCache.delete(requestId);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.logger.debug(
        `Cleaned up ${removedCount} expired request entries. Cache size: ${this.requestCache.size}`,
      );
    }
  }

  /**
   * Obtém estatísticas do cache para monitoramento
   */
  getCacheStats(): {
    size: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  } {
    const entries = Array.from(this.requestCache.values());
    
    return {
      size: this.requestCache.size,
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : null,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.timestamp)) : null,
    };
  }

  /**
   * Limpa todo o cache (útil para testes)
   */
  clearCache(): void {
    this.requestCache.clear();
    this.logger.debug('Request deduplication cache cleared');
  }

  /**
   * Finaliza o serviço e limpa recursos
   */
  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clearCache();
    this.logger.debug('Request deduplication service destroyed');
  }
}