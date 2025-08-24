import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CacheService } from '../../../shared/cache/cache.service';
import { PagamentoCacheService } from './pagamento-cache.service';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { MetodoPagamentoEnum } from '../../../enums/metodo-pagamento.enum';

/**
 * Eventos de invalidação de cache
 */
export interface PagamentoCacheInvalidationEvent {
  pagamentoId: string;
  action: 'create' | 'update' | 'delete' | 'status_change' | 'cancelled';
  oldStatus?: StatusPagamentoEnum;
  newStatus?: StatusPagamentoEnum;
  solicitacaoId?: string;
  concessaoId?: string;
  metadata?: Record<string, any>;
}

/**
 * Serviço especializado para invalidação inteligente de cache de pagamentos
 *
 * Implementa estratégias de invalidação baseadas em:
 * - Padrões de chave (cache tags)
 * - Eventos de domínio
 * - Relacionamentos entre entidades
 * - Impacto em estatísticas e agregações
 *
 * Arquitetura Event-Driven para desacoplamento e performance
 */
@Injectable()
export class PagamentoCacheInvalidationService {
  private readonly logger = new Logger(PagamentoCacheInvalidationService.name);

  // Padrões de cache que devem ser invalidados por tipo de operação
  private readonly CACHE_PATTERNS = {
    // Cache de listagens e paginação
    LISTINGS: [
      'pagamento:pagamentos:*',
      'pagamento:list:*',
      'pagamento:search:*',
    ],

    // Cache de estatísticas e agregações
    STATISTICS: [
      'pagamento:estatisticas:*',
      'pagamento:stats:*',
      'pagamento:count:*',
      'pagamento:summary:*',
    ],

    // Cache de validações
    VALIDATIONS: [
      'status_transition:*',
      'pix_validation:*',
      'dados_bancarios:*',
      'metodo_pagamento:*',
      'valor_limites:*',
    ],

    // Cache específico por entidade
    ENTITY_SPECIFIC: (id: string) => [
      `pagamento:${id}:*`,
      `pagamento:${id}`,
      `pagamento:details:${id}:*`,
    ],

    // Cache por relacionamentos
    RELATIONSHIPS: {
      SOLICITACAO: (solicitacaoId: string) => [
        `pagamento:solicitacao:${solicitacaoId}:*`,
        `pagamentos:by_solicitacao:${solicitacaoId}:*`,
      ],
      CONCESSAO: (concessaoId: string) => [
        `pagamento:concessao:${concessaoId}:*`,
        `pagamentos:by_concessao:${concessaoId}:*`,
      ],
    },
  };

  // TTL para diferentes tipos de cache (em segundos)
  private readonly CACHE_TTL = {
    LISTINGS: 300, // 5 minutos
    STATISTICS: 1800, // 30 minutos
    VALIDATIONS: 600, // 10 minutos
    ENTITY: 600, // 10 minutos
    RELATIONSHIPS: 900, // 15 minutos
  };

  constructor(
    private readonly cacheService: CacheService,
    private readonly pagamentoCacheService: PagamentoCacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.setupEventListeners();
  }

  /**
   * Configura listeners para eventos de invalidação automática
   */
  private setupEventListeners(): void {
    // Listener para criação de pagamentos
    this.eventEmitter.on(
      'pagamento.created',
      (event: PagamentoCacheInvalidationEvent) => {
        this.handlePagamentoCreated(event);
      },
    );

    // Listener para atualização de pagamentos
    this.eventEmitter.on(
      'pagamento.updated',
      (event: PagamentoCacheInvalidationEvent) => {
        this.handlePagamentoUpdated(event);
      },
    );

    // Listener para mudança de status
    this.eventEmitter.on(
      'pagamento.status_changed',
      (event: PagamentoCacheInvalidationEvent) => {
        this.handleStatusChanged(event);
      },
    );

    // Listener para cancelamento
    this.eventEmitter.on(
      'pagamento.cancelled',
      (event: PagamentoCacheInvalidationEvent) => {
        this.handlePagamentoCancelled(event);
      },
    );

    // Listener para exclusão
    this.eventEmitter.on(
      'pagamento.deleted',
      (event: PagamentoCacheInvalidationEvent) => {
        this.handlePagamentoDeleted(event);
      },
    );
  }

  /**
   * Invalida cache após criação de pagamento
   */
  private async handlePagamentoCreated(
    event: PagamentoCacheInvalidationEvent,
  ): Promise<void> {
    try {
      this.logger.log(
        `Invalidando cache após criação do pagamento ${event.pagamentoId}`,
      );

      // Invalidar listagens e estatísticas (novos dados afetam agregações)
      await this.invalidatePatterns(this.CACHE_PATTERNS.LISTINGS);
      await this.invalidatePatterns(this.CACHE_PATTERNS.STATISTICS);

      // Invalidar cache de relacionamentos se aplicável
      if (event.solicitacaoId) {
        await this.invalidatePatterns(
          this.CACHE_PATTERNS.RELATIONSHIPS.SOLICITACAO(event.solicitacaoId),
        );
      }

      if (event.concessaoId) {
        await this.invalidatePatterns(
          this.CACHE_PATTERNS.RELATIONSHIPS.CONCESSAO(event.concessaoId),
        );
      }

      this.logger.debug(
        `Cache invalidado após criação do pagamento ${event.pagamentoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao invalidar cache após criação: ${error.message}`,
      );
    }
  }

