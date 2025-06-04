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
   * Carrega a chave pública do arquivo especificado nas configurações
   */
  private static loadPublicKey(configService: ConfigService): string {
    // Obter o caminho para a chave pública
    const publicKeyPath = configService.get<string>('JWT_PUBLIC_KEY_PATH');

    if (!publicKeyPath) {
      throw new Error('JWT_PUBLIC_KEY_PATH não está configurado');
    }

    // Construir o caminho absoluto para a chave pública
    const projectRoot = process.cwd();
    const fullPublicKeyPath = join(projectRoot, publicKeyPath);

    // Carregar a chave pública do arquivo
    try {
      const publicKey = readFileSync(fullPublicKeyPath, 'utf8').trim();

      // Validar o formato da chave
      if (
        !publicKey.includes('BEGIN PUBLIC KEY') &&
        !publicKey.includes('BEGIN RSA PUBLIC KEY')
      ) {
        throw new Error('Formato inválido para chave pública');
      }

      // Usar console.log temporariamente, pois o logger ainda não está disponível
      console.log('Chave pública JWT carregada com sucesso');
      console.debug(`Caminho da chave pública: ${fullPublicKeyPath}`);
      console.debug(`Tamanho da chave: ${publicKey.length} caracteres`);

      return publicKey;
    } catch (error) {
      console.error(`Falha ao carregar a chave pública JWT: ${error.message}`);
      console.error(`Caminho da chave: ${fullPublicKeyPath}`);
      throw new Error(
        `Falha ao carregar a chave pública JWT: ${error.message}`,
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

    return claims;
  }
}
