import { ConfigService } from '@nestjs/config';

/**
 * Interface para configuração de rate limiting SSE
 */
export interface SseRateLimitConfig {
  /** Configurações para perfil default */
  default: {
    limit: number;
    windowSeconds: number;
    burstLimit: number;
  };
  /** Configurações para perfil admin */
  admin: {
    limit: number;
    windowSeconds: number;
    burstLimit: number;
  };
  /** Configurações para perfil system */
  system: {
    limit: number;
    windowSeconds: number;
    burstLimit: number;
  };
  /** Configurações para perfil premium */
  premium: {
    limit: number;
    windowSeconds: number;
    burstLimit: number;
  };
  /** Lista de IPs na whitelist */
  whitelist: string[];
  /** Se o rate limiting está habilitado */
  enabled: boolean;
}

/**
 * Token de injeção para configuração de rate limiting
 */
export const SSE_RATE_LIMIT_CONFIG = 'SSE_RATE_LIMIT_CONFIG';

/**
 * Factory para criar configuração de rate limiting
 * @param configService Serviço de configuração
 * @returns Configuração de rate limiting
 */
export function createSseRateLimitConfig(
  configService: ConfigService,
): SseRateLimitConfig {
  return {
    enabled: configService.get<boolean>('SSE_RATE_LIMIT_ENABLED', true),

    default: {
      limit: configService.get<number>('SSE_RATE_LIMIT_DEFAULT', 10),
      windowSeconds: configService.get<number>('SSE_RATE_WINDOW_DEFAULT', 60),
      burstLimit: configService.get<number>('SSE_RATE_BURST_DEFAULT', 15),
    },

    admin: {
      limit: configService.get<number>('SSE_RATE_LIMIT_ADMIN', 50),
      windowSeconds: configService.get<number>('SSE_RATE_WINDOW_ADMIN', 60),
      burstLimit: configService.get<number>('SSE_RATE_BURST_ADMIN', 75),
    },

    system: {
      limit: configService.get<number>('SSE_RATE_LIMIT_SYSTEM', 100),
      windowSeconds: configService.get<number>('SSE_RATE_WINDOW_SYSTEM', 60),
      burstLimit: configService.get<number>('SSE_RATE_BURST_SYSTEM', 150),
    },

    premium: {
      limit: configService.get<number>('SSE_RATE_LIMIT_PREMIUM', 25),
      windowSeconds: configService.get<number>('SSE_RATE_WINDOW_PREMIUM', 60),
      burstLimit: configService.get<number>('SSE_RATE_BURST_PREMIUM', 35),
    },

    whitelist: configService
      .get<string>('SSE_RATE_LIMIT_WHITELIST', '127.0.0.1,::1')
      .split(',')
      .map((ip) => ip.trim())
      .filter((ip) => ip.length > 0),
  };
}

/**
 * Validação da configuração de rate limiting
 * @param config Configuração a ser validada
 * @throws Error se a configuração for inválida
 */
export function validateSseRateLimitConfig(config: SseRateLimitConfig): void {
  const profiles = ['default', 'admin', 'system', 'premium'] as const;

  for (const profile of profiles) {
    const profileConfig = config[profile];

    if (profileConfig.limit <= 0) {
      throw new Error(`Rate limit para perfil ${profile} deve ser maior que 0`);
    }

    if (profileConfig.windowSeconds <= 0) {
      throw new Error(
        `Window seconds para perfil ${profile} deve ser maior que 0`,
      );
    }

    if (profileConfig.burstLimit < profileConfig.limit) {
      throw new Error(
        `Burst limit para perfil ${profile} deve ser maior ou igual ao limit`,
      );
    }
  }

  // Validar IPs da whitelist
  for (const ip of config.whitelist) {
    if (!isValidIP(ip)) {
      throw new Error(`IP inválido na whitelist: ${ip}`);
    }
  }
}

/**
 * Validação básica de IP
 * @param ip Endereço IP
 * @returns Se o IP é válido
 */
function isValidIP(ip: string): boolean {
  // Regex básico para IPv4 e IPv6
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Configurações padrão para desenvolvimento
 */
export const DEFAULT_SSE_RATE_LIMIT_CONFIG: SseRateLimitConfig = {
  enabled: true,

  default: {
    limit: 10,
    windowSeconds: 60,
    burstLimit: 15,
  },

  admin: {
    limit: 50,
    windowSeconds: 60,
    burstLimit: 75,
  },

  system: {
    limit: 100,
    windowSeconds: 60,
    burstLimit: 150,
  },

  premium: {
    limit: 25,
    windowSeconds: 60,
    burstLimit: 35,
  },

  whitelist: ['127.0.0.1', '::1'],
};

/**
 * Configurações para produção (mais restritivas)
 */
export const PRODUCTION_SSE_RATE_LIMIT_CONFIG: SseRateLimitConfig = {
  enabled: true,

  default: {
    limit: 5,
    windowSeconds: 60,
    burstLimit: 8,
  },

  admin: {
    limit: 30,
    windowSeconds: 60,
    burstLimit: 45,
  },

  system: {
    limit: 50,
    windowSeconds: 60,
    burstLimit: 75,
  },

  premium: {
    limit: 15,
    windowSeconds: 60,
    burstLimit: 20,
  },

  whitelist: ['127.0.0.1'],
};
