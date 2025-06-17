import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import {
  SseNotification,
  StoredSseEvent,
  EventReplayRequest,
  EventReplayResponse,
} from '../interfaces/sse-notification.interface';
import { createRedisInstance } from '../../../config/redis.config';
import { SseConfig, SSE_CONFIG } from '../../../config/sse.config';

/**
 * Serviço para armazenamento e recuperação de eventos SSE
 * 
 * Responsabilidades:
 * - Armazenar eventos SSE com TTL para recuperação
 * - Implementar sistema de Last-Event-ID
 * - Fornecer replay de eventos perdidos durante desconexões
 * - Gerenciar sequenciamento de eventos por usuário
 * - Cleanup automático de eventos expirados
 */
@Injectable()
export class SseEventStoreService {
  private readonly logger = new Logger(SseEventStoreService.name);
  
  private redis: Redis;
  
  // Prefixos para organização das chaves Redis
  private readonly EVENT_PREFIX = 'sse:event';
  private readonly USER_EVENTS_PREFIX = 'sse:user_events';
  private readonly SEQUENCE_PREFIX = 'sse:sequence';
  private readonly LAST_EVENT_PREFIX = 'sse:last_event';
  
  // TTL padrão para eventos (2 horas)
  private readonly DEFAULT_EVENT_TTL = 2 * 60 * 60; // 2 horas em segundos
  
  // Limite máximo de eventos por usuário
  private readonly MAX_EVENTS_PER_USER = 1000;
  
  constructor(
    private readonly configService: ConfigService,
    @Inject(SSE_CONFIG) private readonly sseConfig: SseConfig,
  ) {
    this.initializeRedis();
  }
  
  private async initializeRedis() {
    try {
      this.redis = createRedisInstance(this.configService);
      this.logger.log('✅ SseEventStoreService Redis inicializado');
    } catch (error) {
      this.logger.error('❌ Erro ao inicializar Redis no SseEventStoreService:', error);
      throw error;
    }
  }
  
