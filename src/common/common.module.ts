import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailController } from './controllers/email.controller';
import { FiltrosAvancadosModule } from './filtros-avancados.module';
import { UserIdentifierService } from './services/user-identifier.service';

/**
 * Módulo Comum
 * Módulo global para serviços compartilhados (exceto EmailService que tem seu próprio módulo)
 */
@Global()
@Module({
  imports: [ConfigModule, FiltrosAvancadosModule],
  controllers: [EmailController],
  providers: [UserIdentifierService],
  exports: [FiltrosAvancadosModule, UserIdentifierService],
})
export class CommonModule {}
