import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

/**
 * Estratégia de autenticação JWT
 * 
 * Responsável por validar o token JWT e extrair as informações do usuário
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'secretkey'),
    });
  }

  /**
   * Valida o payload do token JWT e retorna os dados do usuário
   * @param payload Payload do token JWT
   * @returns Dados do usuário
   */
  async validate(payload: any) {
    // Verifica se o payload contém as informações necessárias
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Token inválido');
    }

    // Retorna os dados do usuário
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      unidadeId: payload.unidadeId,
      setorId: payload.setorId,
    };
  }
}
