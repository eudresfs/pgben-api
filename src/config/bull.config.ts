import { BullModuleOptions } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

const logger = new Logger('BullConfig');

export const getBullConfig = async (
  configService: ConfigService,
): Promise<BullModuleOptions> => {
  const disableRedis = configService.get('DISABLE_REDIS') === 'true';

  if (disableRedis) {
    logger.warn('Redis desabilitado por configuração. Filas não funcionarão.');
    return {};
  }

  logger.log('Configurando BullMQ com conexão direta...');

  return {
    redis: {
      host: configService.get<string>('REDIS_HOST', 'localhost'),
      port: configService.get<number>('REDIS_PORT', 6379),
      password: configService.get<string>('REDIS_PASSWORD'),
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    },
    defaultJobOptions: {
      attempts: configService.get<number>('BULL_DEFAULT_ATTEMPTS', 3),
      removeOnComplete: true,
      removeOnFail: true,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    },
  };
};
