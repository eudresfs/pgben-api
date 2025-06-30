import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

export interface RedisConnectionConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  username?: string;
}

export type ConnectionType = 'client' | 'subscriber' | 'bclient' | 'cache' | 'health' | 'sse';

export interface ConnectionPoolConfig {
  maxRetriesPerRequest: number | null;
  enableOfflineQueue: boolean;
  lazyConnect: boolean;
  maxReconnectAttempts: number;
  retryDelayOnFailover: number;
}

@Injectable()
export class RedisConnectionManager implements OnModuleDestroy {
  private readonly logger = new Logger(RedisConnectionManager.name);
  private readonly connections = new Map<string, Redis>();
  private readonly config: RedisConnectionConfig;
  private readonly baseOptions: RedisOptions;
  
  // Pools compartilhados para BullMQ
  private clientPool: Redis | null = null;
  private subscriberPool: Redis | null = null;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_DB', 0),
      username: this.configService.get<string>('REDIS_USERNAME'),
    };

    this.baseOptions = {
      host: this.config.host,
      port: this.config.port,
      password: this.config.password,
      username: this.config.username,
      db: this.config.db,
      lazyConnect: true,
      retryStrategy: this.createRetryStrategy(),
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        return err.message.includes(targetError);
      },
      connectTimeout: 10000,
      commandTimeout: 5000,
    };

    this.validateConfiguration();
  }

  private validateConfiguration(): void {
    if (!this.config.host) {
      throw new Error('REDIS_HOST is required');
    }
    if (!this.config.port || this.config.port <= 0) {
      throw new Error('REDIS_PORT must be a positive number');
    }
    this.logger.log(`Redis configuration validated: ${this.config.host}:${this.config.port}`);
  }

  private createRetryStrategy() {
    return (times: number) => {
      const delay = Math.min(Math.exp(times), 20000);
      this.logger.warn(`Redis retry attempt ${times}, delay: ${delay}ms`);
      return Math.max(delay, 1000);
    };
  }

  private getConnectionConfig(type: ConnectionType): Partial<RedisOptions> {
    const configs: Record<ConnectionType, Partial<RedisOptions>> = {
      client: {
        maxRetriesPerRequest: 20,
        enableOfflineQueue: true,
        connectionName: 'bullmq-client',
      },
      subscriber: {
        maxRetriesPerRequest: null,
        enableOfflineQueue: false,
        connectionName: 'bullmq-subscriber',
      },
      bclient: {
        maxRetriesPerRequest: 20,
        enableOfflineQueue: true,
        connectionName: 'bullmq-bclient',
      },
      cache: {
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false,
        connectionName: 'cache',
      },
      health: {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        connectionName: 'health-check',
        connectTimeout: 5000,
        commandTimeout: 3000,
      },
      sse: {
        maxRetriesPerRequest: null,
        enableOfflineQueue: false,
        connectionName: 'sse',
      },
    };

    return configs[type];
  }

  async createConnection(type: ConnectionType, redisOpts?: Partial<RedisOptions>): Promise<Redis> {
    const connectionKey = `${type}-${Date.now()}`;
    const typeConfig = this.getConnectionConfig(type);
    
    const options: RedisOptions = {
      ...this.baseOptions,
      ...typeConfig,
      ...redisOpts,
    };

    const connection = new Redis(options);
    this.connections.set(connectionKey, connection);

    // Event listeners para monitoramento
    connection.on('connect', () => {
      this.logger.log(`Redis ${type} connection established: ${connectionKey}`);
    });

    connection.on('ready', () => {
      this.logger.log(`Redis ${type} connection ready: ${connectionKey}`);
    });

    connection.on('error', (err) => {
      this.logger.error(`Redis ${type} connection error: ${err.message}`, err.stack);
    });

    connection.on('close', () => {
      this.logger.warn(`Redis ${type} connection closed: ${connectionKey}`);
    });

    connection.on('reconnecting', () => {
      this.logger.warn(`Redis ${type} connection reconnecting: ${connectionKey}`);
    });

    // Aguarda conexão estar pronta antes de retornar
    await this.waitForConnection(connection, type);
    
    return connection;
  }

  private async waitForConnection(connection: Redis, type: ConnectionType, timeout = 10000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Redis ${type} connection timeout after ${timeout}ms`));
      }, timeout);

      const onReady = () => {
        clearTimeout(timer);
        connection.off('error', onError);
        resolve();
      };

      const onError = (err: Error) => {
        clearTimeout(timer);
        connection.off('ready', onReady);
        reject(err);
      };

      if (connection.status === 'ready') {
        clearTimeout(timer);
        resolve();
        return;
      }

      connection.once('ready', onReady);
      connection.once('error', onError);

      // Inicia conexão se ainda não foi iniciada
      if (connection.status === 'wait') {
        connection.connect().catch(onError);
      }
    });
  }

  // Implementação do padrão createClient para BullMQ
  createClient = (type: 'client' | 'subscriber' | 'bclient', redisOpts?: any): Redis => {
    switch (type) {
      case 'client':
        if (!this.clientPool) {
          this.logger.log('Creating shared client pool for BullMQ');
          this.clientPool = new Redis({
            ...this.baseOptions,
            ...this.getConnectionConfig('client'),
            ...redisOpts,
          });
          this.connections.set('bullmq-client-pool', this.clientPool);
        }
        return this.clientPool;

      case 'subscriber':
        if (!this.subscriberPool) {
          this.logger.log('Creating shared subscriber pool for BullMQ');
          this.subscriberPool = new Redis({
            ...this.baseOptions,
            ...this.getConnectionConfig('subscriber'),
            ...redisOpts,
          });
          this.connections.set('bullmq-subscriber-pool', this.subscriberPool);
        }
        return this.subscriberPool;

      case 'bclient':
        // bclient sempre cria nova instância conforme documentação BullMQ
        this.logger.log('Creating new bclient instance for BullMQ');
        const bclient = new Redis({
          ...this.baseOptions,
          ...this.getConnectionConfig('bclient'),
          ...redisOpts,
        });
        this.connections.set(`bullmq-bclient-${Date.now()}`, bclient);
        return bclient;

      default:
        throw new Error(`Unexpected BullMQ connection type: ${type}`);
    }
  };

  async getHealthCheckConnection(): Promise<Redis> {
    return this.createConnection('health');
  }

  async getCacheConnection(): Promise<Redis> {
    return this.createConnection('cache');
  }

  async getSseConnection(): Promise<Redis> {
    return this.createConnection('sse');
  }

  async isHealthy(): Promise<boolean> {
    try {
      const healthConnection = await this.getHealthCheckConnection();
      const result = await healthConnection.ping();
      await healthConnection.quit();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return false;
    }
  }

  getConnectionStats(): { total: number; types: Record<string, number> } {
    const stats = { total: this.connections.size, types: {} };
    
    for (const [key] of this.connections) {
      const type = key.split('-')[0];
      stats.types[type] = (stats.types[type] || 0) + 1;
    }

    return stats;
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down Redis connections...');
    
    const closePromises = Array.from(this.connections.values()).map(async (connection) => {
      try {
        if (connection.status !== 'end') {
          await connection.quit();
        }
      } catch (error) {
        this.logger.error('Error closing Redis connection', error);
      }
    });

    await Promise.allSettled(closePromises);
    this.connections.clear();
    this.clientPool = null;
    this.subscriberPool = null;
    
    this.logger.log('All Redis connections closed');
  }
}