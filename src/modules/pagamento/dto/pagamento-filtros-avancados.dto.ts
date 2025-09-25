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
  ValidateNested,
} from 'class-validator';
import { PaginationParamsDto } from '../../../shared/dtos/pagination-params.dto';
import {
  IResultadoFiltros,
  IFiltrosAvancados,
  IPeriodoCalculado
} from '../../../common/interfaces/filtros-avancados.interface';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';
import { MetodoPagamentoEnum } from '../../../enums/metodo-pagamento.enum';
import { PeriodoPredefinido } from '../../../enums/periodo-predefinido.enum';
import { transformToStringArray } from '../../../common/utils/filtros-transform.util';

/**
 * DTO para filtros avançados de pagamentos
 * Estende PaginationParamsDto e implementa funcionalidades avançadas de filtro
 */
export class PagamentoFiltrosAvancadosDto extends PaginationParamsDto {
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
    description: 'Lista de status de pagamento para filtrar',
    example: ['pendente', 'aprovado'],
    enum: StatusPagamentoEnum,
    isArray: true
  })
  @IsOptional()
  @IsArray()
  @IsEnum(StatusPagamentoEnum, { each: true })
  @ArrayMaxSize(20)
  @Transform(({ value }) => transformToStringArray(value))
  status?: StatusPagamentoEnum[];

  @ApiPropertyOptional({
    description: 'Lista de métodos de pagamento para filtrar',
    example: ['pix', 'transferencia'],
    enum: MetodoPagamentoEnum,
    isArray: true
  })
  @IsOptional()
  @IsArray()
  @IsEnum(MetodoPagamentoEnum, { each: true })
  @ArrayMaxSize(10)
  @Transform(({ value }) => transformToStringArray(value))
  metodos_pagamento?: MetodoPagamentoEnum[];

  @ApiPropertyOptional({
    description: 'Lista de IDs de solicitações para filtrar',
    example: ['990e8400-e29b-41d4-a716-446655440004'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(100)
  @Transform(({ value }) => transformToStringArray(value))
  solicitacoes?: string[];

  @ApiPropertyOptional({
    description: 'Lista de IDs de concessões para filtrar',
    example: ['990e8400-e29b-41d4-a716-446655440004'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(100)
  @Transform(({ value }) => transformToStringArray(value))
  concessoes?: string[];

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
    description: 'Data de início para filtro por período de liberação (usado com período personalizado)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  data_inicio?: string;

  @ApiPropertyOptional({
    description: 'Data de fim para filtro por período de liberação (usado com período personalizado)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  data_fim?: string;

  @ApiPropertyOptional({
    description: 'Data de início para filtro por período de pagamento (usado com período personalizado)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  data_pagamento_inicio?: string;

  @ApiPropertyOptional({
    description: 'Data de fim para filtro por período de pagamento (usado com período personalizado)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  data_pagamento_fim?: string;

  @ApiPropertyOptional({
    description: 'Valor mínimo do pagamento',
    example: 100.00,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  valor_min?: number;

  @ApiPropertyOptional({
    description: 'Valor máximo do pagamento',
    example: 5000.00,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  valor_max?: number;

  @ApiPropertyOptional({
    description: 'Número da parcela mínima',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  parcela_min?: number;

  @ApiPropertyOptional({
    description: 'Número da parcela máxima',
    example: 12,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  parcela_max?: number;

  @ApiPropertyOptional({
    description: 'Filtrar apenas pagamentos com comprovante',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  com_comprovante?: boolean;

  @ApiPropertyOptional({
    description: 'Filtrar apenas pagamentos monitorados',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  monitorado?: boolean;

  @ApiPropertyOptional({
    description: 'Retornar apenas a próxima parcela a ser liberada por concessão (baseado na sequência de parcelas)',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  proxima_parcela_liberacao?: boolean;

  @ApiPropertyOptional({
    description: 'Incluir relacionamentos na resposta',
    example: ['solicitacao', 'concessao', 'comprovante'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  @Transform(({ value }) => transformToStringArray(value))
  include_relations?: string[];

  @ApiPropertyOptional({
    description: 'Campo para ordenação',
    example: 'data_liberacao',
    enum: ['data_liberacao', 'data_pagamento', 'valor', 'numero_parcela', 'created_at'],
  })
  @IsOptional()
  @IsString()
  sort_by?: string;

  @ApiPropertyOptional({
    description: 'Direção da ordenação',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsString()
  sort_order?: 'ASC' | 'DESC';
}

/**
 * DTO de resposta para filtros avançados de pagamentos
 * Implementa a interface IResultadoFiltros para padronização
 */
export class PagamentoFiltrosResponseDto implements IResultadoFiltros {
  @ApiProperty({
    description: 'Lista de pagamentos encontrados',
    type: 'array',
    items: {
      type: 'object',
      description: 'Dados do pagamento'
    }
  })
  items: any[];

  @ApiProperty({
    description: 'Total de registros encontrados',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Filtros que foram aplicados na consulta',
    type: 'object',
    additionalProperties: true,
    example: {
      unidades: ['uuid1', 'uuid2'],
      status: ['pendente', 'aprovado'],
      data_liberacao_inicio: '2024-01-01',
      data_liberacao_fim: '2024-12-31'
    }
  })
  filtros_aplicados: IFiltrosAvancados;

  @ApiPropertyOptional({
    description: 'Período calculado com base nos filtros aplicados',
    type: 'object',
    properties: {
      inicio: { type: 'string', format: 'date-time' },
      fim: { type: 'string', format: 'date-time' },
      dias: { type: 'number' }
    }
  })
  periodo_calculado?: IPeriodoCalculado;

  @ApiProperty({
    description: 'Metadados de paginação',
    type: 'object',
    properties: {
      page: { type: 'number', example: 1 },
      limit: { type: 'number', example: 10 },
      total_pages: { type: 'number', example: 15 },
      has_next: { type: 'boolean', example: true },
      has_previous: { type: 'boolean', example: false }
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
    example: 245,
  })
  tempo_execucao?: number;
}