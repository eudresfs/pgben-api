import { ConfigService } from '@nestjs/config';
import { RedisOptions } from 'ioredis';

/**
 * Configurações otimizadas para o Redis
 * 
 * Estas configurações são projetadas para melhorar a resiliência e performance
 * da conexão com o Redis, incluindo:
 * - Reconexão automática com backoff exponencial
 * - Timeout de comandos para evitar bloqueios
 * - Número máximo de tentativas de reconexão
 * - Monitoramento de saúde da conexão
 */
export function getRedisConfig(configService: ConfigService): RedisOptions {
  return {
    host: configService.get<string>('REDIS_HOST', 'localhost'),
    port: configService.get<number>('REDIS_PORT', 6379),
    password: configService.get<string>('REDIS_PASSWORD', ''),
    db: configService.get<number>('REDIS_DB', 0),
    
    // Configurações de timeout e reconexão
    connectTimeout: configService.get<number>('REDIS_CONNECT_TIMEOUT', 5000),
    commandTimeout: configService.get<number>('REDIS_COMMAND_TIMEOUT', 2000),
    maxRetriesPerRequest: configService.get<number>('REDIS_MAX_RETRIES', 3),
    
    // Configurações de reconexão
    retryStrategy(times) {
      // Backoff exponencial com limite máximo
      const delay = Math.min(times * 100, 3000);
      return delay;
    },
    
    // Configurações de saúde da conexão
    enableReadyCheck: true,
    enableOfflineQueue: true,
    
    // Configurações de desempenho
    keepAlive: 10000,
    noDelay: true,
    
    // Tratamento de erros
    showFriendlyErrorStack: process.env.NODE_ENV !== 'production',
  };
}
