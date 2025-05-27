import { CacheModuleOptions } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-store';
import { Logger } from '@nestjs/common';

/**
 * Configuração centralizada do Cache para toda a aplicação
 * Suporta Redis para ambiente de produção e cache em memória para desenvolvimento
 */
export const getCacheConfig = async (
  configService: ConfigService,
): Promise<CacheModuleOptions> => {
  const logger = new Logger('CacheConfig');
  
  // Verificar se o Redis deve ser desabilitado (útil para desenvolvimento)
  const disableRedis = configService.get('DISABLE_REDIS') === 'true';
  
  if (disableRedis) {
    logger.warn('Redis desabilitado por configuração. Usando cache em memória.');
    // Retornar configuração de cache em memória
    return {
      ttl: 3600, // 1 hora em segundos
      max: 1000, // Máximo de 1000 itens no cache
      isGlobal: true,
    };
  }
  
  // Configuração do Redis para cache
  const host = configService.get('REDIS_HOST', 'localhost');
  const port = parseInt(configService.get('REDIS_PORT', '6379'));
  const password = configService.get('REDIS_PASSWORD', '');
  const ttl = parseInt(configService.get('CACHE_TTL', '3600')); // 1 hora em segundos
  
  logger.log(`Configurando cache Redis em ${host}:${port}`);
  
  try {
    const store = await redisStore({
      socket: {
        host,
        port,
      },
      password: password || undefined,
      ttl,
      // Opções de conexão mais resilientes
      retryStrategy: (times: number) => {
        if (times > 3) {
          // Após 3 tentativas, esperar mais tempo entre tentativas
          logger.warn(`Falha ao conectar ao Redis para cache após ${times} tentativas. Nova tentativa em 5s.`);
          return 5000; // 5 segundos
        }
        return Math.min(times * 1000, 3000); // Espera crescente até 3 segundos
      },
    });
    
    return {
      store: store as any,
      ttl,
      isGlobal: true,
    };
  } catch (error) {
    logger.error(`Erro ao configurar Redis para cache: ${error.message}`);
    logger.warn('Fallback para cache em memória');
    
    // Fallback para cache em memória
    return {
      ttl: 3600, // 1 hora em segundos
      max: 1000, // Máximo de 1000 itens no cache
      isGlobal: true,
    };
  }
};