import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../services/auth.service';

/**
 * Estratégia de autenticação local (email/senha)
 * 
 * Responsável por validar as credenciais do usuário
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'senha',
    });
  }

  /**
   * Valida as credenciais do usuário
   * @param email Email do usuário
   * @param senha Senha do usuário
   * @returns Dados do usuário autenticado
   */
  async validate(email: string, senha: string): Promise<any> {
    const user = await this.authService.validateUser(email, senha);
    
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    
    return user;
  }
}
