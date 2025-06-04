import { DynamicModule, Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * Módulo singleton para o Bull
 *
 * Este módulo garante que a configuração do Bull seja feita apenas uma vez
 * e que as filas sejam registradas de forma centralizada, evitando duplicação
 * de processadores.
 */
@Global()
@Module({})
export class BullSingletonModule {
  // Controla quais filas já foram registradas
  private static registeredQueues = new Set<string>();

  /**
   * Configura o BullModule com as opções de conexão com o Redis
   */
  static forRoot(): DynamicModule {
    return {
      module: BullSingletonModule,
      imports: [
        BullModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
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
          }),
        }),
      ],
      exports: [BullModule],
    };
  }

  /**
   * Registra uma fila Bull, garantindo que cada fila seja registrada apenas uma vez
   *
   * @param queueName Nome da fila
   */
  static registerQueue(queueName: string): DynamicModule {
    // Se a fila já foi registrada, retorna um módulo vazio
    if (BullSingletonModule.registeredQueues.has(queueName)) {
      return {
        module: BullSingletonModule,
        exports: [BullModule],
      };
    }

    // Marca a fila como registrada
    BullSingletonModule.registeredQueues.add(queueName);

    // Registra a fila
    return {
      module: BullSingletonModule,
      imports: [
        BullModule.registerQueue({
          name: queueName,
        }),
      ],
      exports: [BullModule],
    };
  }
}
