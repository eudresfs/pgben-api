import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsNumber, Min, Max, IsArray } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationParamsDto } from '../../../shared/dtos/pagination-params.dto';
import { IResultadoFiltros, IFiltrosAvancados, IPeriodoCalculado } from '../../../common/interfaces';
import { CidadaoResponseDto } from './cidadao-response.dto';

/**
 * DTO para filtros avançados de cidadão
 * Estende PaginationParamsDto para reutilizar funcionalidades de paginação
 * Inclui filtros específicos do domínio cidadão e filtros comuns
 */
export class CidadaoFiltrosAvancadosDto extends PaginationParamsDto {
  @ApiPropertyOptional({
    description: 'IDs das unidades para filtrar',
    type: [String],
    example: ['uuid1', 'uuid2']
  })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(id => id.trim()).filter(id => id.length > 0);
    }
    return Array.isArray(value) ? value : [];
  })
  unidades?: string[];

  @ApiPropertyOptional({
    description: 'IDs dos bairros para filtrar',
    type: [String],
    example: ['uuid1', 'uuid2']
  })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(id => id.trim()).filter(id => id.length > 0);
    }
    return Array.isArray(value) ? value : [];
  })
  bairros?: string[];

  @ApiPropertyOptional({
    description: 'Status dos cidadãos para filtrar',
    type: [String],
    example: ['ATIVO', 'INATIVO']
  })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(status => status.trim().toUpperCase()).filter(status => status.length > 0);
    }
    return Array.isArray(value) ? value.map(s => String(s).toUpperCase()) : [];
  })
  status?: string[];
  
  @ApiPropertyOptional({
    description: 'Termo de busca para nome, CPF ou outros campos',
    example: 'João Silva'
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Incluir relacionamentos na resposta',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  include_relations?: boolean;

  @ApiPropertyOptional({
    description: 'Filtrar apenas cidadãos com benefícios',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  apenas_com_beneficios?: boolean;

  @ApiPropertyOptional({
    description: 'Idade mínima para filtrar',
    minimum: 0,
    maximum: 120,
    example: 18
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(120)
  @Transform(({ value }) => {
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  })
  idade_minima?: number;

  @ApiPropertyOptional({
    description: 'Idade máxima para filtrar',
    minimum: 0,
    maximum: 120,
    example: 65
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(120)
  @Transform(({ value }) => {
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  })
  idade_maxima?: number;
}

/**
 * DTO de resposta para filtros avançados de cidadão
 * Implementa IResultadoFiltros seguindo a estrutura padrão
 * Reutiliza campos de paginação do PaginatedResponseDto
 */
export class CidadaoFiltrosResponseDto implements IResultadoFiltros {
  @ApiProperty({
    description: 'Lista de cidadãos encontrados',
    type: [Object]
  })
  items: CidadaoResponseDto[];

  @ApiProperty({
    description: 'Total de registros encontrados',
    example: 150
  })
  total: number;

  @ApiProperty({
    description: 'Filtros aplicados na consulta',
    type: Object
  })
  filtros_aplicados: IFiltrosAvancados;

  @ApiPropertyOptional({
    description: 'Período calculado (se aplicável)',
    type: Object
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