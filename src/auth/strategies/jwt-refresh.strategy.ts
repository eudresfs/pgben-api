import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import { readFileSync } from 'fs';
import { join } from 'path';

import { STRATEGY_JWT_REFRESH } from '../constants/strategy.constant';
import { UserRefreshTokenClaims } from '../dtos/auth-token-output.dto';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  STRATEGY_JWT_REFRESH,
) {
  private readonly logger = new Logger(JwtRefreshStrategy.name);

  constructor(private readonly configService: ConfigService) {
    // Carregar a chave pública antes de configurar a estratégia
    const publicKey = JwtRefreshStrategy.loadPublicKey(configService);

    // Configuração da estratégia
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: publicKey,
      algorithms: ['RS256'],
      jsonWebTokenOptions: {
        algorithms: ['RS256'],
      },
    } as StrategyOptions);
  }

  /**
   * Carrega a chave pública do arquivo especificado em JWT_PUBLIC_KEY_PATH
   */
  private static loadPublicKey(configService: ConfigService): string {
    const publicKeyPath = configService.get<string>('JWT_PUBLIC_KEY_PATH');

    if (!publicKeyPath) {
      throw new Error('JWT_PUBLIC_KEY_PATH não está configurado');
    }

    try {
      // Carregar a chave pública do arquivo
      const publicKey = readFileSync(
        join(process.cwd(), publicKeyPath),
        'utf8',
      ).trim();

      // Validar o formato da chave
      if (
        !publicKey.startsWith('-----BEGIN PUBLIC KEY-----') ||
        !publicKey.endsWith('-----END PUBLIC KEY-----')
      ) {
        throw new Error('Formato de chave pública inválido');
      }

      return publicKey;
    } catch (error) {
      const logger = new Logger(JwtRefreshStrategy.name);
      const errorMessage = `Falha ao carregar a chave pública JWT: ${error.message}`;
      logger.error(errorMessage, error.stack);
      throw new Error(errorMessage);
    }
  }

  /**
   * Valida o payload do token JWT
   * @param payload Payload do token JWT
   * @returns Objeto com as informações do usuário autenticado
   */
  async validate(payload: any): Promise<UserRefreshTokenClaims> {
    // Passport automaticamente cria um objeto user com base no valor retornado do método validate()
    // e o atribui ao objeto Request como req.user
    return { id: payload.sub };
  }
}
