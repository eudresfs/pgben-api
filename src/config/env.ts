/**
 * Configuração centralizada de variáveis de ambiente
 * 
 * Este arquivo é responsável por:
 * - Carregar o dotenv de forma consistente
 * - Validar variáveis obrigatórias
 * - Exportar as variáveis de ambiente de forma tipada
 * - Garantir que as configurações estejam disponíveis em qualquer contexto
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Carregar o dotenv o mais cedo possível
// Procura por .env na raiz do projeto
const envPath = resolve(process.cwd(), '.env');
const result = config({ path: envPath });

// Log para debug (apenas em desenvolvimento)
if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
  if (result.error) {
    console.warn(`⚠️  Arquivo .env não encontrado em: ${envPath}`);
    console.warn('Usando variáveis de ambiente do sistema ou valores padrão');
  } else {
    console.log(`✅ Arquivo .env carregado com sucesso de: ${envPath}`);
  }
}

/**
 * Interface para tipagem das variáveis de ambiente
 */
export interface EnvironmentVariables {
  // Banco de dados
  DB_HOST: string;
  DB_PORT: number;
  DB_USER: string;
  DB_PASS: string;
  DB_NAME: string;
  DB_LOGGING: boolean;
  
  // Aplicação
  NODE_ENV: string;
  APP_PORT: number;
  API_PREFIX: string;
  
  // JWT
  JWT_SECRET?: string;
  JWT_REFRESH_SECRET?: string;
  JWT_PRIVATE_KEY_PATH?: string;
  JWT_PUBLIC_KEY_PATH?: string;
  JWT_PRIVATE_KEY_BASE64?: string;
  JWT_PUBLIC_KEY_BASE64?: string;
  JWT_ACCESS_TOKEN_EXPIRES_IN: string;
  JWT_REFRESH_TOKEN_EXPIRES_IN: string;
  JWT_ALGORITHM: string;
  
  // Criptografia
  ENCRYPTION_KEY?: string;
  AUDIT_SIGNING_KEY?: string;
  
  // Email
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM?: string;
  SMTP_FROM_NAME?: string;
  
  // MinIO
  MINIO_ENDPOINT?: string;
  MINIO_PORT?: number;
  MINIO_ACCESS_KEY?: string;
  MINIO_SECRET_KEY?: string;
  MINIO_BUCKET?: string;
  MINIO_USE_SSL?: boolean;
  
  // Redis
  REDIS_HOST?: string;
  REDIS_PORT?: number;
  REDIS_PASSWORD?: string;
  REDIS_DB?: number;
  REDIS_TTL?: number;
  
  // Segurança
  COOKIE_SECRET?: string;
  SESSION_SECRET?: string;
  CSRF_SECRET?: string;
  ALLOWED_ORIGINS?: string;
  ALLOWED_DOMAINS?: string;
  CORS_ORIGIN?: string;
  CORS_CREDENTIALS?: boolean;
  
  // Rate Limiting
  THROTTLE_TTL?: number;
  THROTTLE_LIMIT?: number;
  THROTTLE_LOGIN_LIMIT?: number;
  THROTTLE_REGISTER_LIMIT?: number;
  
  // Logging
  LOG_LEVEL?: string;
  LOG_FILE_PATH?: string;
  LOG_MAX_FILES?: number;
  LOG_MAX_SIZE?: string;
  
  // Notificações SSE
  SSE_HEARTBEAT_INTERVAL?: number;
  SSE_CONNECTION_TIMEOUT?: number;
  SSE_MAX_CONNECTIONS_PER_USER?: number;
  SSE_CLEANUP_INTERVAL?: number;
  SSE_ENABLE_COMPRESSION?: boolean;
  SSE_CORS_ORIGINS?: string;
  
  // Usuário administrador padrão
  DEFAULT_ADMIN_USER_EMAIL?: string;
  DEFAULT_ADMIN_USER_NAME?: string;
  DEFAULT_ADMIN_USER_PASSWORD?: string;
  
  // Desenvolvimento
  DEBUG?: boolean;
  SWAGGER_ENABLED?: boolean;
  API_DOCS_PATH?: string;
  FRONTEND_URL?: string;
}

/**
 * Função para converter string para boolean
 */
