import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { INestApplication, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Configuração de Segurança para o PGBen
 *
 * Implementa configurações robustas de segurança incluindo:
 * - Cookies seguros com httpOnly, secure e sameSite
 * - Headers de segurança HTTP com Helmet
 * - Configurações CORS apropriadas
 * - Proteção contra ataques comuns (XSS, CSRF, Clickjacking, etc.)
 * - Rate limiting headers
 * - Nonce generation para CSP
 */

// Types para melhor type safety
interface SecurityConfig {
  isProduction: boolean;
  cookieSecret: string;
  sessionSecret: string;
  allowedOrigins: string[];
  apiVersion: string;
}

interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: boolean | 'lax' | 'strict' | 'none';
  maxAge?: number;
  path: string;
  domain?: string;
}

// Logger dedicado para segurança
const securityLogger = new Logger('SecurityConfig');

/**
 * Extrai configurações de segurança do ConfigService
 */
const getSecurityConfig = (configService: ConfigService): SecurityConfig => {
  const isProduction = configService.get<string>('NODE_ENV') === 'production';

  // Validar secrets em produção
  const cookieSecret = configService.get<string>('COOKIE_SECRET');
  const sessionSecret = configService.get<string>('SESSION_SECRET');

  if (isProduction && (!cookieSecret || !sessionSecret)) {
    throw new Error(
      'COOKIE_SECRET e SESSION_SECRET são obrigatórios em produção',
    );
  }

  return {
    isProduction,
    cookieSecret: cookieSecret || generateSecureSecret(),
    sessionSecret: sessionSecret || generateSecureSecret(),
    allowedOrigins: configService
      .get<string>('ALLOWED_ORIGINS', 'http://localhost:3001')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    apiVersion: configService.get<string>('API_VERSION', '1.0.0'),
  };
};

/**
 * Gera um secret seguro para desenvolvimento
 */
const generateSecureSecret = (): string => {
  const secret = crypto.randomBytes(32).toString('hex');
  securityLogger.warn(
    `Secret gerado automaticamente para desenvolvimento: ${secret.substring(0, 8)}...`,
  );
  return secret;
};

/**
 * Configuração de cookies seguros aprimorada
 */
export const createSecureCookieConfig = (configService: ConfigService) => {
  const { cookieSecret } = getSecurityConfig(configService);

  return {
    secret: cookieSecret,
    signed: true,
  };
};

/**
 * Gera um nonce único para CSP
 */
const generateNonce = (): string => {
  return crypto.randomBytes(16).toString('base64');
};

/**
 * Configuração do Helmet aprimorada com CSP dinâmico
 */
export const createHelmetConfig = (configService: ConfigService) => {
  const { isProduction } = getSecurityConfig(configService);

  return {
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          // Adicionar nonce dinâmico para scripts inline se necessário
          (req: any, res: any) => `'nonce-${res.locals.nonce}'`,
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // Considerar remover em produção
          'https://fonts.googleapis.com',
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        connectSrc: ["'self'", 'wss:', 'https:'],
        mediaSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        workerSrc: ["'self'", 'blob:'],
        childSrc: ["'none'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        manifestSrc: ["'self'"],
        ...(isProduction && {
          upgradeInsecureRequests: [],
          blockAllMixedContent: [],
        }),
      },
      reportOnly: false,
    },

    // Cross-Origin policies
    crossOriginEmbedderPolicy: isProduction,
    crossOriginOpenerPolicy: { policy: 'same-origin' as const },
    crossOriginResourcePolicy: { policy: 'same-origin' as const },

    // HSTS com configurações mais rigorosas
    hsts: {
      maxAge: 63072000, // 2 anos
      includeSubDomains: true,
      preload: true,
    },

    // Headers de segurança adicionais
    noSniff: true,
    originAgentCluster: true,
    dnsPrefetchControl: { allow: false },
    ieNoOpen: true,
    frameguard: { action: 'deny' as const },
    permittedCrossDomainPolicies: false,
    hidePoweredBy: true,
    xssFilter: false, // Deprecado no Helmet v5+, CSP é mais efetivo

    // Referrer Policy mais restritiva
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' as const },
  };
};

