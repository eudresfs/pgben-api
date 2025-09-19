import { SetMetadata } from '@nestjs/common';

/**
 * Chave de metadados para identificar rotas que devem pular o ResponseInterceptor
 */
export const SKIP_RESPONSE_INTERCEPTOR_KEY = 'skipResponseInterceptor';

/**
 * Decorator para marcar rotas que devem ser excluídas do ResponseInterceptor
 * 
 * Este decorator é especialmente útil para APIs que precisam retornar
 * respostas em formato específico, como o WhatsApp Flows, que requer
 * estruturas de resposta exatas conforme documentação oficial.
 * 
 * @example
 * ```typescript
 * @Controller('whatsapp-flows')
 * export class WhatsAppFlowsController {
 *   @Post()
 *   @SkipResponseInterceptor()
 *   async processFlow(@Body() data: any) {
 *     // Esta resposta não será modificada pelo ResponseInterceptor
 *     return {
 *       screen: "NEXT_SCREEN",
 *       data: {
 *         property_1: "value_1",
 *         property_2: "value_2"
 *       }
 *     };
 *   }
 * }
 * ```
 * 
 * @author Equipe PGBen
 */
export const SkipResponseInterceptor = () =>
  SetMetadata(SKIP_RESPONSE_INTERCEPTOR_KEY, true);