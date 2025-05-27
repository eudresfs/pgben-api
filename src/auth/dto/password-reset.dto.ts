// src/auth/dto/password-reset.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsNotEmpty,
  IsUUID,
} from 'class-validator';

/**
 * DTO para solicitação de recuperação de senha
 */
export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email do usuário para recuperação de senha',
    example: 'usuario@semtas.gov.br',
    format: 'email',
  })
  @IsEmail({}, { message: 'Email deve ter um formato válido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;
}

/**
 * DTO para redefinição de senha
 */
export class ResetPasswordDto {
  @ApiProperty({
    description: 'Token de recuperação de senha',
    example: 'abc123def456ghi789',
    minLength: 32,
    maxLength: 128,
  })
  @IsString({ message: 'Token deve ser uma string' })
  @IsNotEmpty({ message: 'Token é obrigatório' })
  @MinLength(32, { message: 'Token deve ter pelo menos 32 caracteres' })
  @MaxLength(128, { message: 'Token deve ter no máximo 128 caracteres' })
  token: string;

  @ApiProperty({
    description: 'Nova senha do usuário',
    example: 'MinhaNovaSenh@123',
    minLength: 8,
    maxLength: 128,
  })
  @IsString({ message: 'Senha deve ser uma string' })
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @MinLength(8, { message: 'Senha deve ter pelo menos 8 caracteres' })
  @MaxLength(128, { message: 'Senha deve ter no máximo 128 caracteres' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    {
      message:
        'Senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula, 1 número e 1 caractere especial',
    },
  )
  newPassword: string;

  @ApiProperty({
    description: 'Confirmação da nova senha',
    example: 'MinhaNovaSenh@123',
  })
  @IsString({ message: 'Confirmação de senha deve ser uma string' })
  @IsNotEmpty({ message: 'Confirmação de senha é obrigatória' })
  confirmPassword: string;
}

/**
 * DTO para validação de token
 */
export class ValidateTokenDto {
  @ApiProperty({
    description: 'Token de recuperação para validação',
    example: 'abc123def456ghi789',
  })
  @IsString({ message: 'Token deve ser uma string' })
  @IsNotEmpty({ message: 'Token é obrigatório' })
  token: string;
}

/**
 * DTO de resposta para solicitação de recuperação
 */
export class ForgotPasswordResponseDto {
  @ApiProperty({
    description: 'Mensagem de confirmação',
    example: 'Se o email existir, um link de recuperação será enviado',
  })
  message: string;

  @ApiProperty({
    description: 'Timestamp da solicitação',
    example: '2024-01-15T10:30:00Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Tempo de expiração do token em minutos',
    example: 15,
  })
  expiresInMinutes: number;
}

/**
 * DTO de resposta para redefinição de senha
 */
export class ResetPasswordResponseDto {
  @ApiProperty({
    description: 'Mensagem de confirmação',
    example: 'Senha redefinida com sucesso',
  })
  message: string;

  @ApiProperty({
    description: 'Timestamp da redefinição',
    example: '2024-01-15T10:35:00Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Indica se o usuário deve fazer login novamente',
    example: true,
  })
  requiresReauth: boolean;
}

/**
 * DTO de resposta para validação de token
 */
export class ValidateTokenResponseDto {
  @ApiProperty({
    description: 'Indica se o token é válido',
    example: true,
  })
  valid: boolean;

  @ApiProperty({
    description: 'Tempo restante em minutos (se válido)',
    example: 12,
    required: false,
  })
  minutesRemaining?: number;

  @ApiProperty({
    description: 'Email associado ao token (se válido)',
    example: 'usuario@semtas.gov.br',
    required: false,
  })
  email?: string;

  @ApiProperty({
    description: 'Mensagem de erro (se inválido)',
    example: 'Token expirado ou inválido',
    required: false,
  })
  error?: string;
}

/**
 * DTO para estatísticas de recuperação de senha (admin)
 */
export class PasswordResetStatsDto {
  @ApiProperty({
    description: 'Total de solicitações nas últimas 24h',
    example: 15,
  })
  requestsLast24h: number;

  @ApiProperty({
    description: 'Total de redefinições bem-sucedidas nas últimas 24h',
    example: 12,
  })
  successfulResetsLast24h: number;

  @ApiProperty({
    description: 'Tokens ativos (não expirados)',
    example: 8,
  })
  activeTokens: number;

  @ApiProperty({
    description: 'Tokens expirados nas últimas 24h',
    example: 3,
  })
  expiredTokensLast24h: number;

  @ApiProperty({
    description: 'Taxa de sucesso (%)',
    example: 80.0,
  })
  successRate: number;

  @ApiProperty({
    description: 'Usuários únicos que solicitaram recuperação nas últimas 24h',
    example: 14,
  })
  uniqueUsersLast24h: number;
}