/**
 * Configuração CORS aprimorada com validação mais robusta
 */
export const createCorsConfig = (configService: ConfigService) => {
  const { isProduction, allowedOrigins } = getSecurityConfig(configService);

  // Validar e normalizar origins
  const normalizedOrigins = allowedOrigins
    .map((origin) => {
      try {
        const url = new URL(origin);
        return url.origin;
      } catch {
        securityLogger.warn(`Origin inválida ignorada: ${origin}`);
        return null;
      }
    })
    .filter(Boolean) as string[];

  return {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Permitir requests sem origin apenas em desenvolvimento
      if (!origin) {
        return callback(null, !isProduction);
      }

      // Verificar origin contra lista permitida
      const isAllowed = normalizedOrigins.some((allowed) => {
        // Suporte para wildcards simples
        if (allowed.includes('*')) {
          const pattern = allowed.replace(/\*/g, '.*');
          return new RegExp(`^${pattern}$`).test(origin);
        }
        return allowed === origin;
      });

      if (isAllowed) {
        return callback(null, true);
      }

      // Log de tentativas bloqueadas
      securityLogger.warn(`CORS bloqueou origin não autorizada: ${origin}`);
      return callback(new Error('Não permitido pelo CORS'), false);
    },

    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-CSRF-Token',
      'X-API-Key',
      'X-Request-ID',
    ],
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'X-Request-ID',
      'X-Response-Time',
    ],
    maxAge: 86400, // 24 horas de cache para preflight
    optionsSuccessStatus: 204,
  };
};

/**
 * Configuração de sessão segura aprimorada
 */
export const createSessionConfig = (configService: ConfigService) => {
  const { isProduction, sessionSecret } = getSecurityConfig(configService);

  return {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true, // Renovar sessão em cada request
    proxy: isProduction, // Trust proxy em produção
    cookie: {
      secure: isProduction,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 horas
      sameSite: isProduction ? ('strict' as const) : ('lax' as const),
      path: '/',
      // domain: configService.get<string>('COOKIE_DOMAIN'), // Se necessário
    },
    name: 'pgben.sid',
    genid: () => crypto.randomBytes(16).toString('hex'), // ID de sessão seguro
  };
};

/**
 * Middleware para adicionar nonce ao response locals
 */
const nonceMiddleware = (req: any, res: any, next: any) => {
  res.locals.nonce = generateNonce();
  next();
};

/**
 * Middleware de segurança customizado aprimorado
 */
const createSecurityMiddleware = (config: SecurityConfig) => {
  return (req: any, res: any, next: any) => {
    // Request ID para rastreamento
    const requestId =
      req.headers['x-request-id'] || crypto.randomBytes(16).toString('hex');
    req.id = requestId;
    res.setHeader('X-Request-ID', requestId);

    // Remover headers sensíveis
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');

    // Headers customizados
    res.setHeader('X-API-Version', config.apiVersion);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '0'); // Desabilitado em favor de CSP

    // Cache control para recursos sensíveis
    const sensitiveRoutes = ['/auth', '/admin', '/api/users', '/api/sessions'];
    if (sensitiveRoutes.some((route) => req.path.startsWith(route))) {
      res.setHeader(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, private',
      );
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
    }

    // Timing attack prevention
    res.setHeader('X-Response-Time', Date.now().toString());

    // Log de segurança para requests suspeitos
    if (
      req.headers['x-forwarded-for'] &&
      req.headers['x-forwarded-for'].split(',').length > 3
    ) {
      securityLogger.warn(
        `Possível proxy chain suspeito: ${req.headers['x-forwarded-for']}`,
      );
    }

    next();
  };
};

/**
 * Aplicar todas as configurações de segurança na aplicação
 */
