// src/auth/strategies/jwt-auth.strategy.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { readFileSync } from 'fs';
import { join } from 'path';

import { STRATEGY_JWT_AUTH } from '../constants/strategy.constant';
import { UserAccessTokenClaims } from '../dtos/auth-token-output.dto';

@Injectable()
export class JwtAuthStrategy extends PassportStrategy(
  Strategy,
  STRATEGY_JWT_AUTH,
) {
  private readonly logger: Logger;

  constructor(private readonly configService: ConfigService) {
    // Primeiro, carregar a chave pública
    const publicKey = JwtAuthStrategy.loadPublicKey(configService);

    // Configurar a estratégia base com a chave carregada
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: publicKey,
      algorithms: ['RS256'],
      jsonWebTokenOptions: {
        algorithms: ['RS256'],
      },
    });

    // Agora podemos inicializar o logger
    this.logger = new Logger(JwtAuthStrategy.name);
    this.logger.log('Estratégia JWT configurada com sucesso');
  }

  /**
   * Carrega a chave pública de forma segura.
   * Prioriza a variável JWT_PUBLIC_KEY_BASE64. Caso ausente, tenta JWT_PUBLIC_KEY_PATH.
   */
  private static loadPublicKey(configService: ConfigService): string {
    // 1. Tentar carregar via Base64 (cenário recomendado para Kubernetes)
    const keyBase64 = configService.get<string>('JWT_PUBLIC_KEY_BASE64');
    if (keyBase64) {
      try {
        const publicKey = Buffer.from(keyBase64, 'base64')
          .toString('utf8')
          .trim();
        if (!publicKey.includes('BEGIN PUBLIC KEY')) {
          throw new Error('Chave pública Base64 inválida');
        }
        console.log(
          'Chave pública JWT carregada a partir de JWT_PUBLIC_KEY_BASE64',
        );
        return publicKey;
      } catch (error) {
        throw new Error(
          `Falha ao decodificar chave pública Base64: ${error.message}`,
        );
      }
    }

    // 2. Fallback para arquivo local (uso em desenvolvimento)
    const publicKeyPath = configService.get<string>('JWT_PUBLIC_KEY_PATH');
    if (!publicKeyPath) {
      throw new Error(
        'JWT_PUBLIC_KEY_BASE64 ou JWT_PUBLIC_KEY_PATH não configurados',
      );
    }

    try {
      const fullPath = join(process.cwd(), publicKeyPath);
      const publicKey = readFileSync(fullPath, 'utf8').trim();
      if (!publicKey.includes('BEGIN PUBLIC KEY')) {
        throw new Error('Formato inválido para chave pública');
      }
      console.log('Chave pública JWT carregada a partir do arquivo');
      return publicKey;
    } catch (error) {
      throw new Error(
        `Falha ao carregar chave pública JWT do arquivo: ${error.message}`,
      );
    }
  }

  async validate(payload: any): Promise<UserAccessTokenClaims> {
    // Passport automatically creates a user object, based on the value we return from the validate() method,
    // and assigns it to the Request object as req.user

    // Criar o objeto de claims básico
    const claims: UserAccessTokenClaims = {
      id: payload.sub,
      username: payload.username,
      roles: payload.roles,
    };

    // Extrair unidade_id se presente no payload
    if (payload.unidade_id) {
      claims.unidade_id = payload.unidade_id;
    }

    // Extrair permissões se presentes no payload
    if (payload.permissions) {
      claims.permissions = payload.permissions;
    }

    // Extrair escopos de permissões se presentes no payload
    if (payload.permissionScopes) {
      claims.permissionScopes = payload.permissionScopes;
    }

    // Extrair escopo se presente no payload
    if (payload.escopo) {
      claims.escopo = payload.escopo;
    }

    return claims;
  }
}
