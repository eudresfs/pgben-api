import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray, IsEnum, IsNumber, Min, IsDateString } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationParamsDto } from '../../../shared/dtos/pagination-params.dto';
import { IResultadoFiltros, IFiltrosAvancados, IPeriodoCalculado } from '../../../common/interfaces/filtros-avancados.interface';
import { PeriodicidadeEnum } from '../../../enums/periodicidade.enum';
import { Status } from '../../../enums/status.enum';
import { transformToUUIDArray } from '../../../common/utils/filtros-transform.util';

/**
 * DTO para filtros avançados de benefício
 * Estende PaginationParamsDto para reutilizar funcionalidades de paginação
 * Inclui filtros específicos do domínio benefício e filtros comuns
 */
export class BeneficioFiltrosAvancadosDto extends PaginationParamsDto {
  @ApiPropertyOptional({
    description: 'Status dos benefícios para filtrar',
    type: [String],
    enum: Status,
    example: ['ativo', 'inativo']
  })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(status => status.trim().toLowerCase()).filter(status => status.length > 0);
    }
    return Array.isArray(value) ? value.map(s => String(s).toLowerCase()) : [];
  })
  status?: Status[];

  @ApiPropertyOptional({
    description: 'Periodicidade dos benefícios para filtrar',
    type: [String],
    enum: PeriodicidadeEnum,
    example: ['mensal', 'unico']
  })
  @IsOptional()
  @IsArray()
  @Transform(transformToUUIDArray)
  periodicidade?: PeriodicidadeEnum[];

  @ApiPropertyOptional({
    description: 'Valor mínimo do benefício',
    minimum: 0,
    example: 100.00
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => {
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  })
  valor_min?: number;

  @ApiPropertyOptional({
    description: 'Valor máximo do benefício',
    minimum: 0,
    example: 1000.00
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => {
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  })
  valor_max?: number;

  @ApiPropertyOptional({
    description: 'Termo de busca para nome, código ou descrição',
    example: 'Auxílio Natalidade'
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Incluir relacionamentos na resposta',
    type: [String],
    example: ['requisito_documento', 'schema']
  })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(rel => rel.trim()).filter(rel => rel.length > 0);
    }
    return Array.isArray(value) ? value : [];
  })
  include_relations?: string[];

  @ApiPropertyOptional({
    description: 'Data de início para filtrar por data de criação',
    example: '2024-01-01T00:00:00.000Z'
  })
  @IsOptional()
  @Type(() => Date)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? undefined : date;
    }
    return value instanceof Date ? value : undefined;
  })
  data_inicio?: Date;

  @ApiPropertyOptional({
    description: 'Data de fim para filtrar por data de criação',
    example: '2024-12-31T23:59:59.999Z'
  })
  @IsOptional()
  @Type(() => Date)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? undefined : date;
    }
    return value instanceof Date ? value : undefined;
  })
  data_fim?: Date;
}

/**
 * DTO de resposta para filtros avançados de benefício
 * Implementa IResultadoFiltros seguindo a estrutura padrão
 * Reutiliza campos de paginação do PaginatedResponseDto
 */
export class BeneficioFiltrosResponseDto implements IResultadoFiltros {
  @ApiProperty({
    description: 'Lista de benefícios encontrados',
    type: [Object]
  })
  items: any[];

  @ApiProperty({
    description: 'Total de registros encontrados',
    example: 150
  })
  total: number;

  @ApiProperty({
    description: 'Filtros aplicados na consulta',
    additionalProperties: true
  })
  filtros_aplicados: IFiltrosAvancados;

  @ApiProperty({
    description: 'Período calculado dos filtros',
    type: 'object',
    properties: {
      data_inicio: { type: 'string', format: 'date-time' },
      data_fim: { type: 'string', format: 'date-time' },
    },
    example: {
      data_inicio: '2024-01-01T00:00:00.000Z',
      data_fim: '2024-12-31T23:59:59.999Z',
    },
  })
  periodoCalculado?: IPeriodoCalculado;

  @ApiProperty({
    description: 'Informações de paginação',
    type: 'object',
    properties: {
      limit: { type: 'number', description: 'Limite de itens por página' },
      offset: { type: 'number', description: 'Offset da consulta' },
      page: { type: 'number', description: 'Página atual' },
      pages: { type: 'number', description: 'Total de páginas' },
      hasNext: { type: 'boolean', description: 'Se há próxima página' },
      hasPrev: { type: 'boolean', description: 'Se há página anterior' }
    }
  })
  meta: {
    limit: number;
    offset: number;
    page: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };

  @ApiProperty({
    description: 'Tempo de execução da consulta em milissegundos',
    example: 150
  })
  tempo_execucao?: number;
}