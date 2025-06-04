import { ConfigService } from '@nestjs/config';
import { ThrottlerModuleOptions } from '@nestjs/throttler';

/**
 * Configuração do Rate Limiting para o Sistema SEMTAS
 *
 * Implementa diferentes limites para diferentes tipos de endpoints:
 * - Autenticação: Mais restritivo para prevenir ataques de força bruta
 * - API Geral: Limite padrão para operações normais
 * - Upload: Limite específico para uploads de documentos
 *
 * Utiliza Redis como storage para permitir rate limiting distribuído
 */
export const createThrottlerConfig = (
  configService: ConfigService,
): ThrottlerModuleOptions => {
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // Configuração do throttler com armazenamento em memória
  const config: ThrottlerModuleOptions = {
    throttlers: [
      {
        name: 'default',
        ttl: configService.get<number>('THROTTLE_TTL', 60) * 1000, // Converter para ms
        limit: configService.get<number>('THROTTLE_LIMIT', 100),
      },
      {
        name: 'auth',
        ttl: configService.get<number>('THROTTLE_AUTH_TTL', 300) * 1000, // 5 minutos
        limit: configService.get<number>('THROTTLE_AUTH_LIMIT', 5), // 5 tentativas por 5 min
      },
      {
        name: 'upload',
        ttl: configService.get<number>('THROTTLE_UPLOAD_TTL', 60) * 1000, // 1 minuto
        limit: configService.get<number>('THROTTLE_UPLOAD_LIMIT', 10), // 10 uploads por minuto
      },
      {
        name: 'api',
        ttl: configService.get<number>('THROTTLE_API_TTL', 60) * 1000, // 1 minuto
        limit: configService.get<number>('THROTTLE_API_LIMIT', 200), // 200 requests por minuto
      },
    ],
    skipIf: (context) => {
      // Pular rate limiting em desenvolvimento se configurado
      if (nodeEnv === 'development') {
        const skipInDev = configService.get<boolean>(
          'THROTTLE_SKIP_DEV',
          false,
        );
        if (skipInDev) {
          return true;
        }
      }

      // Pular para health checks
      const request = context.switchToHttp().getRequest();
      const isHealthCheck =
        request.url?.includes('/health') ||
        request.url?.includes('/metrics') ||
        request.url?.includes('/status');

      return isHealthCheck;
    },
    errorMessage: 'Muitas tentativas. Tente novamente em alguns minutos.',
  };

  console.log('ℹ️ Rate limiting configurado com armazenamento em memória');
  return config;
};

/**
 * Configuração de rate limiting específica para endpoints de autenticação
 */
export const AUTH_THROTTLE_CONFIG = {
  default: {
    limit: 5,
    ttl: 300000, // 5 minutos em ms
  },
};

/**
 * Configuração de rate limiting específica para uploads
 */
export const UPLOAD_THROTTLE_CONFIG = {
  default: {
    limit: 10,
    ttl: 60000, // 1 minuto em ms
  },
};

/**
 * Configuração de rate limiting específica para API geral
 */
export const API_THROTTLE_CONFIG = {
  default: {
    limit: 200,
    ttl: 60000, // 1 minuto em ms
  },
};

/**
 * Utilitário para obter IP real do cliente considerando proxies
 */
export const getClientIp = (request: any): string => {
  return (
    request.headers['x-forwarded-for']?.split(',')[0] ||
    request.headers['x-real-ip'] ||
    request.connection?.remoteAddress ||
    request.socket?.remoteAddress ||
    request.ip ||
    'unknown'
  );
};

/**
 * Configuração de headers de resposta para rate limiting
 */
export const RATE_LIMIT_HEADERS = {
  LIMIT: 'X-RateLimit-Limit',
  REMAINING: 'X-RateLimit-Remaining',
  RESET: 'X-RateLimit-Reset',
  RETRY_AFTER: 'Retry-After',
};
