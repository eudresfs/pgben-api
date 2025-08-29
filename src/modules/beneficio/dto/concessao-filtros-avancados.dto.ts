import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsOptional,
  IsArray,
  IsString,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsUUID,
  Min,
  Max,
  ArrayMaxSize,
} from 'class-validator';
import { PaginationParamsDto } from '../../../shared/dtos/pagination-params.dto';
import { StatusConcessao } from '../../../enums/status-concessao.enum';
import { PeriodoPredefinido } from '../../../enums/periodo-predefinido.enum';
import { transformToStringArray } from '../../../common/utils/filtros-transform.util';

/**
 * DTO para filtros avançados de concessões
 * Estende PaginationParamsDto e implementa funcionalidades avançadas de filtro
 */
export class ConcessaoFiltrosAvancadosDto extends PaginationParamsDto {
  @ApiPropertyOptional({
    description: 'Lista de IDs de unidades para filtrar',
    example: ['uuid1', 'uuid2'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  @Transform(({ value }) => transformToStringArray(value))
  unidades?: string[];

  @ApiPropertyOptional({
    description: 'Lista de status de concessão para filtrar',
    example: ['apto', 'ativo'],
    enum: StatusConcessao,
    isArray: true
  })
  @IsOptional()
  @IsArray()
  @IsEnum(StatusConcessao, { each: true })
  @ArrayMaxSize(20)
  @Transform(({ value }) => transformToStringArray(value))
  status?: StatusConcessao[];

  @ApiPropertyOptional({
    description: 'Lista de IDs de benefícios para filtrar',
    example: ['990e8400-e29b-41d4-a716-446655440004'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(100)
  @Transform(({ value }) => transformToStringArray(value))
  beneficios?: string[];

  @ApiPropertyOptional({
    description: 'Lista de IDs de usuários responsáveis para filtrar',
    example: ['990e8400-e29b-41d4-a716-446655440004'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(50)
  @Transform(({ value }) => transformToStringArray(value))
  usuarios?: string[];

  @ApiPropertyOptional({
    description: 'Lista de bairros para filtrar',
    example: ['Centro', 'Vila Nova'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(100)
  @Transform(({ value }) => transformToStringArray(value))
  bairros?: string[];

  @ApiPropertyOptional({
    description: 'Busca textual em campos relevantes (protocolo, nome do beneficiário, CPF)',
    example: 'João Silva',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Período predefinido para filtro de datas',
    example: 'ultimos_30_dias',
    enum: PeriodoPredefinido,
  })
  @IsOptional()
  @IsEnum(PeriodoPredefinido)
  periodo?: PeriodoPredefinido;

  @ApiPropertyOptional({
    description: 'Data de início para filtro por período de criação (usado com período personalizado)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  data_inicio?: string;

  @ApiPropertyOptional({
    description: 'Data de fim para filtro por período de criação (usado com período personalizado)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  data_fim?: string;

  @ApiPropertyOptional({
    description: 'Filtrar apenas concessões com determinação judicial',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  determinacao_judicial?: boolean;

  @ApiPropertyOptional({
    description: 'Lista de prioridades para filtrar (1-5)',
    example: [1, 2],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(1, { each: true })
  @Max(5, { each: true })
  @ArrayMaxSize(5)
  @Type(() => Number)
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.map(v => Number(v)).filter(v => !isNaN(v));
    }
    if (typeof value === 'string') {
      return value.split(',').map(v => Number(v.trim())).filter(v => !isNaN(v));
    }
    return value ? [Number(value)] : undefined;
  })
  prioridades?: number[];

  @ApiPropertyOptional({
    description: 'Incluir concessões arquivadas',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  incluir_arquivados?: boolean = false;

  @ApiPropertyOptional({
    description: 'Incluir relacionamentos nas consultas',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  include_relations?: boolean = true;

  @ApiPropertyOptional({
    description: 'Campo para ordenação',
    example: 'created_at',
    enum: ['created_at', 'data_inicio', 'status', 'prioridade'],
  })
  @IsOptional()
  @IsString()
  @IsEnum(['created_at', 'data_inicio', 'status', 'prioridade'])
  sort_by?: string = 'created_at';

  @ApiPropertyOptional({
    description: 'Ordem da ordenação',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsString()
  @IsEnum(['ASC', 'DESC'])
  sort_order?: 'ASC' | 'DESC' = 'DESC';
}

/**
 * DTO de resposta para filtros avançados de concessões
 */
export class ConcessaoFiltrosResponseDto {
  @ApiProperty({
    description: 'Lista de concessões encontradas',
    type: [Object],
  })
  items: any[];

  @ApiProperty({
    description: 'Metadados de paginação',
    type: Object,
  })
  meta: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };

  @ApiPropertyOptional({
    description: 'Informações de performance da consulta',
    type: Object,
  })
  performance?: {
    executionTime: number;
    queryCount: number;
    cacheHit?: boolean;
  };
}