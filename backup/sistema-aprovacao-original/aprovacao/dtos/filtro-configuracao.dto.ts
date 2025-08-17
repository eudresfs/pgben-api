import {
  IsOptional,
  IsUUID,
  IsString,
  IsBoolean,
  IsEnum,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstrategiaAprovacao } from '../enums/aprovacao.enums';

/**
 * DTO para filtros de consulta de configurações de aprovação
 * Permite filtrar e paginar resultados de configurações
 */
export class FiltroConfiguracaoDto {
  @ApiPropertyOptional({
    description: 'ID da ação crítica associada',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID(4, { message: 'ID da ação crítica deve ser um UUID válido' })
  acao_critica_id?: string;

  @ApiPropertyOptional({
    description: 'Role/perfil do usuário',
    example: 'ADMIN',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'Role deve ser uma string' })
  @MaxLength(50, { message: 'Role deve ter no máximo 50 caracteres' })
  role?: string;

  @ApiPropertyOptional({
    description: 'Estratégia de aprovação',
    enum: EstrategiaAprovacao,
    example: EstrategiaAprovacao.QUALQUER_UM,
  })
  @IsOptional()
  @IsEnum(EstrategiaAprovacao, {
    message: 'Estratégia deve ser um valor válido do enum EstrategiaAprovacao',
  })
  estrategia?: EstrategiaAprovacao;

  @ApiPropertyOptional({
    description: 'Se a configuração está ativa',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean({ message: 'Ativa deve ser um valor booleano' })
  ativa?: boolean;

  @ApiPropertyOptional({
    description: 'Número da página',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Página deve ser um número inteiro' })
  @Min(1, { message: 'Página deve ser maior que 0' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Número de itens por página',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limite deve ser um número inteiro' })
  @Min(1, { message: 'Limite deve ser maior que 0' })
  @Max(100, { message: 'Limite deve ser menor ou igual a 100' })
  limit?: number = 10;
}