  /**
   * Invalida cache após atualização de pagamento
   */
  private async handlePagamentoUpdated(
    event: PagamentoCacheInvalidationEvent,
  ): Promise<void> {
    try {
      this.logger.log(
        `Invalidando cache após atualização do pagamento ${event.pagamentoId}`,
      );

      // Invalidar cache específico da entidade
      await this.invalidatePatterns(
        this.CACHE_PATTERNS.ENTITY_SPECIFIC(event.pagamentoId),
      );

      // Invalidar listagens (dados podem ter mudado)
      await this.invalidatePatterns(this.CACHE_PATTERNS.LISTINGS);

      // Invalidar estatísticas se mudanças podem afetar agregações
      await this.invalidatePatterns(this.CACHE_PATTERNS.STATISTICS);

      // Invalidar cache de validações relacionadas
      await this.pagamentoCacheService.invalidateValidationCache(
        event.pagamentoId,
      );

      this.logger.debug(
        `Cache invalidado após atualização do pagamento ${event.pagamentoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao invalidar cache após atualização: ${error.message}`,
      );
    }
  }

  /**
   * Invalida cache após mudança de status
   */
  private async handleStatusChanged(
    event: PagamentoCacheInvalidationEvent,
  ): Promise<void> {
    try {
      this.logger.log(
        `Invalidando cache após mudança de status do pagamento ${event.pagamentoId}: ` +
          `${event.oldStatus} → ${event.newStatus}`,
      );

      // Invalidar cache específico da entidade
      await this.invalidatePatterns(
        this.CACHE_PATTERNS.ENTITY_SPECIFIC(event.pagamentoId),
      );

      // Invalidar listagens e estatísticas (status afeta agregações)
      await this.invalidatePatterns(this.CACHE_PATTERNS.LISTINGS);
      await this.invalidatePatterns(this.CACHE_PATTERNS.STATISTICS);

      // Invalidar validações de transição de status
      await this.invalidateStatusTransitionCache(
        event.oldStatus,
        event.newStatus,
      );

      this.logger.debug(
        `Cache invalidado após mudança de status do pagamento ${event.pagamentoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao invalidar cache após mudança de status: ${error.message}`,
      );
    }
  }

  /**
   * Invalida cache após cancelamento de pagamento
   */
  private async handlePagamentoCancelled(
    event: PagamentoCacheInvalidationEvent,
  ): Promise<void> {
    try {
      this.logger.log(
        `Invalidando cache após cancelamento do pagamento ${event.pagamentoId}`,
      );

      // Cancelamento é uma mudança crítica que afeta muitas agregações
      await this.invalidatePatterns(
        this.CACHE_PATTERNS.ENTITY_SPECIFIC(event.pagamentoId),
      );
      await this.invalidatePatterns(this.CACHE_PATTERNS.LISTINGS);
      await this.invalidatePatterns(this.CACHE_PATTERNS.STATISTICS);

      // Invalidar cache de validações
      await this.pagamentoCacheService.invalidateValidationCache(
        event.pagamentoId,
      );

      this.logger.debug(
        `Cache invalidado após cancelamento do pagamento ${event.pagamentoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao invalidar cache após cancelamento: ${error.message}`,
      );
    }
  }

  /**
   * Invalida cache após exclusão de pagamento
   */
  private async handlePagamentoDeleted(
    event: PagamentoCacheInvalidationEvent,
  ): Promise<void> {
    try {
      this.logger.log(
        `Invalidando cache após exclusão do pagamento ${event.pagamentoId}`,
      );

      // Exclusão requer invalidação completa
      await this.invalidatePatterns(
        this.CACHE_PATTERNS.ENTITY_SPECIFIC(event.pagamentoId),
      );
      await this.invalidatePatterns(this.CACHE_PATTERNS.LISTINGS);
      await this.invalidatePatterns(this.CACHE_PATTERNS.STATISTICS);
      await this.invalidatePatterns(this.CACHE_PATTERNS.VALIDATIONS);

      this.logger.debug(
        `Cache invalidado após exclusão do pagamento ${event.pagamentoId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao invalidar cache após exclusão: ${error.message}`,
      );
    }
  }

  /**
   * Invalida cache de transições de status específicas
   */
  private async invalidateStatusTransitionCache(
    oldStatus?: StatusPagamentoEnum,
    newStatus?: StatusPagamentoEnum,
  ): Promise<void> {
    if (!oldStatus || !newStatus) return;

    try {
      const transitionKeys = [
        `status_transition:${oldStatus}:${newStatus}`,
        `status_transition:${newStatus}:*`,
        `status_transition:*:${newStatus}`,
      ];

      for (const key of transitionKeys) {
        await this.cacheService.del(key);
      }
    } catch (error) {
      this.logger.warn(
        `Erro ao invalidar cache de transição de status: ${error.message}`,
      );
    }
  }

