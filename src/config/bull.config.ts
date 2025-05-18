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
      // Opções de conexão mais resilientes
      maxRetriesPerRequest: 2,
      enableReadyCheck: false,
      connectTimeout: 5000,
      // Estratégia de reconexão mais inteligente
      retryStrategy: (times: number) => {
        if (times > 3) {
          // Após 3 tentativas, esperar mais tempo entre tentativas
          console.log(`[Redis] Falha ao conectar após ${times} tentativas. Nova tentativa em 10s.`);
          return 10000; // 10 segundos
        }
        return Math.min(times * 1000, 3000); // Espera crescente até 3 segundos
      },
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
