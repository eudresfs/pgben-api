/**
 * Configurações de segurança para o módulo de documentos
 * 
 * Centraliza todas as configurações relacionadas à segurança,
 * incluindo rate limiting, validação de entrada e controle de acesso.
 */

export interface SecurityConfig {
  rateLimiting: RateLimitConfig;
  validation: ValidationConfig;
  access: AccessConfig;
  audit: AuditConfig;
}

export interface RateLimitConfig {
  downloads: {
    max: number;
    windowMs: number;
  };
  uploads: {
    max: number;
    windowMs: number;
  };
  views: {
    max: number;
    windowMs: number;
  };
  cleanupIntervalMs: number;
}

export interface ValidationConfig {
  maxInputLength: {
    uuid: number;
    filename: number;
    description: number;
    query: number;
    general: number;
  };
  maxBodySize: number;
  maxUserAgentLength: number;
  maxObjectDepth: number;
  suspiciousPatterns: RegExp[];
  dangerousChars: RegExp;
  allowedSortFields: string[];
}

export interface AccessConfig {
  adminRoles: string[];
  analystRoles: string[];
  citizenRoles: string[];
  uploaderRoles: string[];
  verifierRoles: string[];
  requireVerificationForAnalysts: boolean;
  allowOwnerAccess: boolean;
  allowUploaderAccess: boolean;
  allowVerifierAccess: boolean;
}

export interface AuditConfig {
  enableDetailedLogging: boolean;
  logSecurityEvents: boolean;
  logPerformanceMetrics: boolean;
  retentionDays: number;
  sensitiveFieldsToMask: string[];
}

/**
 * Configuração padrão de segurança
 */
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  rateLimiting: {
    downloads: {
      max: 50,
      windowMs: 3600000, // 1 hora
    },
    uploads: {
      max: 20,
      windowMs: 3600000, // 1 hora
    },
    views: {
      max: 200,
      windowMs: 3600000, // 1 hora
    },
    cleanupIntervalMs: 600000, // 10 minutos
  },
  
  validation: {
    maxInputLength: {
      uuid: 36,
      filename: 255,
      description: 1000,
      query: 100,
      general: 500,
    },
    maxBodySize: 50000, // 50KB
    maxUserAgentLength: 500,
    maxObjectDepth: 3,
    suspiciousPatterns: [
      /\.\.[\/\\]/g, // Path traversal
      /<script[^>]*>.*?<\/script>/gi, // XSS básico
      /javascript:/gi, // JavaScript protocol
      /on\w+\s*=/gi, // Event handlers
      /\b(union|select|insert|update|delete|drop|create|alter)\b/gi, // SQL injection básico
      /\$\{.*\}/g, // Template injection
      /\{\{.*\}\}/g, // Template injection
      /%[0-9a-f]{2}/gi, // URL encoding suspeito
      /\\x[0-9a-f]{2}/gi, // Hex encoding
      /\\u[0-9a-f]{4}/gi, // Unicode encoding
    ],
    dangerousChars: /[<>"'&\x00-\x1f\x7f-\x9f]/g,
    allowedSortFields: [
      'createdAt',
      'updatedAt',
      'filename',
      'size',
      'mimetype',
      'verified',
    ],
  },
  
  access: {
    adminRoles: ['ADMIN', 'SUPER_ADMIN'],
    analystRoles: ['ANALISTA'],
    citizenRoles: ['CIDADAO'],
    uploaderRoles: ['FUNCIONARIO', 'ADMIN', 'SUPER_ADMIN'],
    verifierRoles: ['VERIFICADOR', 'ADMIN', 'SUPER_ADMIN'],
    requireVerificationForAnalysts: true,
    allowOwnerAccess: true,
    allowUploaderAccess: true,
    allowVerifierAccess: true,
  },
  
  audit: {
    enableDetailedLogging: true,
    logSecurityEvents: true,
    logPerformanceMetrics: true,
    retentionDays: 90,
    sensitiveFieldsToMask: [
      'password',
      'token',
      'secret',
      'key',
      'hash',
    ],
  },
};

/**
 * Padrões de User-Agent suspeitos
 */
