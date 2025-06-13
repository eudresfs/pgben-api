import { ConfigService } from '@nestjs/config';
import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { createRedisInstance } from './redis.config';

/**
 * Configurações de performance para rate limiting e throttling
 * otimizadas para o sistema SEMTAS.
 */
export const getPerformanceConfig = (
  configService: ConfigService,
): {
  throttler: ThrottlerModuleOptions;
  compression: any;
  helmet: any;
} => {
  const isProduction = configService.get('NODE_ENV') === 'production';
  const isDevelopment = configService.get('NODE_ENV') === 'development';

  return {
    // Configuração otimizada do Throttler
    throttler: {
      throttlers: [
        {
          name: 'short',
          ttl: 1000, // 1 segundo
          limit: isProduction ? 20 : 100, // Mais restritivo em produção
        },
        {
          name: 'medium',
          ttl: 10000, // 10 segundos
          limit: isProduction ? 100 : 500,
        },
        {
          name: 'long',
          ttl: 60000, // 1 minuto
          limit: isProduction ? 500 : 1000,
        },
        {
          name: 'auth',
          ttl: 900000, // 15 minutos
          limit: 5, // Máximo 5 tentativas de login por 15 min
        },
      ],
      storage: configService.get('REDIS_HOST') 
        ? new ThrottlerStorageRedisService(createRedisInstance(configService))
        : undefined, // Usa storage padrão em memória quando Redis não está disponível
      ignoreUserAgents: [
        /googlebot/gi,
        /bingbot/gi,
        /slurp/gi,
        /duckduckbot/gi,
      ],
    },

    // Configuração otimizada de compressão
    compression: {
      filter: (req: any, res: any) => {
        // Não comprimir se o cliente não suporta
        if (req.headers['x-no-compression']) {
          return false;
        }
        // Usar compressão padrão
        return true;
      },
      level: isProduction ? 6 : 1, // Nível de compressão otimizado
      threshold: 1024, // Comprimir apenas arquivos > 1KB
      windowBits: 15,
      memLevel: 8,
      strategy: 'Z_DEFAULT_STRATEGY',
    },

    // Configuração otimizada do Helmet
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Desabilitado para compatibilidade
      hsts: {
        maxAge: 31536000, // 1 ano
        includeSubDomains: true,
        preload: true,
      },
      noSniff: true,
      frameguard: { action: 'deny' },
      xssFilter: true,
      referrerPolicy: { policy: 'same-origin' },
      // Configurações específicas para desenvolvimento
      ...(isDevelopment && {
        contentSecurityPolicy: false, // Desabilitado em dev
        hsts: false, // Desabilitado em dev
      }),
    },
  };
};

/**
 * Configurações de timeout otimizadas para diferentes tipos de operação
 */
export const getTimeoutConfig = (configService: ConfigService) => {
  const isProduction = configService.get('NODE_ENV') === 'production';

  return {
    // Timeouts para operações de API
    api: {
      default: 10000, // 10s para operações normais
      upload: 60000,  // 1min para uploads
      report: 120000, // 2min para relatórios
      auth: 5000,     // 5s para autenticação
    },

    // Timeouts para operações de banco
    database: {
      query: isProduction ? 10000 : 30000, // Mais restritivo em prod
      transaction: isProduction ? 15000 : 45000,
      migration: 300000, // 5min para migrations
    },

    // Timeouts para operações externas
    external: {
      email: 15000,   // 15s para envio de email
      storage: 30000, // 30s para operações de storage
      api: 10000,     // 10s para APIs externas
    },

    // Timeouts para cache
    cache: {
      get: 1000,      // 1s para buscar do cache
      set: 2000,      // 2s para salvar no cache
      delete: 1000,   // 1s para deletar do cache
    },
  };
};

/**
 * Configurações de retry otimizadas
 */
export const getRetryConfig = (configService: ConfigService) => {
  const isProduction = configService.get('NODE_ENV') === 'production';

  return {
    // Configurações de retry para diferentes operações
    database: {
      attempts: 3,
      delay: 1000,
      backoff: 'exponential',
    },

    email: {
      attempts: isProduction ? 5 : 3,
      delay: 2000,
      backoff: 'exponential',
    },

    storage: {
      attempts: 3,
      delay: 1500,
      backoff: 'linear',
    },

    cache: {
      attempts: 2,
      delay: 500,
      backoff: 'fixed',
    },

    external_api: {
      attempts: 3,
      delay: 1000,
      backoff: 'exponential',
    },
  };
};