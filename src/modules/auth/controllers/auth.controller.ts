import { Controller, Post, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { Public } from '../decorators/public.decorator';

/**
 * Controlador de autenticação
 * 
 * Responsável por gerenciar as rotas de autenticação e autorização dos usuários no sistema
 */
@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Realiza o login do usuário
   * @param loginDto DTO com as credenciais do usuário
   * @returns Tokens de acesso e atualização
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autenticação de usuário' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * Renova o token de acesso usando o token de atualização
   * @param refreshTokenDto DTO com o token de atualização
   * @returns Novos tokens de acesso e atualização
   */
  @Public()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar token de acesso' })
  @ApiResponse({ status: 200, description: 'Token renovado com sucesso' })
  @ApiResponse({ status: 401, description: 'Token de atualização inválido' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto);
  }

  /**
   * Solicita a recuperação de senha
   * @param forgotPasswordDto DTO com o email do usuário
   * @returns Mensagem de sucesso
   */
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recuperação de senha' })
  @ApiResponse({ status: 200, description: 'Email de recuperação enviado' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  /**
   * Redefine a senha do usuário
   * @param resetPasswordDto DTO com o token e a nova senha
   * @returns Mensagem de sucesso
   */
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redefinição de senha' })
  @ApiResponse({ status: 200, description: 'Senha redefinida com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Token inválido ou expirado' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  /**
   * Completa o cadastro do usuário no primeiro acesso
   * @param firstAccessDto DTO com os dados do usuário
   * @returns Mensagem de sucesso
   */
  @Public()
  @Post('first-access')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Primeiro acesso (completar cadastro)' })
  @ApiResponse({ status: 200, description: 'Cadastro completado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async firstAccess(@Body() firstAccessDto: any) {
    // Implementação será feita quando o módulo de usuário estiver pronto
    return { message: 'Cadastro completado com sucesso' };
  }
}
