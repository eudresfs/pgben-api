// src/auth/strategies/jwt-auth.strategy.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { STRATEGY_JWT_AUTH } from '../constants/strategy.constant';
import { UserAccessTokenClaims } from '../dtos/auth-token-output.dto';

@Injectable()
export class JwtAuthStrategy extends PassportStrategy(
  Strategy,
  STRATEGY_JWT_AUTH,
) {
  constructor(private readonly configService: ConfigService) {
    // Obter a chave pública do ambiente
    const publicKeyBase64 = configService.get<string>('JWT_PUBLIC_KEY_BASE64');
    
    if (!publicKeyBase64) {
      throw new Error('JWT_PUBLIC_KEY_BASE64 não está configurado');
    }
    
    // Decodificar a chave pública
    const publicKey = Buffer.from(publicKeyBase64, 'base64').toString('utf8').trim();
    
    console.log('Configurando JWT Strategy com chave pública (início):', publicKey.substring(0, 50) + '...');
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: publicKey,
      algorithms: ['RS256'],
      jsonWebTokenOptions: {
        algorithms: ['RS256']
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  async validate(payload: any): Promise<UserAccessTokenClaims> {
    // Passport automatically creates a user object, based on the value we return from the validate() method,
    // and assigns it to the Request object as req.user
    return {
      id: payload.sub,
      username: payload.username,
      roles: payload.roles,
    };
  }
}