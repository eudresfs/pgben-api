import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsDateString,
  IsIP,
  Length,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

/**
 * DTO para adicionar token à blacklist
 */
export class AddToBlacklistDto {
  @ApiProperty({
    description: 'JWT ID (jti) do token a ser invalidado',
    example: 'jti-uuid-v4',
  })
  @IsString()
  @Length(1, 255)
  jti: string;

  @ApiProperty({
    description: 'ID do usuário proprietário do token',
    example: 'user-uuid-v4',
  })
  @IsUUID()
  usuario_id: string;

  @ApiProperty({
    description: 'Tipo do token',
    enum: ['access', 'refresh'],
    example: 'access',
  })
  @IsEnum(['access', 'refresh'])
  token_type: 'access' | 'refresh';

  @ApiProperty({
    description: 'Data de expiração do token (ISO 8601)',
    example: '2024-01-15T10:30:00Z',
  })
  @IsDateString()
  expires_at: string;

  @ApiProperty({
    description: 'Motivo da invalidação',
    example: 'user_logout',
  })
  @IsString()
  @Length(1, 100)
  reason: string;

  @ApiPropertyOptional({
    description: 'IP do cliente',
    example: '192.168.1.100',
  })
  @IsOptional()
  @IsIP()
  client_ip?: string;

  @ApiPropertyOptional({
    description: 'User Agent do cliente',
  })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  user_agent?: string;

  @ApiPropertyOptional({
    description: 'Metadados adicionais',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO para verificar se token está na blacklist
 */
export class CheckBlacklistDto {
  @ApiProperty({
    description: 'JWT ID (jti) do token a ser verificado',
    example: 'jti-uuid-v4',
  })
  @IsString()
  @Length(1, 255)
  jti: string;
}

/**
 * DTO para invalidar todos os tokens de um usuário
 */
export class InvalidateUserTokensDto {
  @ApiProperty({
    description: 'ID do usuário',
    example: 'user-uuid-v4',
  })
  @IsUUID()
  usuario_id: string;

  @ApiProperty({
    description: 'Motivo da invalidação',
    example: 'security_breach',
  })
  @IsString()
  @Length(1, 100)
  reason: string;

  @ApiPropertyOptional({
    description: 'Tipo específico de token a invalidar',
    enum: ['access', 'refresh', 'all'],
    example: 'all',
  })
  @IsOptional()
  @IsEnum(['access', 'refresh', 'all'])
  token_type?: 'access' | 'refresh' | 'all';

  @ApiPropertyOptional({
    description: 'IP do cliente',
    example: '192.168.1.100',
  })
  @IsOptional()
  @IsIP()
  client_ip?: string;

  @ApiPropertyOptional({
    description: 'User Agent do cliente',
  })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  user_agent?: string;

  @ApiPropertyOptional({
    description: 'Metadados adicionais',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO de resposta para operações de blacklist
 */
export class BlacklistResponseDto {
  @ApiProperty({
    description: 'Mensagem de sucesso',
    example: 'Token adicionado à blacklist com sucesso',
  })
  message: string;

  @ApiProperty({
    description: 'Indica se a operação foi bem-sucedida',
    example: true,
  })
  success: boolean;

  @ApiPropertyOptional({
    description: 'Número de tokens afetados',
    example: 1,
  })
  affected_count?: number;
}

/**
 * DTO de resposta para verificação de blacklist
 */
export class CheckBlacklistResponseDto {
  @ApiProperty({
    description: 'Indica se o token está na blacklist',
    example: true,
  })
  is_blacklisted: boolean;

  @ApiPropertyOptional({
    description: 'Motivo da invalidação (se blacklisted)',
    example: 'user_logout',
  })
  reason?: string;

  @ApiPropertyOptional({
    description: 'Data de expiração do token',
    example: '2024-01-15T10:30:00Z',
  })
  expires_at?: string;

  @ApiPropertyOptional({
    description: 'Minutos até a expiração',
    example: 15,
  })
  minutes_until_expiration?: number;
}

/**
 * DTO para filtros de consulta da blacklist
 */
export class BlacklistQueryDto {
  @ApiPropertyOptional({
    description: 'ID do usuário para filtrar',
    example: 'user-uuid-v4',
  })
  @IsOptional()
  @IsUUID()
  usuario_id?: string;

  @ApiPropertyOptional({
    description: 'Tipo de token para filtrar',
    enum: ['access', 'refresh'],
    example: 'access',
  })
  @IsOptional()
  @IsEnum(['access', 'refresh'])
  token_type?: 'access' | 'refresh';

  @ApiPropertyOptional({
    description: 'Motivo da invalidação para filtrar',
    example: 'user_logout',
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  reason?: string;

  @ApiPropertyOptional({
    description: 'Incluir apenas tokens ainda válidos',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  only_active?: boolean;

  @ApiPropertyOptional({
    description: 'Página para paginação',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?: number;

  @ApiPropertyOptional({
    description: 'Itens por página',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number;
}

/**
 * DTO de resposta para estatísticas da blacklist
 */
export class BlacklistStatsDto {
  @ApiProperty({
    description: 'Total de tokens na blacklist',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Tokens ainda ativos (não expirados)',
    example: 45,
  })
  active: number;

  @ApiProperty({
    description: 'Tokens expirados',
    example: 105,
  })
  expired: number;

  @ApiProperty({
    description: 'Tokens de acesso',
    example: 120,
  })
  access_tokens: number;

  @ApiProperty({
    description: 'Tokens de refresh',
    example: 30,
  })
  refresh_tokens: number;

  @ApiProperty({
    description: 'Estatísticas por motivo',
    example: {
      user_logout: 80,
      security_breach: 20,
      token_expired: 50,
    },
  })
  by_reason: Record<string, number>;

  @ApiProperty({
    description: 'Data da última limpeza',
    example: '2024-01-01T10:00:00Z',
  })
  last_cleanup?: string;
}
