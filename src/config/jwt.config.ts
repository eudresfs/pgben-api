/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import { readFileSync } from 'fs';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

/**
 * Configuração segura para JWT usando chaves RSA
 * Prioriza carregamento de arquivos sobre chaves em Base64
 */
export const createJwtConfig = (configService: ConfigService): JwtModuleOptions => {
  // Função para carregar chave privada de forma segura
  const getPrivateKey = (): string => {
    const keyPath = configService.get<string>('JWT_PRIVATE_KEY_PATH');
    const keyBase64 = configService.get<string>('JWT_PRIVATE_KEY_BASE64');
    
    if (keyPath) {
      try {
        const fullPath = join(process.cwd(), keyPath);
        const privateKey = readFileSync(fullPath, 'utf8');
        
        if (!privateKey.includes('BEGIN PRIVATE KEY') && !privateKey.includes('BEGIN RSA PRIVATE KEY')) {
          throw new Error('Arquivo de chave privada inválido');
        }
        
        return privateKey;
      } catch (error) {
        throw new Error(`Erro ao carregar chave privada do arquivo ${keyPath}: ${error.message}`);
      }
    }
    
    if (keyBase64) {
      try {
        const privateKey = Buffer.from(keyBase64, 'base64').toString('utf8');
        
        if (!privateKey.includes('BEGIN PRIVATE KEY') && !privateKey.includes('BEGIN RSA PRIVATE KEY')) {
          throw new Error('Chave privada Base64 inválida');
        }
        
        return privateKey;
      } catch (error) {
        throw new Error(`Erro ao decodificar chave privada Base64: ${error.message}`);
      }
    }
    
    throw new Error('Chave privada JWT não configurada. Configure JWT_PRIVATE_KEY_PATH ou JWT_PRIVATE_KEY_BASE64');
  };
  
  // Função para carregar chave pública de forma segura
  const getPublicKey = (): string => {
    const keyPath = configService.get<string>('JWT_PUBLIC_KEY_PATH');
    const keyBase64 = configService.get<string>('JWT_PUBLIC_KEY_BASE64');
    
    if (keyPath) {
      try {
        const fullPath = join(process.cwd(), keyPath);
        const publicKey = readFileSync(fullPath, 'utf8');
        
        if (!publicKey.includes('BEGIN PUBLIC KEY')) {
          throw new Error('Arquivo de chave pública inválido');
        }
        
        return publicKey;
      } catch (error) {
        throw new Error(`Erro ao carregar chave pública do arquivo ${keyPath}: ${error.message}`);
      }
    }
    
    if (keyBase64) {
      try {
        const publicKey = Buffer.from(keyBase64, 'base64').toString('utf8');
        
        if (!publicKey.includes('BEGIN PUBLIC KEY')) {
          throw new Error('Chave pública Base64 inválida');
        }
        
        return publicKey;
      } catch (error) {
        throw new Error(`Erro ao decodificar chave pública Base64: ${error.message}`);
      }
    }
    
    throw new Error('Chave pública JWT não configurada. Configure JWT_PUBLIC_KEY_PATH ou JWT_PUBLIC_KEY_BASE64');
  };
  
  // Validar algoritmo de assinatura
  const algorithm = configService.get<string>('JWT_ALGORITHM', 'RS256');
  if (!['RS256', 'RS384', 'RS512'].includes(algorithm)) {
    throw new Error(`Algoritmo JWT inválido: ${algorithm}. Use RS256, RS384 ou RS512`);
  }
  
  // Validar tempo de expiração
  const expiresIn = configService.get<string>('JWT_ACCESS_TOKEN_EXPIRES_IN', '15m');
  const refreshExpiresIn = configService.get<string>('JWT_REFRESH_TOKEN_EXPIRES_IN', '7d');
  
  // Configuração final do JWT
  return {
    privateKey: getPrivateKey(),
    publicKey: getPublicKey(),
    signOptions: {
      algorithm: algorithm as 'RS256' | 'RS384' | 'RS512',
      expiresIn: expiresIn,
      issuer: configService.get<string>('APP_NAME', 'PGBEN'),
      audience: configService.get<string>('FRONTEND_URL', 'http://localhost:3001'),
    },
    verifyOptions: {
      algorithms: [algorithm as 'RS256' | 'RS384' | 'RS512'],
      issuer: configService.get<string>('APP_NAME', 'PGBEN'),
      audience: configService.get<string>('FRONTEND_URL', 'http://localhost:3001'),
    },
  };
};

/**
 * Configuração específica para tokens de refresh
 */
export const createJwtRefreshConfig = (configService: ConfigService): JwtModuleOptions => {
  const baseConfig = createJwtConfig(configService);
  
  return {
    ...baseConfig,
    signOptions: {
      ...baseConfig.signOptions,
      expiresIn: configService.get<string>('JWT_REFRESH_TOKEN_EXPIRES_IN', '7d'),
    },
  };
};

/**
 * Utilitário para validar configuração JWT na inicialização
 */
export const validateJwtConfig = (configService: ConfigService): void => {
  try {
    createJwtConfig(configService);
    console.log('✅ Configuração JWT validada com sucesso');
  } catch (error) {
    console.error('❌ Erro na configuração JWT:', error.message);
    throw error;
  }
};