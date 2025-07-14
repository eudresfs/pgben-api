import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

/**
 * Configuração do Redis para cache e throttling
 */
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  retryDelayOnFailover: number;
  maxRetriesPerRequest: number;
  lazyConnect: boolean;
  keepAlive: number;
  family: number;
  keyPrefix?: string;
  retryStrategy?: (times: number) => number | void | null;
}

/**
 * Factory para criar instância do Redis
 */
export const createRedisInstance = (configService: ConfigService): Redis => {
  const password = configService.get<string>('REDIS_PASSWORD');

  const config: RedisConfig = {
    host: configService.get<string>('REDIS_HOST', 'localhost'),
    port: configService.get<number>('REDIS_PORT', 6379),
    db: configService.get<number>('REDIS_DB', 0),
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: configService.get<number>('REDIS_MAX_RETRIES_PER_REQUEST', 3),
    lazyConnect: true,
    keepAlive: 30000,
    family: 4,
    keyPrefix: configService.get<string>('REDIS_KEY_PREFIX', 'pgben:'),
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  };

  if (password) {
    config.password = password;
  }

  const redis = new Redis(config);

  // Event listeners para monitoramento
  redis.on('connect', () => {
    console.log('✅ Redis conectado com sucesso');
  });

  redis.on('error', (error) => {
    console.error('❌ Erro na conexão Redis:', error);
  });

  redis.on('close', () => {
    console.log('🔌 Conexão Redis fechada');
  });

  redis.on('reconnecting', () => {
    console.log('🔄 Reconectando ao Redis...');
  });

  return redis;
};

/**
 * Configuração específica para diferentes ambientes
 */
export const getRedisConfig = (configService: ConfigService) => {
  const environment = configService.get<string>('NODE_ENV', 'development');

  const password = configService.get<string>('REDIS_PASSWORD');

  const baseConfig: Partial<RedisConfig> = {
    host: configService.get<string>('REDIS_HOST', 'localhost'),
    port: configService.get<number>('REDIS_PORT', 6379),
    keyPrefix: configService.get<string>('REDIS_KEY_PREFIX', 'pgben:'),
  };

  if (password) {
    baseConfig.password = password;
  }

  switch (environment) {
    case 'production':
      return {
        ...baseConfig,
        db: 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: configService.get<number>('REDIS_MAX_RETRIES_PER_REQUEST', 3),
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      };

    case 'test':
      return {
        ...baseConfig,
        db: 1,
        retryDelayOnFailover: 50,
        maxRetriesPerRequest: configService.get<number>('REDIS_MAX_RETRIES_PER_REQUEST', 3),
        lazyConnect: false,
        keepAlive: 1000,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 25, 1000);
          return delay;
        },
      };

    default: // development
      return {
        ...baseConfig,
        db: 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: configService.get<number>('REDIS_MAX_RETRIES_PER_REQUEST', 3),
        lazyConnect: true,
        keepAlive: 30000,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      };
  }
};
