import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsArray, IsString, IsBoolean, IsEnum, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { TipoVisita, ResultadoVisita } from '../enums';
import { PeriodoPredefinido } from '../../../enums/periodo-predefinido.enum';

/**
 * DTO para filtros avançados de visitas domiciliares
 * 
 * Implementa o padrão de filtros avançados estabelecido no sistema,
 * permitindo busca por múltiplos critérios e retornando estatísticas.
 */
export class VisitaFiltrosAvancadosDto {
  @ApiProperty({
    description: 'IDs das unidades para filtrar',
    type: [String],
    required: false,
    example: ['550e8400-e29b-41d4-a716-446655440000']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  unidades?: string[];

  @ApiProperty({
    description: 'Tipos de visita para filtrar',
    enum: TipoVisita,
    isArray: true,
    required: false,
    example: ['inicial', 'acompanhamento']
  })
  @IsOptional()
  @IsArray()
  @IsEnum(TipoVisita, { each: true })
  tipos_visita?: TipoVisita[];

  @ApiProperty({
    description: 'Resultados de visita para filtrar',
    enum: ResultadoVisita,
    isArray: true,
    required: false,
    example: ['realizada', 'nao_localizado']
  })
  @IsOptional()
  @IsArray()
  @IsEnum(ResultadoVisita, { each: true })
  resultados?: ResultadoVisita[];

  @ApiProperty({
    description: 'IDs dos técnicos responsáveis',
    type: [String],
    required: false,
    example: ['550e8400-e29b-41d4-a716-446655440001']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tecnicos?: string[];

  @ApiProperty({
    description: 'IDs dos beneficiários',
    type: [String],
    required: false,
    example: ['550e8400-e29b-41d4-a716-446655440002']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  beneficiarios?: string[];

  @ApiProperty({
    description: 'Período predefinido para filtrar',
    enum: PeriodoPredefinido,
    required: false,
    example: 'ultimos_30_dias'
  })
  @IsOptional()
  @IsEnum(PeriodoPredefinido)
  periodo?: PeriodoPredefinido;

  @ApiProperty({
    description: 'Data de início do período (formato ISO)',
    type: String,
    required: false,
    example: '2024-01-01T00:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  data_inicio?: string;

  @ApiProperty({
    description: 'Data de fim do período (formato ISO)',
    type: String,
    required: false,
    example: '2024-12-31T23:59:59.999Z'
  })
  @IsOptional()
  @IsDateString()
  data_fim?: string;

  @ApiProperty({
    description: 'Busca textual em observações e dados da visita',
    type: String,
    required: false,
    example: 'beneficiário presente'
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Filtrar apenas visitas que recomendam renovação',
    type: Boolean,
    required: false,
    example: true
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  recomenda_renovacao?: boolean;

  @ApiProperty({
    description: 'Filtrar apenas visitas que necessitam nova visita',
    type: Boolean,
    required: false,
    example: false
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  necessita_nova_visita?: boolean;

  @ApiProperty({
    description: 'Filtrar apenas visitas com beneficiário presente',
    type: Boolean,
    required: false,
    example: true
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  beneficiario_presente?: boolean;

  @ApiProperty({
    description: 'Incluir relacionamentos nas consultas',
    type: Boolean,
    required: false,
    default: true,
    example: true
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  include_relations?: boolean = true;

  @ApiProperty({
    description: 'Campo para ordenação',
    type: String,
    required: false,
    default: 'data_realizacao',
    example: 'data_realizacao'
  })
  @IsOptional()
  @IsString()
  sort_by?: string = 'data_realizacao';

  @ApiProperty({
    description: 'Direção da ordenação',
    enum: ['ASC', 'DESC'],
    required: false,
    default: 'DESC',
    example: 'DESC'
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sort_order?: 'ASC' | 'DESC' = 'DESC';

  @ApiProperty({
    description: 'Número da página',
    type: Number,
    required: false,
    default: 1,
    minimum: 1,
    example: 1
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiProperty({
    description: 'Número de itens por página',
    type: Number,
    required: false,
    default: 20,
    minimum: 1,
    maximum: 100,
    example: 20
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 20;
}

/**
 * DTO de resposta para filtros avançados de visitas
 */
export class VisitaFiltrosResponseDto {
  @ApiProperty({
    description: 'Lista de visitas filtradas',
    type: 'array',
    example: [{
      id: '550e8400-e29b-41d4-a716-446655440010',
      agendamento_id: '550e8400-e29b-41d4-a716-446655440000',
      tipo_visita: 'inicial',
      resultado: 'realizada',
      data_realizacao: '2024-02-15T14:30:00.000Z',
      beneficiario_presente: true,
      recomenda_renovacao: true,
      necessita_nova_visita: false
    }]
  })
  data: any[];

  @ApiProperty({
    description: 'Metadados de paginação',
    example: {
      limit: 20,
      total: 0,
      page: 1,
      pages: 8,
      hasNext: true,
      hasPrev: false
    }
  })
  meta: {
    limit: number;
    total: number;
    page: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };

  @ApiProperty({
    description: 'Estatísticas das visitas',
    example: {
      total_visitas: 150,
      visitas_realizadas: 120,
      visitas_nao_localizadas: 20,
      visitas_hoje: 5,
      renovacoes_recomendadas: 80,
      novas_visitas_necessarias: 15
    }
  })
  estatisticas: {
    total_visitas: number;
    visitas_realizadas: number;
    visitas_nao_localizadas: number;
    visitas_hoje: number;
    renovacoes_recomendadas: number;
    novas_visitas_necessarias: number;
  };

  @ApiProperty({
    description: 'Opções disponíveis para filtros',
    example: {
      unidades: [{ id: '550e8400-e29b-41d4-a716-446655440000', nome: 'Unidade Centro', total_visitas: 50 }],
      tipos_visita: [{ tipo: 'inicial', total: 80 }, { tipo: 'acompanhamento', total: 70 }],
      resultados: [{ resultado: 'realizada', total: 120 }, { resultado: 'nao_localizado', total: 30 }],
      tecnicos: [{ id: '550e8400-e29b-41d4-a716-446655440001', nome: 'João Silva', total_visitas: 25 }],
      periodos_disponiveis: ['hoje', 'ultimos_7_dias', 'ultimos_30_dias', 'ultimo_trimestre']
    }
  })
  opcoes_filtro: {
    unidades: Array<{ id: string; nome: string; total_visitas: number }>;
    tipos_visita: Array<{ tipo: string; total: number }>;
    resultados: Array<{ resultado: string; total: number }>;
    tecnicos: Array<{ id: string; nome: string; total_visitas: number }>;
    periodos_disponiveis: string[];
  };
}