import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './services/email.service';

/**
 * Módulo de Email
 * Módulo global que fornece o EmailService para toda a aplicação
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}