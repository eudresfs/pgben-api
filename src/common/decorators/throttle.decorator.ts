import { applyDecorators } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

/**
 * Decorators customizados para Rate Limiting - Sistema SEMTAS
 *
 * Fornece decorators pré-configurados para diferentes tipos de endpoints
 * com limites apropriados para cada caso de uso.
 */

/**
 * Rate limiting para endpoints de autenticação
 * Mais restritivo para prevenir ataques de força bruta
 *
 * Limite: 5 tentativas por 5 minutos
 */
export const ThrottleAuth = () => {
  return applyDecorators(
    Throttle({ default: { limit: 10, ttl: 300000 } }), // 10 tentativas em 5 minutos
  );
};

/**
 * Rate limiting para endpoints de upload de documentos
 * Limite moderado para uploads de arquivos
 *
 * Limite: 10 uploads por minuto
 */
export const ThrottleUpload = () => {
  return applyDecorators(
    Throttle({ default: { limit: 20, ttl: 60000 } }), // 20 uploads por minuto
  );
};

/**
 * Rate limiting para API geral
 * Limite mais generoso para operações normais
 *
 * Limite: 200 requests por minuto
 */
export const ThrottleApi = () => {
  return applyDecorators(
    Throttle({ default: { limit: 200, ttl: 60000 } }), // 200 requests por minuto
  );
};

/**
 * Rate limiting para endpoints críticos
 * Muito restritivo para operações sensíveis
 *
 * Limite: 3 tentativas por 10 minutos
 */
export const ThrottleCritical = () => {
  return applyDecorators(
    Throttle({ default: { limit: 3, ttl: 600000 } }), // 3 tentativas em 10 minutos
  );
};

/**
 * Rate limiting para recuperação de senha
 * Restritivo para prevenir spam de emails
 *
 * Limite: 3 tentativas por hora
 */
export const ThrottlePasswordReset = () => {
  return applyDecorators(
    Throttle({ default: { limit: 3, ttl: 3600000 } }), // 3 tentativas por hora
  );
};

/**
 * Rate limiting para relatórios
 * Moderado para operações que consomem recursos
 *
 * Limite: 20 requests por 5 minutos
 */
export const ThrottleReports = () => {
  return applyDecorators(
    Throttle({ default: { limit: 50, ttl: 300000 } }), // 50 requests em 5 minutos
  );
};

/**
 * Rate limiting para download em lote
 * Moderado para operações que consomem muitos recursos
 *
 * Limite: 20 downloads por minuto
 */
export const ThrottleBatchDownload = () => {
  return applyDecorators(
    Throttle({ default: { limit: 20, ttl: 60000 } }), // 20 downloads por minuto
  );
};

/**
 * Rate limiting para geração de thumbnails
 * Moderado para operações que consomem recursos de processamento
 *
 * Limite: 30 thumbnails por minuto
 */
export const ThrottleThumbnail = () => {
  return applyDecorators(
    Throttle({ default: { limit: 30, ttl: 60000 } }), // 30 thumbnails por minuto
  );
};

/**
 * Rate limiting customizável
 * Permite definir limites específicos
 *
 * @param limit - Número máximo de requests
 * @param ttl - Tempo em milissegundos
 */
export const ThrottleCustom = (limit: number, ttl: number) => {
  return applyDecorators(Throttle({ default: { limit, ttl } }));
};

/**
 * Pular rate limiting para endpoints específicos
 * Útil para health checks e métricas
 */
export const SkipThrottle = () => {
  return applyDecorators(Throttle({ default: { limit: 0, ttl: 0 } }));
};
