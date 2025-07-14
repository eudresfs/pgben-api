import { ConfigService } from '@nestjs/config';
import { BullModuleOptions } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import Redis from 'ioredis';

// Cache para verificação de disponibilidade do Redis
let redisAvailabilityCache: { available: boolean; timestamp: number } | null = null;
const CACHE_DURATION = 30000; // 30 segundos

/**
 * Configuração centralizada do Bull para evitar duplicação de processadores
 * Implementa detecção automática de disponibilidade do Redis para evitar crashes
 */
export const getBullConfig = (
  configService: ConfigService,
): BullModuleOptions => {
  const logger = new Logger('BullConfig');

  // Verificar se o Redis deve ser desabilitado (útil para desenvolvimento)
  const disableRedis = configService.get('DISABLE_REDIS') === 'true';
  const autoDetectRedis = configService.get('DISABLE_REDIS_AUTO_DETECT') !== 'false';

  if (disableRedis) {
    logger.warn('Redis desabilitado por configuração. Filas não funcionarão.');
    return getDisabledBullConfig();
  }

  // Tentar detectar automaticamente se Redis está disponível
  if (autoDetectRedis) {
    const isRedisAvailable = checkRedisAvailability(configService, logger);
    if (!isRedisAvailable) {
      logger.warn('Redis não disponível. Desabilitando filas automaticamente.');
      return getDisabledBullConfig();
    }
  }

  const redisConfig: any = {
    host: configService.get('REDIS_HOST', 'localhost'),
    port: parseInt(configService.get('REDIS_PORT', '6379')),
    // Removido maxRetriesPerRequest e enableReadyCheck para compatibilidade com Bull
    // Essas opções não são permitidas para subscriber/bclient no Bull
    connectTimeout: 5000, // Reduzido para falhar mais rápido
    lazyConnect: true, // Conecta apenas quando necessário
    keepAlive: 30000, // Mantém conexão viva
    family: 4, // Força IPv4
    retryStrategy: (times: number) => {
      if (times > 3) { // Reduzido de 5 para 3 tentativas
        logger.warn(
          `Falha ao conectar ao Redis após ${times} tentativas. Continuando sem filas.`,
        );
        // IMPORTANTE: Não retornar null para evitar crash
        // Em vez disso, retornar um delay muito alto para efetivamente desabilitar
        return 300000; // 5 minutos - efetivamente desabilita
      }
      const delay = Math.min(times * 1000, 5000); // Espera crescente até 5 segundos
      logger.warn(
        `Tentativa ${times} de conexão ao Redis falhou. Nova tentativa em ${delay}ms.`,
      );
      return delay;
    },
    reconnectOnError: (err) => {
      logger.warn(`Redis reconnect on error: ${err.message}`);
      // Não tentar reconectar em erros críticos
      const criticalErrors = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'];
      const isCritical = criticalErrors.some(error => err.message.includes(error));
      if (isCritical) {
        logger.warn('Erro crítico do Redis detectado. Não tentando reconectar.');
        return false;
      }
      const targetError = 'READONLY';
      return err.message.includes(targetError);
    },
  };

  const password = configService.get('REDIS_PASSWORD');
  if (password) {
    redisConfig.password = password;
  }

  return {
    redis: redisConfig,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    },
  };
};

/**
 * Retorna configuração do Bull desabilitada (fallback quando Redis não está disponível)
 */
function getDisabledBullConfig(): BullModuleOptions {
  return {
    redis: {
      connectTimeout: 1,
      lazyConnect: true,
      retryStrategy: () => 300000, // 5 minutos - efetivamente desabilita
      maxRetriesPerRequest: 3, // Não fazer requests
    },
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: true,
    },
  };
}

/**
 * Verifica se o Redis está disponível de forma mais robusta
 * Usa cache para evitar verificações repetidas durante a inicialização
 * Retorna false se não conseguir conectar rapidamente
 */
function checkRedisAvailability(configService: ConfigService, logger: Logger): boolean {
  const now = Date.now();
  
  // Verificar se temos um resultado em cache válido
  if (redisAvailabilityCache && (now - redisAvailabilityCache.timestamp) < CACHE_DURATION) {
    return redisAvailabilityCache.available;
  }
  
  try {
    // Verificação simples usando net.connect para testar a porta
    const net = require('net');
    const host = configService.get('REDIS_HOST', 'localhost');
    const port = parseInt(configService.get('REDIS_PORT', '6379'));
    
    let isAvailable = false;
    let connectionAttempted = false;
    
    const socket = new net.Socket();
    
    // Configurar timeout de 2 segundos
    socket.setTimeout(2000);
    
    socket.on('connect', () => {
      isAvailable = true;
      connectionAttempted = true;
      socket.destroy();
    });
    
    socket.on('error', () => {
      isAvailable = false;
      connectionAttempted = true;
      socket.destroy();
    });
    
    socket.on('timeout', () => {
      isAvailable = false;
      connectionAttempted = true;
      socket.destroy();
    });
    
    // Tentar conectar
    socket.connect(port, host);
    
    // Aguardar resultado com busy wait (máximo 2.5 segundos)
    const start = Date.now();
    while (!connectionAttempted && (Date.now() - start) < 2500) {
      // Busy wait
    }
    
    if (!connectionAttempted) {
      socket.destroy();
      logger.warn('Timeout na verificação de disponibilidade do Redis');
      isAvailable = false;
    }
    
    // Cachear o resultado
    redisAvailabilityCache = {
      available: isAvailable,
      timestamp: now
    };
    
    // Log apenas na primeira verificação ou quando o status muda
    const shouldLog = !redisAvailabilityCache || 
                     (redisAvailabilityCache.available !== isAvailable);
    
    if (shouldLog) {
      if (isAvailable) {
        logger.log('Redis detectado como disponível');
      } else {
        logger.warn('Redis detectado como indisponível');
      }
    }
    
    return isAvailable;
    
  } catch (error) {
    logger.warn(`Erro ao verificar disponibilidade do Redis: ${error.message}`);
    
    // Cachear resultado negativo
    redisAvailabilityCache = {
      available: false,
      timestamp: now
    };
    
    return false;
  }
}

// Variável global para controlar quais processadores já foram registrados
export const registeredProcessors = new Set<string>();