export const SUSPICIOUS_USER_AGENTS = [
  /sqlmap/i,
  /nikto/i,
  /nessus/i,
  /burp/i,
  /nmap/i,
  /masscan/i,
  /zap/i,
  /gobuster/i,
  /dirb/i,
  /curl/i, // Pode ser legítimo, mas suspeito em alguns contextos
  /wget/i, // Pode ser legítimo, mas suspeito em alguns contextos
  /python-requests/i, // Scripts automatizados
  /bot/i, // Bots genéricos
  /crawler/i, // Crawlers
  /spider/i, // Spiders
];

/**
 * Headers HTTP suspeitos
 */
export const SUSPICIOUS_HEADERS = {
  'x-forwarded-for': /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.|169\.254\.|::1|localhost)/,
  'x-real-ip': /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.|169\.254\.|::1|localhost)/,
  'user-agent': SUSPICIOUS_USER_AGENTS,
};

/**
 * Configurações de upload seguro
 */
export const SECURE_UPLOAD_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 1,
  allowedMimeTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  quarantineDirectory: './quarantine',
  scanForMalware: true,
  validateFileHeaders: true,
  generateUniqueNames: true,
  preserveOriginalName: true,
};

/**
 * Configurações de criptografia
 */
export const ENCRYPTION_CONFIG = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,
  ivLength: 16,
  tagLength: 16,
  encryptSensitiveFiles: true,
  encryptionThreshold: 1024 * 1024, // 1MB - arquivos maiores são criptografados
};

/**
 * Configurações de backup e recuperação
 */
export const BACKUP_CONFIG = {
  enableBackup: true,
  backupInterval: 24 * 60 * 60 * 1000, // 24 horas
  retentionPeriod: 30 * 24 * 60 * 60 * 1000, // 30 dias
  compressionLevel: 6,
  encryptBackups: true,
};

/**
 * Função para obter configuração de segurança baseada no ambiente
 */
export function getSecurityConfig(environment: string = 'production'): SecurityConfig {
  const config = { ...DEFAULT_SECURITY_CONFIG };
  
  switch (environment) {
    case 'development':
      // Configurações mais permissivas para desenvolvimento
      config.rateLimiting.downloads.max = 100;
      config.rateLimiting.uploads.max = 50;
      config.rateLimiting.views.max = 500;
      config.audit.enableDetailedLogging = true;
      break;
      
    case 'testing':
      // Configurações para testes
      config.rateLimiting.downloads.max = 1000;
      config.rateLimiting.uploads.max = 1000;
      config.rateLimiting.views.max = 1000;
      config.audit.enableDetailedLogging = false;
      break;
      
    case 'staging':
      // Configurações similares à produção, mas com logs mais detalhados
      config.audit.enableDetailedLogging = true;
      config.audit.logPerformanceMetrics = true;
      break;
      
    case 'production':
    default:
      // Configurações padrão (mais restritivas)
      break;
  }
  
  return config;
}

/**
 * Função para validar configuração de segurança
 */
export function validateSecurityConfig(config: SecurityConfig): string[] {
  const errors: string[] = [];
  
  // Validar rate limiting
  if (config.rateLimiting.downloads.max <= 0) {
    errors.push('Rate limit para downloads deve ser maior que 0');
  }
  
  if (config.rateLimiting.uploads.max <= 0) {
    errors.push('Rate limit para uploads deve ser maior que 0');
  }
  
  if (config.rateLimiting.views.max <= 0) {
    errors.push('Rate limit para visualizações deve ser maior que 0');
  }
  
  // Validar tamanhos
  if (config.validation.maxBodySize <= 0) {
    errors.push('Tamanho máximo do body deve ser maior que 0');
  }
  
  if (config.validation.maxUserAgentLength <= 0) {
    errors.push('Tamanho máximo do User-Agent deve ser maior que 0');
  }
  
  // Validar roles
  if (!config.access.adminRoles || config.access.adminRoles.length === 0) {
    errors.push('Pelo menos uma role de administrador deve ser definida');
  }
  
  // Validar auditoria
  if (config.audit.retentionDays <= 0) {
    errors.push('Período de retenção de auditoria deve ser maior que 0');
  }
  
  return errors;
}