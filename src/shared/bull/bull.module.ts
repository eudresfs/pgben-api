import { Module, DynamicModule, Global } from '@nestjs/common';
import { BullModule, BullModuleOptions } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * Módulo de configuração do Bull para filas de processamento assíncrono
 *
 * Este módulo centraliza a configuração do Bull para evitar duplicação
 * de processadores e garantir uma configuração consistente em toda a aplicação.
 */
@Module({})
export class BullQueueModule {
  /**
   * Configura a conexão principal do Bull com o Redis
   * Este método deve ser chamado apenas uma vez no AppModule
   */
  static forRoot(): DynamicModule {
    return {
      module: BullQueueModule,
      global: true,
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
    };
  }

  /**
   * Registra uma fila Bull específica
   * Este método deve ser usado para registrar filas em módulos específicos
   *
   * @param queueName Nome da fila a ser registrada
   * @param options Opções adicionais para a fila (opcional)
   */
  static registerQueue(
    queueName: string,
    options?: Partial<BullModuleOptions>,
  ): DynamicModule {
    return {
      module: BullQueueModule,
      imports: [
        BullModule.registerQueue({
          name: queueName,
          ...options,
        }),
      ],
      exports: [BullModule],
    };
  }
}