export const applySecurity = async (
  app: INestApplication,
  configService: ConfigService,
) => {
  try {
    const securityConfig = getSecurityConfig(configService);

    // 1. Nonce middleware (deve vir primeiro)
    app.use(nonceMiddleware);

    // 2. Cookie parser
    const cookieConfig = createSecureCookieConfig(configService);
    app.use(cookieParser(cookieConfig.secret));

    // 3. Helmet com configurações robustas
    try {
      const helmetConfig = createHelmetConfig(configService);
      app.use(helmet(helmetConfig));
      securityLogger.log(
        '   - Headers de segurança (Helmet) aplicados com sucesso',
      );
    } catch (error) {
      securityLogger.warn(
        '   - Erro ao aplicar Helmet com configuração completa:',
        error.message,
      );
      securityLogger.warn('   - Aplicando Helmet com configuração padrão');

      // Fallback para configuração padrão do Helmet
      app.use(helmet());
    }

    // 4. CORS com validação aprimorada
    const corsConfig = createCorsConfig(configService);
    app.enableCors(corsConfig);

    // 5. Middleware de segurança customizado
    app.use(createSecurityMiddleware(securityConfig));

    // 6. Trust proxy em produção
    if (securityConfig.isProduction) {
      app.getHttpAdapter().getInstance().set('trust proxy', 1);
    }

    // Log de sucesso
    securityLogger.log('✅ Configurações de segurança aplicadas com sucesso:');
    securityLogger.log(
      `   - Modo: ${securityConfig.isProduction ? 'Produção' : 'Desenvolvimento'}`,
    );
    securityLogger.log('   - Cookies seguros configurados');
    securityLogger.log('   - CORS configurado com validação robusta');
    securityLogger.log('   - Middleware de segurança customizado ativo');
    securityLogger.log(
      `   - Origins permitidas: ${securityConfig.allowedOrigins.join(', ')}`,
    );
  } catch (error) {
    securityLogger.error(
      '❌ Erro ao aplicar configurações de segurança:',
      error,
    );
    throw error;
  }
};

/**
 * Utilitários para cookies seguros aprimorados
 */
export const CookieUtils = {
  /**
   * Criar opções de cookie seguro com valores padrão mais restritivos
   */
  createSecureOptions: (
    configService: ConfigService,
    options?: Partial<CookieOptions>,
  ): CookieOptions => {
    const { isProduction } = getSecurityConfig(configService);

    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000, // 24 horas por padrão
      ...options,
    };
  },

  /**
   * Definir cookie com assinatura
   */
  setSecure: (
    res: any,
    name: string,
    value: string,
    configService: ConfigService,
    options?: Partial<CookieOptions>,
  ) => {
    const cookieOptions = CookieUtils.createSecureOptions(
      configService,
      options,
    );
    res.cookie(name, value, cookieOptions);
  },

  /**
   * Limpar cookie de forma segura
   */
  clearSecure: (
    res: any,
    cookieName: string,
    configService: ConfigService,
    path: string = '/',
  ) => {
    const options = CookieUtils.createSecureOptions(configService, {
      maxAge: 0,
      path,
    });
    res.clearCookie(cookieName, options);
  },

  /**
   * Verificar integridade do cookie
   */
  verify: (signedCookie: string, secret: string): string | false => {
    try {
      const unsigned = cookieParser.signedCookie(signedCookie, secret);
      return unsigned || false;
    } catch {
      return false;
    }
  },
};

/**
 * Constantes de segurança expandidas
 */
