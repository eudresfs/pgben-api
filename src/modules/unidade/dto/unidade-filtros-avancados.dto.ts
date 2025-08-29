import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray, IsEnum, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationParamsDto } from '../../../shared/dtos/pagination-params.dto';
import { IResultadoFiltros, IFiltrosAvancados, IPeriodoCalculado } from '../../../common/interfaces/filtros-avancados.interface';
import { Status } from '../../../enums/status.enum';
import { transformToUUIDArray } from '../../../common/utils/filtros-transform.util';

/**
 * DTO para filtros avançados de unidades
 * Permite busca com múltiplos critérios e paginação otimizada
 */
export class UnidadeFiltrosAvancadosDto extends PaginationParamsDto {
  /**
   * Filtro por status das unidades
   * Permite filtrar por múltiplos status simultaneamente
   */
  @ApiPropertyOptional({
    description: 'Status das unidades para filtrar',
    enum: Status,
    isArray: true,
    example: [Status.ATIVO],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(Status, { each: true })
  @Transform(transformToUUIDArray)
  status?: Status[];

  /**
   * Filtro por tipo das unidades
   * Permite filtrar por múltiplos tipos simultaneamente
   */
  @ApiPropertyOptional({
    description: 'Tipos das unidades para filtrar',
    type: [String],
    isArray: true,
    example: ['cras', 'creas'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(transformToUUIDArray)
  tipo?: string[];

  /**
   * Termo de busca textual
   * Busca em nome, código, sigla, endereço e responsável
   */
  @ApiPropertyOptional({
    description: 'Termo para busca textual em nome, código, sigla, endereço e responsável',
    example: 'CRAS Norte',
    minLength: 2,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  search?: string;

  /**
   * Relacionamentos a serem incluídos na resposta
   * Otimiza consultas evitando N+1 queries
   */
  @ApiPropertyOptional({
    description: 'Relacionamentos a incluir na resposta',
    isArray: true,
    enum: ['setores', 'usuarios'],
    example: ['setores'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(transformToUUIDArray)
  include_relations?: string[];

  /**
   * Data de início para filtro de criação
   * Formato ISO 8601 (YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss.sssZ)
   */
  @ApiPropertyOptional({
    description: 'Data de início para filtro de criação',
    type: 'string',
    format: 'date-time',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  created_at_inicio?: Date;

  /**
   * Data de fim para filtro de criação
   * Formato ISO 8601 (YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss.sssZ)
   */
  @ApiPropertyOptional({
    description: 'Data de fim para filtro de criação',
    type: 'string',
    format: 'date-time',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  created_at_fim?: Date;

  /**
   * Data de início para filtro de atualização
   * Formato ISO 8601 (YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss.sssZ)
   */
  @ApiPropertyOptional({
    description: 'Data de início para filtro de atualização',
    type: 'string',
    format: 'date-time',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  updated_at_inicio?: Date;

  /**
   * Data de fim para filtro de atualização
   * Formato ISO 8601 (YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss.sssZ)
   */
  @ApiPropertyOptional({
    description: 'Data de fim para filtro de atualização',
    type: 'string',
    format: 'date-time',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  updated_at_fim?: Date;
}

/**
 * DTO de resposta para filtros avançados de unidades
 * Implementa interface padrão com metadados de paginação e filtros aplicados
 */
export class UnidadeFiltrosResponseDto implements IResultadoFiltros {
  /**
   * Lista de unidades encontradas
   */
  @ApiProperty({
    description: 'Lista de unidades encontradas',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        nome: { type: 'string' },
        codigo: { type: 'string' },
        sigla: { type: 'string' },
        tipo: { type: 'string' },
        endereco: { type: 'string' },
        telefone: { type: 'string' },
        email: { type: 'string' },
        responsavel_matricula: { type: 'string' },
        status: { enum: Object.values(Status) },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
      },
    },
  })
  items: any[];

  /**
   * Total de registros encontrados (sem paginação)
   */
  @ApiProperty({
    description: 'Total de registros encontrados',
    example: 150,
  })
  total: number;

  /**
   * Filtros que foram efetivamente aplicados na consulta
   */
  @ApiProperty({
    description: 'Filtros aplicados na consulta',
    example: {
      status: ['ativo'],
      tipo: ['cras'],
      search: 'Norte',
    },
  })
  filtros_aplicados: IFiltrosAvancados;

  /**
   * Período calculado com base nos filtros de data
   */
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

  /**
   * Metadados de paginação
   */
  @ApiProperty({
    description: 'Metadados de paginação',
    type: 'object',
    properties: {
      limit: { type: 'number', example: 10 },
      offset: { type: 'number', example: 0 },
      page: { type: 'number', example: 1 },
      pages: { type: 'number', example: 15 },
      hasNext: { type: 'boolean', example: true },
      hasPrev: { type: 'boolean', example: false },
    },
  })
  meta: {
    limit: number;
    offset: number;
    page: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
    total: number;
  };

  /**
   * Tempo de execução da consulta em milissegundos
   */
  @ApiProperty({
    description: 'Tempo de execução da consulta em milissegundos',
    example: 245,
  })
  tempo_execucao: number;
}