import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from '../../common/services/email.service';

/**
 * Módulo global para serviços de email
 * Fornece o EmailService para toda a aplicação
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
