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
        // Removido maxRetriesPerRequest e enableReadyCheck para compatibilidade com Bull
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
    // Removido maxRetriesPerRequest e enableReadyCheck para compatibilidade com Bull
    // Essas opções não são permitidas para subscriber/bclient no Bull
    connectTimeout: 10000,
    lazyConnect: true, // Conecta apenas quando necessário
    keepAlive: 30000, // Mantém conexão viva
    family: 4, // Força IPv4
    retryStrategy: (times: number) => {
      if (times > 5) {
        logger.error(
          `Falha ao conectar ao Redis após ${times} tentativas. Desistindo.`,
        );
        return null; // Para de tentar
      }
      const delay = Math.min(times * 2000, 10000); // Espera crescente até 10 segundos
      logger.warn(
        `Tentativa ${times} de conexão ao Redis falhou. Nova tentativa em ${delay}ms.`,
      );
      return delay;
    },
    reconnectOnError: (err) => {
      logger.warn(`Redis reconnect on error: ${err.message}`);
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

// Variável global para controlar quais processadores já foram registrados
export const registeredProcessors = new Set<string>();