export const SECURITY_CONSTANTS = {
  COOKIE_NAMES: {
    ACCESS_TOKEN: 'pgben_access_token',
    REFRESH_TOKEN: 'pgben_refresh_token',
    SESSION: 'pgben_session',
    CSRF: 'pgben_csrf_token',
    DEVICE_ID: 'pgben_device_id',
    REMEMBER_ME: 'pgben_remember_me',
  },

  HEADERS: {
    CSRF_TOKEN: 'X-CSRF-Token',
    API_VERSION: 'X-API-Version',
    API_KEY: 'X-API-Key',
    REQUEST_ID: 'X-Request-ID',
    DEVICE_ID: 'X-Device-ID',
    CLIENT_VERSION: 'X-Client-Version',
    RATE_LIMIT: {
      LIMIT: 'X-RateLimit-Limit',
      REMAINING: 'X-RateLimit-Remaining',
      RESET: 'X-RateLimit-Reset',
      RETRY_AFTER: 'Retry-After',
    },
  },

  TIMEOUTS: {
    ACCESS_TOKEN: 15 * 60 * 1000, // 15 minutos
    REFRESH_TOKEN: 7 * 24 * 60 * 60 * 1000, // 7 dias
    SESSION: 24 * 60 * 60 * 1000, // 24 horas
    CSRF: 60 * 60 * 1000, // 1 hora
    REMEMBER_ME: 30 * 24 * 60 * 60 * 1000, // 30 dias
    DEVICE_TRUST: 90 * 24 * 60 * 60 * 1000, // 90 dias
  },

  LIMITS: {
    MAX_LOGIN_ATTEMPTS: 5,
    LOGIN_WINDOW_MS: 15 * 60 * 1000, // 15 minutos
    PASSWORD_MIN_LENGTH: 8,
    SESSION_MAX_AGE: 24 * 60 * 60 * 1000, // 24 horas
    TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutos antes de expirar
  },

  PATTERNS: {
    // Regex para validação
    STRONG_PASSWORD:
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  },
};

/**
 * Helpers de segurança adicionais
 */
export const SecurityHelpers = {
  /**
   * Gera um token CSRF seguro
   */
  generateCSRFToken: (): string => {
    return crypto.randomBytes(32).toString('hex');
  },

  /**
   * Valida um token CSRF
   */
  validateCSRFToken: (token: string, storedToken: string): boolean => {
    if (!token || !storedToken) {
      return false;
    }

    // Comparação timing-safe
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(storedToken));
  },

  /**
   * Hash de senha com salt
   */
  hashPassword: async (password: string): Promise<string> => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto
      .pbkdf2Sync(password, salt, 10000, 64, 'sha512')
      .toString('hex');
    return `${salt}:${hash}`;
  },

  /**
   * Verifica senha hasheada
   */
  verifyPassword: async (
    password: string,
    hashedPassword: string,
  ): Promise<boolean> => {
    const [salt, hash] = hashedPassword.split(':');
    if (!salt || !hash) {
      return false;
    }

    const verifyHash = crypto
      .pbkdf2Sync(password, salt, 10000, 64, 'sha512')
      .toString('hex');

    // Comparação timing-safe
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(verifyHash));
  },

  /**
   * Sanitiza input para prevenir injeções
   */
  sanitizeInput: (input: string): string => {
    return input
      .replace(/[<>]/g, '') // Remove tags HTML básicas
      .replace(/javascript:/gi, '') // Remove tentativas de XSS
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  },

  /**
   * Gera um ID de dispositivo único
   */
  generateDeviceId: (): string => {
    return crypto.randomBytes(32).toString('hex');
  },
};

/**
 * Middleware para rate limiting headers
 * (Para ser usado com um rate limiter real como express-rate-limit)
 */
export const createRateLimitHeaders = (limit: number, windowMs: number) => {
  return (req: any, res: any, next: any) => {
    res.setHeader(
      SECURITY_CONSTANTS.HEADERS.RATE_LIMIT.LIMIT,
      limit.toString(),
    );
    res.setHeader(
      SECURITY_CONSTANTS.HEADERS.RATE_LIMIT.REMAINING,
      (limit - (req.rateLimit?.count || 0)).toString(),
    );
    res.setHeader(
      SECURITY_CONSTANTS.HEADERS.RATE_LIMIT.RESET,
      new Date(Date.now() + windowMs).toISOString(),
    );
    next();
  };
};

export default {
  applySecurity,
  createSecureCookieConfig,
  createHelmetConfig,
  createCorsConfig,
  createSessionConfig,
  CookieUtils,
  SECURITY_CONSTANTS,
  SecurityHelpers,
  createRateLimitHeaders,
};
