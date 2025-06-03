import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

/**
 * Módulo Comum
 * Módulo global para serviços compartilhados (exceto EmailService que tem seu próprio módulo)
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [],
  exports: [],
})
export class CommonModule {}
