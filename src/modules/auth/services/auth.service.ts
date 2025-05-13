import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';

/**
 * Serviço de autenticação
 * 
 * Responsável por gerenciar a autenticação e autorização dos usuários no sistema,
 * incluindo login, refresh token, recuperação de senha e controle de acesso.
 */
@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Valida as credenciais do usuário
   * @param email Email do usuário
   * @param senha Senha do usuário
   * @returns Dados do usuário autenticado
   */
  async validateUser(email: string, senha: string): Promise<any> {
    // Implementação será feita quando o módulo de usuário estiver pronto
    // Este é apenas um placeholder para a estrutura da API
    
    // Buscar usuário pelo email
    const user = { id: '1', email, senha: await bcrypt.hash('senha', 10), role: 'administrador' };
    
    // Verificar se o usuário existe e a senha está correta
    if (user && await bcrypt.compare(senha, user.senha)) {
      const { senha, ...result } = user;
      return result;
    }
    
    return null;
  }

  /**
   * Realiza o login do usuário
   * @param loginDto DTO com as credenciais do usuário
   * @returns Tokens de acesso e atualização
   */
  async login(loginDto: LoginDto) {
    // Validar credenciais
    const user = await this.validateUser(loginDto.email, loginDto.senha);
    
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    
    // Gerar tokens
    const tokens = this.generateTokens(user);
    
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      }
    };
  }

  /**
   * Renova o token de acesso usando o token de atualização
   * @param refreshTokenDto DTO com o token de atualização
   * @returns Novos tokens de acesso e atualização
   */
  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    try {
      // Verificar se o token de atualização é válido
      const payload = this.jwtService.verify(refreshTokenDto.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'refreshsecretkey'),
      });
      
      // Gerar novos tokens
      const tokens = this.generateTokens({
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      });
      
      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Token de atualização inválido');
    }
  }

  /**
   * Solicita a recuperação de senha
   * @param forgotPasswordDto DTO com o email do usuário
   * @returns Mensagem de sucesso
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    // Implementação será feita quando o módulo de usuário estiver pronto
    // Este é apenas um placeholder para a estrutura da API
    
    // Verificar se o email existe
    const userExists = true;
    
    if (!userExists) {
      // Não informamos que o email não existe por questões de segurança
      return { message: 'Se o email estiver cadastrado, você receberá instruções para redefinir sua senha' };
    }
    
    // Gerar token de recuperação de senha
    const resetToken = Math.random().toString(36).substring(2, 15);
    
    // Enviar email com o token (será implementado posteriormente)
    
    return { message: 'Se o email estiver cadastrado, você receberá instruções para redefinir sua senha' };
  }

  /**
   * Redefine a senha do usuário
   * @param resetPasswordDto DTO com o token e a nova senha
   * @returns Mensagem de sucesso
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    // Implementação será feita quando o módulo de usuário estiver pronto
    // Este é apenas um placeholder para a estrutura da API
    
    // Verificar se as senhas coincidem
    if (resetPasswordDto.senha !== resetPasswordDto.confirmacaoSenha) {
      throw new BadRequestException('As senhas não coincidem');
    }
    
    // Verificar se o token é válido
    const tokenValid = true;
    
    if (!tokenValid) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
    
    // Atualizar a senha do usuário
    
    return { message: 'Senha redefinida com sucesso' };
  }

  /**
   * Gera tokens de acesso e atualização para o usuário
   * @param user Dados do usuário
   * @returns Tokens de acesso e atualização
   */
  private generateTokens(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    
    return {
      accessToken: this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_SECRET', 'secretkey'),
        expiresIn: this.configService.get<string>('JWT_EXPIRATION', '15m'),
      }),
      refreshToken: this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'refreshsecretkey'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d'),
      }),
    };
  }
}
