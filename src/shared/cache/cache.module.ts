import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    // Registramos a fila de cache
    BullModule.registerQueue({
      name: 'cache',
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
