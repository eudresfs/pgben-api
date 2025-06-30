import { ConfigService } from '@nestjs/config';
import { BullModuleOptions } from '@nestjs/bull';
import { Logger } from '@nestjs/common';

/**
 * Configuração centralizada do Bull para evitar duplicação de processadores
 */
export const getBullConfig = (
  configService: ConfigService,
): BullModuleOptions => {
  const logger = new Logger('BullConfig');

  // Verificar se o Redis deve ser desabilitado (útil para desenvolvimento)
  const disableRedis = configService.get('DISABLE_REDIS') === 'true';

  if (disableRedis) {
    logger.warn('Redis desabilitado por configuração. Filas não funcionarão.');
    // Retornar configuração mínima que não tentará conectar ao Redis
    return {
      redis: {
        maxRetriesPerRequest: 0,
        enableReadyCheck: false,
        connectTimeout: 1,
        retryStrategy: () => null, // Não tentar reconectar
      },
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: true,
      },
    };
  }

  const redisConfig: any = {
    host: configService.get('REDIS_HOST', 'localhost'),
    port: parseInt(configService.get('REDIS_PORT', '6379')),
    maxRetriesPerRequest: 2,
    enableReadyCheck: false,
    connectTimeout: 5000,
    retryStrategy: (times: number) => {
      if (times > 3) {
        logger.warn(
          `Falha ao conectar ao Redis após ${times} tentativas. Nova tentativa em 10s.`,
        );
        return 10000; // 10 segundos
      }
      return Math.min(times * 1000, 3000); // Espera crescente até 3 segundos
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

// Variável global para controlar quais processadores já foram registrados
export const registeredProcessors = new Set<string>();
