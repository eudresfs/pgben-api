import { SetMetadata } from '@nestjs/common';

/**
 * Chave de metadados para identificar rotas que devem pular o InputValidationInterceptor
 */
export const SKIP_INPUT_VALIDATION_KEY = 'skipInputValidation';

/**
 * Decorator para marcar rotas que devem ser excluídas do InputValidationInterceptor
 * 
 * Este decorator é especialmente útil para APIs que recebem dados criptografados
 * ou em formatos especiais que podem ser detectados como padrões suspeitos
 * pelo sistema de validação de entrada.
 * 
 * @example
 * ```typescript
 * @Controller('whatsapp-flows')
 * export class WhatsAppFlowsController {
 *   @Post()
 *   @SkipInputValidation()
 *   async processFlow(@Body() encryptedData: any) {
 *     // Esta requisição não será validada pelo InputValidationInterceptor
 *     return await this.service.processEncryptedData(encryptedData);
 *   }
 * }
 * ```
 * 
 * @author Equipe PGBen
 */
export const SkipInputValidation = () =>
  SetMetadata(SKIP_INPUT_VALIDATION_KEY, true);