import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailController } from './controllers/email.controller';

/**
 * Módulo Comum
 * Módulo global para serviços compartilhados (exceto EmailService que tem seu próprio módulo)
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [],
  controllers: [EmailController],
  exports: [],
})
export class CommonModule {}