  /**
   * Armazena um evento SSE para possível recuperação futura
   */
  async storeEvent(
    notification: SseNotification,
    ttl: number = this.DEFAULT_EVENT_TTL
  ): Promise<StoredSseEvent> {
    try {
      const eventId = this.generateEventId();
      const sequence = await this.getNextSequence(notification.userId);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttl * 1000);
      
      const storedEvent: StoredSseEvent = {
        eventId,
        userId: notification.userId,
        notification: {
          ...notification,
          lastEventId: eventId,
          eventSequence: sequence,
          eventTtl: ttl,
        },
        createdAt: now,
        expiresAt,
        sequence,
        status: 'pending',
      };
      
      // Armazenar evento individual
      const eventKey = `${this.EVENT_PREFIX}:${eventId}`;
      await this.redis.setex(
        eventKey,
        ttl,
        JSON.stringify(storedEvent)
      );
      
      // Adicionar à lista de eventos do usuário (sorted set por sequence)
      const userEventsKey = `${this.USER_EVENTS_PREFIX}:${notification.userId}`;
      await this.redis.zadd(userEventsKey, sequence, eventId);
      await this.redis.expire(userEventsKey, ttl);
      
      // Atualizar último evento do usuário
      const lastEventKey = `${this.LAST_EVENT_PREFIX}:${notification.userId}`;
      await this.redis.setex(
        lastEventKey,
        ttl,
        JSON.stringify({
          eventId,
          sequence,
          timestamp: now.toISOString(),
        })
      );
      
      // Limitar número de eventos por usuário
      await this.limitUserEvents(notification.userId);
      
      this.logger.debug(
        `📦 Evento armazenado: ${eventId} para usuário ${notification.userId} (seq: ${sequence})`
      );
      
      return storedEvent;
    } catch (error) {
      this.logger.error('❌ Erro ao armazenar evento SSE:', error);
      throw error;
    }
  }
  
  /**
   * Recupera eventos perdidos para um usuário
   */
  async replayEvents(request: EventReplayRequest): Promise<EventReplayResponse> {
    try {
      const { userId, lastEventId, since, limit = 50 } = request;
      
      let startSequence = 0;
      
      // Se lastEventId foi fornecido, encontrar a sequência correspondente
      if (lastEventId) {
        const lastEvent = await this.getEventById(lastEventId);
        if (lastEvent && lastEvent.userId === userId) {
          startSequence = lastEvent.sequence + 1;
        }
      }
      
      // Se timestamp foi fornecido, encontrar eventos a partir dessa data
      if (since && !lastEventId) {
        startSequence = await this.findSequenceByTimestamp(userId, since);
      }
      
      // Buscar eventos do usuário a partir da sequência
      const userEventsKey = `${this.USER_EVENTS_PREFIX}:${userId}`;
      const eventIds = await this.redis.zrangebyscore(
        userEventsKey,
        startSequence,
        '+inf',
        'LIMIT',
        0,
        limit
      );
      
      // Recuperar dados completos dos eventos
      const events: StoredSseEvent[] = [];
      for (const eventId of eventIds) {
        const event = await this.getEventById(eventId);
        if (event && event.status !== 'expired') {
          events.push(event);
        }
      }
      
      // Verificar se há mais eventos disponíveis
      const totalCount = await this.redis.zcount(
        userEventsKey,
        startSequence,
        '+inf'
      );
      const hasMore = totalCount > limit;
      
      const response: EventReplayResponse = {
        events,
        totalEvents: events.length,
        hasMore,
        lastEventId: events.length > 0 ? events[events.length - 1].eventId : undefined,
        timestamp: new Date(),
      };
      
      this.logger.debug(
        `🔄 Replay de eventos para usuário ${userId}: ${events.length} eventos recuperados`
      );
      
      return response;
    } catch (error) {
      this.logger.error('❌ Erro ao recuperar eventos:', error);
      throw error;
    }
  }
  
  /**
   * Marca um evento como entregue
   */
  async markEventAsDelivered(eventId: string): Promise<void> {
    try {
      const event = await this.getEventById(eventId);
      if (event) {
        event.status = 'delivered';
        const eventKey = `${this.EVENT_PREFIX}:${eventId}`;
        const ttl = await this.redis.ttl(eventKey);
        
        if (ttl > 0) {
          await this.redis.setex(
            eventKey,
            ttl,
            JSON.stringify(event)
          );
        }
      }
    } catch (error) {
      this.logger.error(`❌ Erro ao marcar evento ${eventId} como entregue:`, error);
    }
  }
  
  /**
   * Obtém o último evento de um usuário
   */
  async getLastEventId(userId: string): Promise<string | null> {
    try {
      const lastEventKey = `${this.LAST_EVENT_PREFIX}:${userId}`;
      const lastEventData = await this.redis.get(lastEventKey);
      
      if (lastEventData) {
        const parsed = JSON.parse(lastEventData);
        return parsed.eventId;
      }
      
      return null;
    } catch (error) {
      this.logger.error(`❌ Erro ao obter último evento do usuário ${userId}:`, error);
      return null;
    }
  }
  
  /**
   * Limpa eventos expirados
   */
  async cleanupExpiredEvents(): Promise<number> {
    try {
      let cleanedCount = 0;
      const pattern = `${this.EVENT_PREFIX}:*`;
      
      // Usar SCAN para iterar sobre as chaves de forma eficiente
      const stream = this.redis.scanStream({
        match: pattern,
        count: 100,
      });
      
      for await (const keys of stream) {
        for (const key of keys) {
          const ttl = await this.redis.ttl(key);
          if (ttl === -2) { // Chave expirada
            cleanedCount++;
          }
        }
      }
      
      if (cleanedCount > 0) {
        this.logger.log(`🧹 Limpeza automática: ${cleanedCount} eventos expirados removidos`);
      }
      
      return cleanedCount;
    } catch (error) {
      this.logger.error('❌ Erro durante limpeza de eventos expirados:', error);
      return 0;
    }
  }
  
  /**
   * Obtém estatísticas do armazenamento de eventos
   */
  async getStorageStats(): Promise<{
    totalEvents: number;
    eventsByUser: Record<string, number>;
    oldestEvent: Date | null;
    newestEvent: Date | null;
  }> {
    try {
      const pattern = `${this.EVENT_PREFIX}:*`;
      let totalEvents = 0;
      const eventsByUser: Record<string, number> = {};
      let oldestEvent: Date | null = null;
      let newestEvent: Date | null = null;
      
      const stream = this.redis.scanStream({
        match: pattern,
        count: 100,
      });
      
      for await (const keys of stream) {
        for (const key of keys) {
          const eventData = await this.redis.get(key);
          if (eventData) {
            const event: StoredSseEvent = JSON.parse(eventData);
            totalEvents++;
            
            // Contar por usuário
            eventsByUser[event.userId] = (eventsByUser[event.userId] || 0) + 1;
            
            // Rastrear datas mais antigas e mais recentes
            if (!oldestEvent || event.createdAt < oldestEvent) {
              oldestEvent = event.createdAt;
            }
            if (!newestEvent || event.createdAt > newestEvent) {
              newestEvent = event.createdAt;
            }
          }
        }
      }
      
      return {
        totalEvents,
        eventsByUser,
        oldestEvent,
        newestEvent,
      };
    } catch (error) {
      this.logger.error('❌ Erro ao obter estatísticas de armazenamento:', error);
      return {
        totalEvents: 0,
        eventsByUser: {},
        oldestEvent: null,
        newestEvent: null,
      };
    }
  }
  
  // Métodos privados
  
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private async getNextSequence(userId: string): Promise<number> {
    const sequenceKey = `${this.SEQUENCE_PREFIX}:${userId}`;
    return await this.redis.incr(sequenceKey);
  }
  
  private async getEventById(eventId: string): Promise<StoredSseEvent | null> {
    try {
      const eventKey = `${this.EVENT_PREFIX}:${eventId}`;
      const eventData = await this.redis.get(eventKey);
      
      if (eventData) {
        return JSON.parse(eventData);
      }
      
      return null;
    } catch (error) {
      this.logger.error(`❌ Erro ao buscar evento ${eventId}:`, error);
      return null;
    }
  }
  
  private async findSequenceByTimestamp(userId: string, since: Date): Promise<number> {
    // Implementação simplificada - em produção, seria mais eficiente
    // manter um índice por timestamp
    const userEventsKey = `${this.USER_EVENTS_PREFIX}:${userId}`;
    const allEventIds = await this.redis.zrange(userEventsKey, 0, -1);
    
    for (const eventId of allEventIds) {
      const event = await this.getEventById(eventId);
      if (event && event.createdAt >= since) {
        return event.sequence;
      }
    }
    
    return 0;
  }
  
  private async limitUserEvents(userId: string): Promise<void> {
    const userEventsKey = `${this.USER_EVENTS_PREFIX}:${userId}`;
    const count = await this.redis.zcard(userEventsKey);
    
    if (count > this.MAX_EVENTS_PER_USER) {
      // Remover eventos mais antigos
      const toRemove = count - this.MAX_EVENTS_PER_USER;
      const oldEventIds = await this.redis.zrange(userEventsKey, 0, toRemove - 1);
      
      // Remover da lista do usuário
      await this.redis.zremrangebyrank(userEventsKey, 0, toRemove - 1);
      
      // Remover eventos individuais
      for (const eventId of oldEventIds) {
        const eventKey = `${this.EVENT_PREFIX}:${eventId}`;
        await this.redis.del(eventKey);
      }
      
      this.logger.debug(
        `🗑️ Removidos ${toRemove} eventos antigos do usuário ${userId}`
      );
    }
  }
}