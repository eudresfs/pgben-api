import { ConfigService } from '@nestjs/config';
import { BullModuleOptions } from '@nestjs/bull';

/**
 * Configuração centralizada do Bull para evitar duplicação de processadores
 */
export const getBullConfig = (configService: ConfigService): BullModuleOptions => {
  return {
    redis: {
      host: configService.get('REDIS_HOST', 'localhost'),
      port: parseInt(configService.get('REDIS_PORT', '6379')),
      password: configService.get('REDIS_PASSWORD', ''),
    },
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
