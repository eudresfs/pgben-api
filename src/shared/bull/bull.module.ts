import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getBullConfig } from '../../config/bull.config';

/**
 * Módulo compartilhado para configuração centralizada do BullMQ.
 * 
 * Este módulo utiliza `BullModule.forRootAsync` para carregar a configuração
 * do Redis de forma assíncrona, garantindo que as variáveis de ambiente
 * estejam disponíveis. Ao ser global, ele disponibiliza a configuração
 * do Bull para toda a aplicação, evitando a necessidade de registrar
 * a configuração raiz em múltiplos locais.
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => getBullConfig(configService),
      inject: [ConfigService],
    }),
  ],
  exports: [BullModule],
})
export class SharedBullModule {}
