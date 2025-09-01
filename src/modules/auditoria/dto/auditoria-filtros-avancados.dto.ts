import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsOptional,
  IsArray,
  IsString,
  IsDateString,
  IsEnum,
  ArrayNotEmpty,
  ValidateNested,
} from 'class-validator';
import { PaginationParamsDto } from '../../../shared/dtos/pagination-params.dto';
import { IResultadoFiltros, IFiltrosAvancados, IPeriodoCalculado } from '../../../common/interfaces/filtros-avancados.interface';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';
import { LogAuditoria } from '../../../entities/log-auditoria.entity';
import { transformToUUIDArray } from '../../../common/utils/filtros-transform.util';

/**
 * DTO para filtros avançados de auditoria
 * Permite busca detalhada nos logs de auditoria com múltiplos critérios
 */
export class AuditoriaFiltrosAvancadosDto extends PaginationParamsDto {
  @ApiPropertyOptional({
    description: 'Tipos de operação para filtrar',
    enum: TipoOperacao,
    isArray: true,
    example: [TipoOperacao.CREATE, TipoOperacao.UPDATE],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(TipoOperacao, { each: true })
  @Transform(transformToUUIDArray)
  tipo_operacao?: TipoOperacao[];

  @ApiPropertyOptional({
    description: 'Entidades afetadas para filtrar',
    type: [String],
    example: ['Usuario', 'Cidadao', 'Solicitacao'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(transformToUUIDArray)
  entidade_afetada?: string[];

  @ApiPropertyOptional({
    description: 'IDs de usuários para filtrar',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174000'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(transformToUUIDArray)
  usuario_id?: string[];

  @ApiPropertyOptional({
    description: 'Níveis de risco para filtrar',
    type: [String],
    example: ['HIGH', 'CRITICAL'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(transformToUUIDArray)
  nivel_risco?: string[];

  @ApiPropertyOptional({
    description: 'Métodos HTTP para filtrar',
    type: [String],
    example: ['POST', 'PUT', 'DELETE'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(transformToUUIDArray)
  metodo_http?: string[];

  @ApiPropertyOptional({
    description: 'Termo de busca livre (busca em descrição, endpoint, entidade)',
    example: 'usuario criado',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Relações a serem incluídas na resposta',
    type: [String],
    example: ['usuario'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(transformToUUIDArray)
  include_relations?: string[];

  @ApiPropertyOptional({
    description: 'Data de início para filtro de criação (ISO 8601)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  data_inicio?: string;

  @ApiPropertyOptional({
    description: 'Data de fim para filtro de criação (ISO 8601)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  data_fim?: string;
}

/**
 * DTO de resposta para filtros avançados de auditoria
 * Implementa a interface padrão de resultados de filtros
 */
export class AuditoriaFiltrosResponseDto implements IResultadoFiltros {
  @ApiProperty({
    description: 'Lista de logs de auditoria encontrados',
    type: [LogAuditoria],
  })
  @ValidateNested({ each: true })
  @Type(() => LogAuditoria)
  items: LogAuditoria[];

  @ApiProperty({
    description: 'Total de registros encontrados',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Filtros aplicados na consulta',
    example: {
      tipo_operacao: ['CREATE', 'UPDATE'],
      entidade_afetada: ['Usuario'],
      search: 'usuario criado',
    },
  })
  filtros_aplicados: IFiltrosAvancados;

  @ApiProperty({
    description: 'Período calculado da consulta',
    example: {
      data_inicio: '2024-01-01T00:00:00.000Z',
      data_fim: '2024-12-31T23:59:59.999Z',
    },
  })
  periodo_calculado?: IPeriodoCalculado;

  @ApiProperty({
    description: 'Metadados de paginação',
    example: {
      limit: 20,
      offset: 0,
      page: 1,
      pages: 8,
      hasNext: true,
      hasPrev: false,
    },
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
    example: 245,
  })
  tempo_execucao: number;
}