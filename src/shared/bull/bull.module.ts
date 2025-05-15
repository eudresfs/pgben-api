import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * Módulo de configuração do Bull Queue
 * 
 * Responsável por configurar e gerenciar as filas de processamento assíncrono
 * utilizando Bull e Redis como backend para armazenamento das filas.
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: parseInt(configService.get('REDIS_PORT', '6379')),
        },
        defaultJobOptions: {
          attempts: 3, // Número de tentativas em caso de falha
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: true, // Remove trabalhos completos para economizar espaço
          removeOnFail: false, // Mantém os trabalhos que falharam para análise
        },
      }),
    }),
  ],
  exports: [BullModule],
})
export class BullQueueModule {}
