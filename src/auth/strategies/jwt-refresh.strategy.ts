import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { STRATEGY_JWT_REFRESH } from '../constants/strategy.constant';
import { UserRefreshTokenClaims } from '../dtos/auth-token-output.dto';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  STRATEGY_JWT_REFRESH,
) {
  constructor(private readonly configService: ConfigService) {
    // Obter a chave pública do ambiente
    const publicKeyBase64 = configService.get<string>('JWT_PUBLIC_KEY_BASE64');

    if (!publicKeyBase64) {
      throw new Error('JWT_PUBLIC_KEY_BASE64 não está configurado');
    }

    // Decodificar a chave pública
    const publicKey = Buffer.from(publicKeyBase64, 'base64')
      .toString('utf8')
      .trim();

    console.log(
      'Configurando JWT Refresh Strategy com chave pública',
    );

    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: publicKey,
      algorithms: ['RS256'],
      jsonWebTokenOptions: {
        algorithms: ['RS256'],
      },
    });
  }

  async validate(payload: any): Promise<UserRefreshTokenClaims> {
    // Passport automatically creates a user object, based on the value we return from the validate() method,
    // and assigns it to the Request object as req.user
    return { id: payload.sub };
  }
}