  /**
   * Invalida múltiplos padrões de cache
   */
  private async invalidatePatterns(patterns: string[]): Promise<void> {
    const invalidationPromises = patterns.map((pattern) =>
      this.invalidateByPattern(pattern),
    );

    await Promise.allSettled(invalidationPromises);
  }

  /**
   * Invalida cache por padrão usando estratégia otimizada
   */
  private async invalidateByPattern(pattern: string): Promise<void> {
    try {
      // Converter padrão wildcard para chaves específicas conhecidas
      const specificKeys = this.generateSpecificKeysFromPattern(pattern);

      // Invalidar chaves específicas
      const deletionPromises = specificKeys.map((key) =>
        this.cacheService.del(key).catch(() => {
          // Ignorar erros de chaves que não existem
        }),
      );

      await Promise.allSettled(deletionPromises);

      this.logger.debug(`Padrão de cache invalidado: ${pattern}`);
    } catch (error) {
      this.logger.warn(`Erro ao invalidar padrão ${pattern}: ${error.message}`);
    }
  }

  /**
   * Gera chaves específicas a partir de um padrão wildcard
   */
  private generateSpecificKeysFromPattern(pattern: string): string[] {
    const keys: string[] = [];

    // Remover wildcard e gerar variações comuns
    const basePattern = pattern.replace(/:\*$/, '');

    // Chaves comuns para listagens
    if (pattern.includes('pagamentos:') || pattern.includes('list:')) {
      for (let page = 1; page <= 10; page++) {
        keys.push(`${basePattern}:page:${page}`);
        keys.push(`${basePattern}:page:${page}:limit:10`);
        keys.push(`${basePattern}:page:${page}:limit:20`);
        keys.push(`${basePattern}:page:${page}:limit:50`);
      }

      // Chaves de filtros comuns
      Object.values(StatusPagamentoEnum).forEach((status) => {
        keys.push(`${basePattern}:status:${status}`);
      });

      keys.push(`${basePattern}:all`);
      keys.push(`${basePattern}:count`);
    }

    // Chaves comuns para estatísticas
    if (pattern.includes('estatisticas:') || pattern.includes('stats:')) {
      keys.push(`${basePattern}:total`);
      keys.push(`${basePattern}:by_status`);
      keys.push(`${basePattern}:by_method`);
      keys.push(`${basePattern}:monthly`);
      keys.push(`${basePattern}:daily`);
    }

    // Adicionar padrão base sem sufixo
    keys.push(basePattern);

    return keys;
  }

  /**
   * API pública para invalidação manual de cache
   */
  async invalidatePagamentoCache(pagamentoId: string): Promise<void> {
    await this.invalidatePatterns(
      this.CACHE_PATTERNS.ENTITY_SPECIFIC(pagamentoId),
    );
  }

  /**
   * API pública para invalidação de cache por solicitação
   */
  async invalidateSolicitacaoCache(solicitacaoId: string): Promise<void> {
    await this.invalidatePatterns(
      this.CACHE_PATTERNS.RELATIONSHIPS.SOLICITACAO(solicitacaoId),
    );
  }

  /**
   * API pública para invalidação de cache por concessão
   */
  async invalidateConcessaoCache(concessaoId: string): Promise<void> {
    await this.invalidatePatterns(
      this.CACHE_PATTERNS.RELATIONSHIPS.CONCESSAO(concessaoId),
    );
  }

  /**
   * API pública para invalidação completa de cache de pagamentos
   */
  async invalidateAllPagamentoCache(): Promise<void> {
    this.logger.log('Invalidando todo o cache de pagamentos');

    await Promise.allSettled([
      this.invalidatePatterns(this.CACHE_PATTERNS.LISTINGS),
      this.invalidatePatterns(this.CACHE_PATTERNS.STATISTICS),
      this.invalidatePatterns(this.CACHE_PATTERNS.VALIDATIONS),
    ]);

    this.logger.log('Cache completo de pagamentos invalidado');
  }

  /**
   * Emite evento de invalidação para processamento assíncrono
   */
  emitCacheInvalidationEvent(event: PagamentoCacheInvalidationEvent): void {
    const eventName = `pagamento.${event.action}`;
    this.eventEmitter.emit(eventName, event);

    this.logger.debug(
      `Evento de invalidação emitido: ${eventName} para pagamento ${event.pagamentoId}`,
    );
  }

  /**
   * Obtém estatísticas de invalidação de cache
   */
  async getCacheInvalidationStats(): Promise<{
    totalInvalidations: number;
    invalidationsByType: Record<string, number>;
    lastInvalidation: Date | null;
  }> {
    // TODO: Implementar persistência de métricas de invalidação
    return {
      totalInvalidations: 0,
      invalidationsByType: {},
      lastInvalidation: null,
    };
  }
}
