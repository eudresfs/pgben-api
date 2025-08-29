import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsNumber, Min, Max, IsArray } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationParamsDto } from '../../../shared/dtos/pagination-params.dto';
import { IResultadoFiltros, IFiltrosAvancados, IPeriodoCalculado } from '../../../common/interfaces/filtros-avancados.interface';
import { UsuarioResponseDto } from '../../aprovacao/dtos/response/usuario-response.dto';

/**
 * DTO para filtros avançados de usuário
 * Estende PaginationParamsDto para reutilizar funcionalidades de paginação
 * Inclui filtros específicos do domínio usuário e filtros comuns
 */
export class UsuarioFiltrosAvancadosDto extends PaginationParamsDto {
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
    description: 'IDs dos setores para filtrar',
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
  setores?: string[];

  @ApiPropertyOptional({
    description: 'IDs das roles para filtrar',
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
  roles?: string[];

  @ApiPropertyOptional({
    description: 'Status dos usuários para filtrar',
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
    description: 'Termo de busca para nome, email, CPF ou matrícula',
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
    description: 'Filtrar usuários que ainda não fizeram o primeiro acesso',
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
  primeiro_acesso?: boolean;

  @ApiPropertyOptional({
    description: 'Número mínimo de tentativas de login',
    minimum: 0,
    maximum: 100,
    example: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Transform(({ value }) => {
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  })
  tentativas_login_min?: number;

  @ApiPropertyOptional({
    description: 'Número máximo de tentativas de login',
    minimum: 0,
    maximum: 100,
    example: 10
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Transform(({ value }) => {
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  })
  tentativas_login_max?: number;
}

/**
 * DTO de resposta para filtros avançados de usuários
 * 
 * Implementa IResultadoFiltros para garantir consistência
 * com o padrão estabelecido no sistema
 */
export class UsuarioFiltrosResponseDto implements IResultadoFiltros {
  @ApiProperty({
    description: 'Lista de usuários filtrados',
    type: [UsuarioResponseDto]
  })
  items: UsuarioResponseDto[];

  @ApiProperty({
    description: 'Total de registros encontrados',
    example: 100
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
      data_fim: { type: 'string', format: 'date-time' }
    }
  })
  periodoCalculado?: IPeriodoCalculado;

  @ApiProperty({
    description: 'Metadados da paginação',
    example: {
      limit: 10,
      offset: 0,
      page: 1,
      pages: 1,
      hasNext: false,
      hasPrev: false
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