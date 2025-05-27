import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Ip,
  Headers,
  UseGuards,
  Get,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiHeader,
  ApiBearerAuth,
  ApiExtraModels,
} from '@nestjs/swagger';
import { PasswordRecoveryService } from '../services/password-recovery.service';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  ValidateTokenDto,
  ForgotPasswordResponseDto,
  ResetPasswordResponseDto,
  ValidateTokenResponseDto,
} from '../dto/password-reset.dto';

// Alias para compatibilidade
type ValidateResetTokenDto = ValidateTokenDto;
type ValidateResetTokenResponseDto = ValidateTokenResponseDto;
import { ThrottlePasswordReset, ThrottleCritical } from '../../common/decorators/throttle.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/role.decorator';
import { LoggingInterceptor } from '../../common/interceptors/logging.interceptor';

/**
 * Controller de Recuperação de Senha
 * 
 * Endpoints para gerenciamento de recuperação de senha:
 * - Solicitação de recuperação
 * - Validação de token
 * - Reset de senha
 * - Estatísticas (admin)
 */
@ApiTags('Recuperação de Senha')
@Controller('auth/password-recovery')
@ApiExtraModels(ForgotPasswordDto, ResetPasswordDto, ValidateTokenDto, ForgotPasswordResponseDto, ResetPasswordResponseDto, ValidateTokenResponseDto)
@UseInterceptors(LoggingInterceptor)
export class PasswordRecoveryController {
  constructor(
    private readonly passwordRecoveryService: PasswordRecoveryService,
  ) {}

  /**
   * Solicita recuperação de senha
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ThrottlePasswordReset()
  @ApiOperation({
    summary: 'Solicitar recuperação de senha',
    description: 'Envia um email com instruções para recuperação de senha. Por segurança, sempre retorna sucesso mesmo para emails inexistentes.',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Solicitação processada com sucesso',
    type: ForgotPasswordResponseDto,
  })
  @ApiResponse({
    status: 429,
    description: 'Muitas tentativas - Rate limit excedido',
  })
  @ApiResponse({
    status: 500,
    description: 'Erro interno do servidor',
  })
  @ApiHeader({
    name: 'User-Agent',
    description: 'User Agent do cliente',
    required: false,
  })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
    @Ip() clientIp: string,
    @Headers('user-agent') userAgent?: string,
  ): Promise<ForgotPasswordResponseDto> {
    return this.passwordRecoveryService.forgotPassword(
      forgotPasswordDto,
      clientIp,
      userAgent,
    );
  }

  /**
   * Valida um token de recuperação
   */
  @Post('validate-token')
  @HttpCode(HttpStatus.OK)
  @ThrottlePasswordReset()
  @ApiOperation({
    summary: 'Validar token de recuperação',
    description: 'Verifica se um token de recuperação é válido e não expirou',
  })
  @ApiBody({ type: ValidateTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Status de validação do token',
    type: ValidateTokenResponseDto,
  })
  @ApiResponse({
    status: 429,
    description: 'Muitas tentativas - Rate limit excedido',
  })
  async validateResetToken(
    @Body() validateTokenDto: ValidateTokenDto,
  ): Promise<ValidateTokenResponseDto> {
    return this.passwordRecoveryService.validateResetToken(validateTokenDto);
  }

  /**
   * Reseta a senha usando token válido
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ThrottleCritical()
  @ApiOperation({
    summary: 'Resetar senha',
    description: 'Altera a senha do usuário usando um token válido de recuperação',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Senha alterada com sucesso',
    type: ResetPasswordResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou senhas não coincidem',
  })
  @ApiResponse({
    status: 401,
    description: 'Token inválido, expirado ou limite de tentativas excedido',
  })
  @ApiResponse({
    status: 429,
    description: 'Muitas tentativas - Rate limit excedido',
  })
  @ApiResponse({
    status: 500,
    description: 'Erro interno do servidor',
  })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
    @Ip() clientIp: string,
  ): Promise<ResetPasswordResponseDto> {
    return this.passwordRecoveryService.resetPassword(
      resetPasswordDto,
      clientIp,
    );
  }

  /**
   * Limpa tokens expirados (Admin)
   */
  @Post('cleanup-expired')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Limpar tokens expirados',
    description: 'Remove manualmente tokens de recuperação expirados (apenas administradores)',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens expirados removidos com sucesso',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        deletedCount: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - Permissões insuficientes',
  })
  async cleanupExpiredTokens(): Promise<{
    message: string;
    deletedCount: number;
  }> {
    const deletedCount = await this.passwordRecoveryService.cleanupExpiredTokens();
    
    return {
      message: 'Tokens expirados removidos com sucesso',
      deletedCount,
    };
  }

  /**
   * Obtém estatísticas de tokens (Admin)
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Estatísticas de tokens',
    description: 'Obtém estatísticas dos tokens de recuperação (apenas administradores)',
  })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas dos tokens',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number', description: 'Total de tokens' },
        active: { type: 'number', description: 'Tokens ativos (não usados e não expirados)' },
        expired: { type: 'number', description: 'Tokens expirados' },
        used: { type: 'number', description: 'Tokens já utilizados' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - Permissões insuficientes',
  })
  async getTokenStats(): Promise<{
    total: number;
    active: number;
    expired: number;
    used: number;
  }> {
    return this.passwordRecoveryService.getTokenStats();
  }
}