function parseBoolean(value: string | undefined, defaultValue: boolean = false): boolean {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

/**
 * Função para converter string para número
 */
function parseNumber(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Variáveis de ambiente tipadas e validadas
 */
export const env: EnvironmentVariables = {
  // Banco de dados - obrigatórias
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseNumber(process.env.DB_PORT, 5432),
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASS: process.env.DB_PASS || 'postgres',
  DB_NAME: process.env.DB_NAME || 'pgben',
  DB_LOGGING: parseBoolean(process.env.DB_LOGGING, false),
  
  // Aplicação
  NODE_ENV: process.env.NODE_ENV || 'development',
  APP_PORT: parseNumber(process.env.APP_PORT, 3000),
  API_PREFIX: process.env.API_PREFIX || '/api/v1',
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_PRIVATE_KEY_PATH: process.env.JWT_PRIVATE_KEY_PATH,
  JWT_PUBLIC_KEY_PATH: process.env.JWT_PUBLIC_KEY_PATH,
  JWT_PRIVATE_KEY_BASE64: process.env.JWT_PRIVATE_KEY_BASE64,
  JWT_PUBLIC_KEY_BASE64: process.env.JWT_PUBLIC_KEY_BASE64,
  JWT_ACCESS_TOKEN_EXPIRES_IN: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '30m',
  JWT_REFRESH_TOKEN_EXPIRES_IN: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d',
  JWT_ALGORITHM: process.env.JWT_ALGORITHM || 'RS256',
  
  // Criptografia
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  AUDIT_SIGNING_KEY: process.env.AUDIT_SIGNING_KEY,
  
  // Email
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: parseNumber(process.env.SMTP_PORT, 587),
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM,
  SMTP_FROM_NAME: process.env.SMTP_FROM_NAME,
  
  // MinIO
  MINIO_ENDPOINT: process.env.MINIO_ENDPOINT,
  MINIO_PORT: parseNumber(process.env.MINIO_PORT, 9000),
  MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY,
  MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY,
  MINIO_BUCKET: process.env.MINIO_BUCKET,
  MINIO_USE_SSL: parseBoolean(process.env.MINIO_USE_SSL, false),
  
  // Redis
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: parseNumber(process.env.REDIS_PORT, 6379),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  REDIS_DB: parseNumber(process.env.REDIS_DB, 0),
  REDIS_TTL: parseNumber(process.env.REDIS_TTL, 3600),
  
  // Segurança
  COOKIE_SECRET: process.env.COOKIE_SECRET,
  SESSION_SECRET: process.env.SESSION_SECRET,
  CSRF_SECRET: process.env.CSRF_SECRET,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
  ALLOWED_DOMAINS: process.env.ALLOWED_DOMAINS,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  CORS_CREDENTIALS: parseBoolean(process.env.CORS_CREDENTIALS, true),
  
  // Rate Limiting
  THROTTLE_TTL: parseNumber(process.env.THROTTLE_TTL, 60),
  THROTTLE_LIMIT: parseNumber(process.env.THROTTLE_LIMIT, 100),
  THROTTLE_LOGIN_LIMIT: parseNumber(process.env.THROTTLE_LOGIN_LIMIT, 5),
  THROTTLE_REGISTER_LIMIT: parseNumber(process.env.THROTTLE_REGISTER_LIMIT, 3),
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL,
  LOG_FILE_PATH: process.env.LOG_FILE_PATH,
  LOG_MAX_FILES: parseNumber(process.env.LOG_MAX_FILES, 30),
  LOG_MAX_SIZE: process.env.LOG_MAX_SIZE,
  
  // Notificações SSE
  SSE_HEARTBEAT_INTERVAL: parseNumber(process.env.SSE_HEARTBEAT_INTERVAL, 30000),
  SSE_CONNECTION_TIMEOUT: parseNumber(process.env.SSE_CONNECTION_TIMEOUT, 300000),
  SSE_MAX_CONNECTIONS_PER_USER: parseNumber(process.env.SSE_MAX_CONNECTIONS_PER_USER, 5),
  SSE_CLEANUP_INTERVAL: parseNumber(process.env.SSE_CLEANUP_INTERVAL, 60000),
  SSE_ENABLE_COMPRESSION: parseBoolean(process.env.SSE_ENABLE_COMPRESSION, true),
  SSE_CORS_ORIGINS: process.env.SSE_CORS_ORIGINS,
  
  // Usuário administrador padrão
  DEFAULT_ADMIN_USER_EMAIL: process.env.DEFAULT_ADMIN_USER_EMAIL,
  DEFAULT_ADMIN_USER_NAME: process.env.DEFAULT_ADMIN_USER_NAME,
  DEFAULT_ADMIN_USER_PASSWORD: process.env.DEFAULT_ADMIN_USER_PASSWORD,
  
  // Desenvolvimento
  DEBUG: parseBoolean(process.env.DEBUG, false),
  SWAGGER_ENABLED: parseBoolean(process.env.SWAGGER_ENABLED, true),
  API_DOCS_PATH: process.env.API_DOCS_PATH,
  FRONTEND_URL: process.env.FRONTEND_URL,
};

/**
 * Função para validar variáveis obrigatórias
 */
export function validateRequiredEnvVars(): void {
  const requiredVars = [
    'DB_HOST',
    'DB_PORT',
    'DB_USER',
    'DB_PASS',
    'DB_NAME'
  ];
  
  const missingVars = requiredVars.filter(varName => {
    const value = env[varName as keyof EnvironmentVariables];
    return value === undefined || value === null || value === '';
  });
  
  if (missingVars.length > 0) {
    console.error('❌ Variáveis de ambiente obrigatórias não encontradas:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\nVerifique se o arquivo .env existe e contém todas as variáveis necessárias.');
    throw new Error(`Variáveis de ambiente obrigatórias não encontradas: ${missingVars.join(', ')}`);
  }
}

// Validar variáveis obrigatórias na inicialização
if (process.env.NODE_ENV !== 'test') {
  validateRequiredEnvVars();
}

// Log das configurações carregadas (apenas em desenvolvimento)
if (env.DEBUG || env.NODE_ENV === 'development') {
  console.log('🔧 Configurações de ambiente carregadas:');
  console.log(`   - DB_HOST: ${env.DB_HOST}`);
  console.log(`   - DB_NAME: ${env.DB_NAME}`);
  console.log(`   - NODE_ENV: ${env.NODE_ENV}`);
  console.log(`   - APP_PORT: ${env.APP_PORT}`);
}
