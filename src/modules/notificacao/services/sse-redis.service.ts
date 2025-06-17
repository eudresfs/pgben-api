import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { SseConnection, SseNotification } from '../interfaces/sse-notification.interface';
import { createRedisInstance } from '../../../config/redis.config';
import { SseConfig, SSE_CONFIG } from '../../../config/sse.config';

/**
 * Serviço Redis para SSE - Gerencia comunicação entre instâncias
 * 
 * Responsabilidades:
 * - Pub/Sub para distribuição de eventos SSE entre instâncias
 * - Armazenamento distribuído de conexões ativas
 * - Cleanup automático de conexões expiradas
 * - Sincronização de estado entre instâncias
 */
@Injectable()
export class SseRedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SseRedisService.name);
  
  private publisher: Redis;
  private subscriber: Redis;
  private storage: Redis;
  
  // Prefixos para organização das chaves Redis
  private readonly CHANNEL_PREFIX = 'sse:channel';
  private readonly CONNECTION_PREFIX = 'sse:connection';
  private readonly USER_CONNECTIONS_PREFIX = 'sse:user';
  private readonly STATS_PREFIX = 'sse:stats';
  
  // TTL padrão para conexões (30 minutos)
  private readonly CONNECTION_TTL = 30 * 60; // 30 minutos em segundos
  
  constructor(
    private readonly configService: ConfigService,
    @Inject(SSE_CONFIG) private readonly sseConfig: SseConfig,
  ) {}
  
  async onModuleInit() {
    try {
      this.logger.log('Inicializando SseRedisService...');
      
      // Verificar se Redis está desabilitado
      const redisDisabled = this.configService.get<boolean>('DISABLE_REDIS', false);
      if (redisDisabled) {
        this.logger.warn('Redis desabilitado - SSE funcionará apenas localmente');
        return;
      }
      
      // Criar três instâncias Redis separadas para diferentes propósitos
      this.publisher = createRedisInstance(this.configService);
      this.subscriber = createRedisInstance(this.configService);
      this.storage = createRedisInstance(this.configService);
      
      // Testar conexão com timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout na conexão com Redis')), 5000);
      });
      
      await Promise.race([
        this.publisher.ping(),
        timeoutPromise
      ]);
      
      // Configurar subscriber para receber eventos
      this.setupSubscriber();
      
      this.logger.log('✅ SseRedisService inicializado com sucesso');
    } catch (error) {
      this.logger.warn(`Redis não disponível: ${error.message}. SSE funcionará apenas localmente.`);
      // Não falha a inicialização se Redis não estiver disponível
    }
  }
  
  async onModuleDestroy() {
    try {
      await Promise.all([
        this.publisher?.quit(),
        this.subscriber?.quit(),
        this.storage?.quit()
      ]);
      this.logger.log('🔌 SseRedisService desconectado');
    } catch (error) {
      this.logger.error('❌ Erro ao desconectar SseRedisService:', error);
    }
  }
  
  /**
   * Configura o subscriber para receber eventos de outras instâncias
   */
  private setupSubscriber() {
    this.subscriber.on('message', (channel: string, message: string) => {
      try {
        const data = JSON.parse(message);
        this.handleIncomingMessage(channel, data);
      } catch (error) {
        this.logger.error('❌ Erro ao processar mensagem Redis:', error);
      }
    });
    
    this.subscriber.on('error', (error) => {
      this.logger.error('❌ Erro no subscriber Redis:', error);
    });
  }
  
  /**
   * Processa mensagens recebidas de outras instâncias
   */
  private handleIncomingMessage(channel: string, data: any) {
    this.logger.debug(`📨 Mensagem recebida no canal ${channel}:`, data);
    
    // Emitir evento para que o SseService local possa processar
    // Isso será implementado quando integrarmos com o SseService
  }
  
  /**
   * Publica uma notificação SSE para todas as instâncias
   */
  async publishNotification(notification: SseNotification): Promise<void> {
    try {
      const channel = `${this.CHANNEL_PREFIX}:user:${notification.userId}`;
      const message = JSON.stringify(notification);
      
      await this.publisher.publish(channel, message);
      
      this.logger.debug(`📤 Notificação publicada para usuário ${notification.userId}`);
    } catch (error) {
      this.logger.error('❌ Erro ao publicar notificação:', error);
      throw error;
    }
  }
  
  /**
   * Publica notificação para todos os usuários conectados
   */
  async publishBroadcast(notification: Omit<SseNotification, 'userId'>): Promise<void> {
    try {
      const channel = `${this.CHANNEL_PREFIX}:broadcast`;
      const message = JSON.stringify(notification);
      
      await this.publisher.publish(channel, message);
      
      this.logger.debug('📤 Notificação broadcast publicada');
    } catch (error) {
      this.logger.error('❌ Erro ao publicar broadcast:', error);
      throw error;
    }
  }
  
  /**
   * Subscreve aos canais de um usuário específico
   */
  async subscribeToUser(userId: string): Promise<void> {
    try {
      const channel = `${this.CHANNEL_PREFIX}:user:${userId}`;
      await this.subscriber.subscribe(channel);
      
      this.logger.debug(`🔔 Subscrito ao canal do usuário ${userId}`);
    } catch (error) {
      this.logger.error(`❌ Erro ao subscrever usuário ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Subscreve ao canal de broadcast
   */
  async subscribeToBroadcast(): Promise<void> {
    try {
      const channel = `${this.CHANNEL_PREFIX}:broadcast`;
      await this.subscriber.subscribe(channel);
      
      this.logger.debug('🔔 Subscrito ao canal de broadcast');
    } catch (error) {
      this.logger.error('❌ Erro ao subscrever broadcast:', error);
      throw error;
    }
  }
  
  /**
   * Remove subscrição de um usuário
   */
  async unsubscribeFromUser(userId: string): Promise<void> {
    try {
      const channel = `${this.CHANNEL_PREFIX}:user:${userId}`;
      await this.subscriber.unsubscribe(channel);
      
      this.logger.debug(`🔕 Dessubscrito do canal do usuário ${userId}`);
    } catch (error) {
      this.logger.error(`❌ Erro ao dessubscrever usuário ${userId}:`, error);
    }
  }
  
  /**
   * Armazena informações de uma conexão SSE
   */
  async storeConnection(connection: SseConnection): Promise<void> {
    try {
      const connectionKey = `${this.CONNECTION_PREFIX}:${connection.connectionId}`;
      const userConnectionsKey = `${this.USER_CONNECTIONS_PREFIX}:${connection.userId}`;
      
      // Armazenar dados da conexão
      await this.storage.setex(
        connectionKey,
        this.sseConfig.connectionTtl,
        JSON.stringify(connection)
      );
      
      // Adicionar conexão à lista do usuário
      await this.storage.sadd(userConnectionsKey, connection.connectionId);
      await this.storage.expire(userConnectionsKey, this.sseConfig.connectionTtl);
      
      this.logger.debug(`💾 Conexão ${connection.connectionId} armazenada para usuário ${connection.userId}`);
    } catch (error) {
      this.logger.error('❌ Erro ao armazenar conexão:', error);
      throw error;
    }
  }
  
  /**
   * Remove uma conexão do armazenamento
   */
  async removeConnection(connectionId: string, userId: string): Promise<void> {
    try {
      const connectionKey = `${this.CONNECTION_PREFIX}:${connectionId}`;
      const userConnectionsKey = `${this.USER_CONNECTIONS_PREFIX}:${userId}`;
      
      // Remover dados da conexão
      await this.storage.del(connectionKey);
      
      // Remover da lista do usuário
      await this.storage.srem(userConnectionsKey, connectionId);
      
      this.logger.debug(`🗑️ Conexão ${connectionId} removida`);
    } catch (error) {
      this.logger.error('❌ Erro ao remover conexão:', error);
    }
  }
  
  /**
   * Obtém todas as conexões de um usuário
   */
  async getUserConnections(userId: string): Promise<SseConnection[]> {
    try {
      const userConnectionsKey = `${this.USER_CONNECTIONS_PREFIX}:${userId}`;
      const connectionIds = await this.storage.smembers(userConnectionsKey);
      
      if (connectionIds.length === 0) {
        return [];
      }
      
      // Buscar dados de cada conexão
      const connectionKeys = connectionIds.map(id => `${this.CONNECTION_PREFIX}:${id}`);
      const connectionData = await this.storage.mget(...connectionKeys);
      
      const connections: SseConnection[] = [];
      
      for (let i = 0; i < connectionData.length; i++) {
        if (connectionData[i]) {
          try {
            const data = connectionData[i];
            if (data !== null) {
              connections.push(JSON.parse(data));
            }
          } catch (error) {
            this.logger.warn(`⚠️ Erro ao parsear conexão ${connectionIds[i]}:`, error);
            // Remover conexão corrompida
            if (connectionIds[i]) {
              await this.removeConnection(connectionIds[i], userId);
            }
          }
        }
      }
      
      return connections;
    } catch (error) {
      this.logger.error(`❌ Erro ao buscar conexões do usuário ${userId}:`, error);
      return [];
    }
  }
  
  /**
   * Atualiza o timestamp de heartbeat de uma conexão
   */
  async updateHeartbeat(connectionId: string): Promise<void> {
    try {
      const connectionKey = `${this.CONNECTION_PREFIX}:${connectionId}`;
      const connectionData = await this.storage.get(connectionKey);
      
      if (connectionData) {
        const connection: SseConnection = JSON.parse(connectionData);
        connection.lastHeartbeat = new Date();
        
        await this.storage.setex(
          connectionKey,
          this.sseConfig.connectionTtl,
          JSON.stringify(connection)
        );
      }
    } catch (error) {
      this.logger.error(`❌ Erro ao atualizar heartbeat ${connectionId}:`, error);
    }
  }
  
  /**
   * Remove conexões expiradas
   */
  async cleanupExpiredConnections(): Promise<number> {
    try {
      const pattern = `${this.CONNECTION_PREFIX}:*`;
      const keys = await this.storage.keys(pattern);
      
      let removedCount = 0;
      const now = new Date();
      const expireThreshold = 5 * 60 * 1000; // 5 minutos
      
      for (const key of keys) {
        try {
          const connectionData = await this.storage.get(key);
          if (connectionData) {
            const connection: SseConnection = JSON.parse(connectionData);
            const lastHeartbeat = new Date(connection.lastHeartbeat);
            
            if (now.getTime() - lastHeartbeat.getTime() > expireThreshold) {
              const connectionId = key.replace(`${this.CONNECTION_PREFIX}:`, '');
              await this.removeConnection(connectionId, connection.userId);
              removedCount++;
            }
          }
        } catch (error) {
          // Remover chave corrompida
          await this.storage.del(key);
          removedCount++;
        }
      }
      
      if (removedCount > 0) {
        this.logger.log(`🧹 Removidas ${removedCount} conexões expiradas`);
      }
      
      return removedCount;
    } catch (error) {
      this.logger.error('❌ Erro no cleanup de conexões:', error);
      return 0;
    }
  }
  
  /**
   * Obtém estatísticas globais de conexões
   */
  async getGlobalStats(): Promise<{
    totalConnections: number;
    connectedUsers: number;
    connectionsByUser: Record<string, number>;
  }> {
    try {
      const userPattern = `${this.USER_CONNECTIONS_PREFIX}:*`;
      const userKeys = await this.storage.keys(userPattern);
      
      let totalConnections = 0;
      const connectionsByUser: Record<string, number> = {};
      
      for (const key of userKeys) {
        const userId = key.replace(`${this.USER_CONNECTIONS_PREFIX}:`, '');
        const connectionCount = await this.storage.scard(key);
        
        if (connectionCount > 0) {
          connectionsByUser[userId] = connectionCount;
          totalConnections += connectionCount;
        }
      }
      
      return {
        totalConnections,
        connectedUsers: Object.keys(connectionsByUser).length,
        connectionsByUser
      };
    } catch (error) {
      this.logger.error('❌ Erro ao obter estatísticas globais:', error);
      return {
        totalConnections: 0,
        connectedUsers: 0,
        connectionsByUser: {}
      };
    }
  }
  
  /**
   * Verifica se o Redis está conectado e funcionando
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.storage.ping();
      return true;
    } catch (error) {
      this.logger.error('❌ Health check Redis falhou:', error);
      return false;
    }
  }

  /**
   * Retorna a instância do Redis para storage
   */
  getStorageClient(): Redis {
    return this.storage;
  }
}