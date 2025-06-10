import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  IsString,
  IsArray,
  ArrayNotEmpty,
  IsBoolean
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { StatusPendencia } from '../../../../entities/pendencia.entity';
import { BaseFilterDto } from '../../../../shared/dtos/base-filter.dto';
import { TransformEmptyUuid, TransformEmptyString } from '../../../../shared/decorators/transform-empty-string.decorator';

/**
 * DTO para filtros de busca de pendências
 *
 * Utilizado para filtrar pendências com diversos critérios
 */
export class FiltrosPendenciaDto extends BaseFilterDto {
  @ApiPropertyOptional({
    description: 'ID da solicitação para filtrar pendências',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID da solicitação deve ser um UUID válido' })
  @TransformEmptyUuid()
  solicitacao_id?: string;

  @ApiPropertyOptional({
    description: 'Status da pendência',
    enum: StatusPendencia,
    example: StatusPendencia.ABERTA,
  })
  @IsOptional()
  @IsEnum(StatusPendencia, { message: 'Status deve ser um valor válido' })
  status?: StatusPendencia;

  @ApiPropertyOptional({
    description: 'Lista de status para filtrar',
    enum: StatusPendencia,
    isArray: true,
    example: [StatusPendencia.ABERTA, StatusPendencia.RESOLVIDA],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
    }
    return Array.isArray(value) ? value : [];
  })
  @IsArray({ message: 'Status deve ser um array' })
  @ArrayNotEmpty({ message: 'Array de status não pode estar vazio' })
  @IsEnum(StatusPendencia, { each: true, message: 'Cada status deve ser um valor válido' })
  status_list?: StatusPendencia[];

  @ApiPropertyOptional({
    description: 'ID do usuário que registrou a pendência',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID do usuário deve ser um UUID válido' })
  @TransformEmptyUuid()
  registrado_por_id?: string;

  @ApiPropertyOptional({
    description: 'ID do usuário que resolveu a pendência',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID do usuário deve ser um UUID válido' })
  @TransformEmptyUuid()
  resolvido_por_id?: string;

  @ApiPropertyOptional({
    description: 'Data de criação inicial (formato ISO 8601)',
    example: '2024-01-01',
    type: 'string',
    format: 'date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data inicial deve ser uma data válida no formato ISO 8601' })
  data_criacao_inicio?: string;

  @ApiPropertyOptional({
    description: 'Data de criação final (formato ISO 8601)',
    example: '2024-12-31',
    type: 'string',
    format: 'date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data final deve ser uma data válida no formato ISO 8601' })
  data_criacao_fim?: string;

  @ApiPropertyOptional({
    description: 'Data de resolução inicial (formato ISO 8601)',
    example: '2024-01-01',
    type: 'string',
    format: 'date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data inicial deve ser uma data válida no formato ISO 8601' })
  data_resolucao_inicio?: string;

  @ApiPropertyOptional({
    description: 'Data de resolução final (formato ISO 8601)',
    example: '2024-12-31',
    type: 'string',
    format: 'date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data final deve ser uma data válida no formato ISO 8601' })
  data_resolucao_fim?: string;

  @ApiPropertyOptional({
    description: 'Prazo de resolução inicial (formato ISO 8601)',
    example: '2024-01-01',
    type: 'string',
    format: 'date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data inicial deve ser uma data válida no formato ISO 8601' })
  prazo_resolucao_inicio?: string;

  @ApiPropertyOptional({
    description: 'Prazo de resolução final (formato ISO 8601)',
    example: '2024-12-31',
    type: 'string',
    format: 'date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data final deve ser uma data válida no formato ISO 8601' })
  prazo_resolucao_fim?: string;

  @ApiPropertyOptional({
    description: 'Busca por texto na descrição da pendência',
    example: 'documento',
  })
  @IsOptional()
  @IsString()
  @TransformEmptyString()
  @Transform(({ value }) => value?.trim())
  busca_descricao?: string;

  @ApiPropertyOptional({
    description: 'Filtrar apenas pendências vencidas (prazo expirado)',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  apenas_vencidas?: boolean;

  @ApiPropertyOptional({
    description: 'Filtrar apenas pendências próximas do vencimento (próximos 7 dias)',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  proximas_vencimento?: boolean;
}