import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ValidationPipe,
  UsePipes,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
  ApiExtraModels,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsString, MinLength, Matches } from 'class-validator';
import { PasswordResetService } from '../services/password-reset.service';
import {
  ResetPasswordDto,
  ForgotPasswordDto as RequestPasswordResetDto,
  ValidateTokenDto,
  ResetPasswordResponseDto,
  ValidateTokenResponseDto,
  PasswordResetStatsDto,
} from '../dto/password-reset.dto';
import { GetClientInfo } from '../../common/decorators/get-client-info.decorator';
import { ClientInfo } from '../../common/interfaces/client-info.interface';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/role.decorator';
import { Role } from '../enums/role.enum';
import { ROLES } from '@/shared/constants/roles.constants';

// Usando DTOs do arquivo password-reset.dto.ts

@ApiTags('Recuperação de Senha')
@Controller('auth/password-reset')
@ApiExtraModels(RequestPasswordResetDto, ResetPasswordDto, ValidateTokenDto, ResetPasswordResponseDto, ValidateTokenResponseDto, PasswordResetStatsDto)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class PasswordResetController {
  constructor(private readonly passwordResetService: PasswordResetService) {}

  @Post('request')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 tentativas por minuto
  @ApiOperation({
    summary: 'Solicitar recuperação de senha',
    description: 'Envia um email com link para redefinir a senha do usuário',
  })
  @ApiBody({ type: RequestPasswordResetDto })
  @ApiResponse({
    status: 200,
    description: 'Solicitação processada com sucesso',
    type: ResetPasswordResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou muitas tentativas',
  })
  @ApiResponse({
    status: 429,
    description: 'Muitas tentativas - rate limit excedido',
  })
  @ApiResponse({
    status: 500,
    description: 'Erro interno do servidor',
  })
  async requestPasswordReset(
    @Body() requestDto: RequestPasswordResetDto,
    @GetClientInfo() clientInfo: ClientInfo,
  ): Promise<any> {
    return this.passwordResetService.requestPasswordReset(requestDto, clientInfo);
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 tentativas por minuto
  @ApiOperation({
    summary: 'Redefinir senha',
    description: 'Redefine a senha do usuário usando o token recebido por email',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Senha redefinida com sucesso',
    type: ResetPasswordResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou senhas não coincidem',
  })
  @ApiResponse({
    status: 401,
    description: 'Token inválido ou expirado',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuário não encontrado',
  })
  @ApiResponse({
    status: 429,
    description: 'Muitas tentativas - rate limit excedido',
  })
  @ApiResponse({
    status: 500,
    description: 'Erro interno do servidor',
  })
  async resetPassword(
    @Body() resetDto: ResetPasswordDto,
    @GetClientInfo() clientInfo: ClientInfo,
  ): Promise<any> {
    return this.passwordResetService.resetPassword(resetDto, clientInfo);
  }

  @Get('validate-token')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 tentativas por minuto
  @ApiOperation({
    summary: 'Validar token de recuperação',
    description: 'Verifica se um token de recuperação é válido e não expirado',
  })
  @ApiQuery({
    name: 'token',
    description: 'Token de recuperação para validação',
    example: 'abc123def456...',
  })
  @ApiResponse({
    status: 200,
    description: 'Status de validação do token',
    type: ValidateTokenResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Token não fornecido',
  })
  @ApiResponse({
    status: 429,
    description: 'Muitas tentativas - rate limit excedido',
  })
  async validateToken(
    @Query('token') token: string,
  ): Promise<ValidateTokenResponseDto> {
    if (!token) {
      throw new BadRequestException('Token é obrigatório');
    }

    return this.passwordResetService.validateToken(token);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN, ROLES.GESTOR)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Estatísticas de recuperação de senha',
    description: 'Obtém estatísticas sobre solicitações de recuperação de senha (apenas admins)',
  })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas obtidas com sucesso',
    type: PasswordResetStatsDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Token de autenticação inválido',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - permissões insuficientes',
  })
  async getPasswordResetStats(): Promise<any> {
    // Convertendo o resultado para o formato esperado pelo DTO
    const stats = await this.passwordResetService.getPasswordResetStats();
    return {
      ...stats,
      successfulResetsLast24h: stats.usedTokens || 0,
      expiredTokensLast24h: stats.expiredTokens || 0,
      successRate: ((stats.usedTokens || 0) / (stats.totalRequests || 1)) * 100,
      uniqueUsersLast24h: stats.requestsLast24h || 0
    };
  }
}