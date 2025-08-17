import {
  IsOptional,
  IsBoolean,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TipoAcaoCritica } from '../enums/aprovacao.enums';

/**
 * DTO para filtros de consulta de ações críticas
 * Permite filtrar e paginar resultados de ações críticas
 */
export class FiltroAcaoCriticaDto {
  @ApiPropertyOptional({
    description: 'Se a ação crítica está ativa',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean({ message: 'Ativo deve ser um valor booleano' })
  ativo?: boolean;

  @ApiPropertyOptional({
    description: 'Tipo da ação crítica',
    enum: TipoAcaoCritica,
    example: TipoAcaoCritica.EXCLUSAO_BENEFICIARIO,
  })
  @IsOptional()
  @IsEnum(TipoAcaoCritica, {
    message: 'Tipo deve ser um valor válido do enum TipoAcaoCritica',
  })
  tipo?: TipoAcaoCritica;

  @ApiPropertyOptional({
    description: 'Se a ação requer aprovação',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean({ message: 'Requer aprovação deve ser um valor booleano' })
  requer_aprovacao?: boolean;

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