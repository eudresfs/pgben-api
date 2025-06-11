import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { EmailService } from '../services/email.service';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Endpoints utilitários relacionados ao serviço de email.
 * Protegido por rate-limiting padrão para evitar abuso.
 */
@Controller('email')
@UseGuards(ThrottlerGuard)
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  /**
   * Limpa o cache de templates de email em memória.
   * Útil para ambiente de produção quando alterações de templates forem necessárias
   * sem reiniciar a aplicação.
   */
  @Post('cache/reload')
  @HttpCode(HttpStatus.NO_CONTENT)
  reloadTemplateCache(): void {
    this.emailService.clearTemplateCache();
  }
}
