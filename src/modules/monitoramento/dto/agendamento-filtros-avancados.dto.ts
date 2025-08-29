import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsArray, IsUUID, IsEnum, IsString, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationParamsDto } from '../../../shared/dtos/pagination-params.dto';
import { TipoVisita, PrioridadeVisita, StatusAgendamento } from '../enums';
import { PeriodoPredefinido } from '@/enums/periodo-predefinido.enum';
import { transformToUUIDArray } from '../../../common/utils/filtros-transform.util';

/**
 * DTO para filtros avançados de agendamentos
 * 
 * Implementa o padrão de filtros avançados estabelecido no sistema,
 * permitindo filtros por múltiplos valores e períodos predefinidos.
 */
export class AgendamentoFiltrosAvancadosDto extends PaginationParamsDto {
  // ========== FILTROS POR MÚLTIPLOS VALORES ==========
  
  @ApiPropertyOptional({
    description: 'Lista de IDs das unidades administrativas para filtrar agendamentos. Permite filtrar por múltiplas unidades simultaneamente para relatórios gerenciais.',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440001'],
    items: {
      type: 'string',
      format: 'uuid',
      description: 'UUID da unidade administrativa (CRAS, CREAS, etc.)'
    },
    maxItems: 50
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @Transform(({ value }) => transformToUUIDArray(value))
  unidades?: string[];

  @ApiPropertyOptional({
    description: 'Lista de status dos agendamentos para filtrar. Permite buscar agendamentos em múltiplos status simultaneamente para análises de fluxo.',
    type: [String],
    enum: StatusAgendamento,
    example: [StatusAgendamento.AGENDADO, StatusAgendamento.CANCELADO, StatusAgendamento.PENDENTE],
    items: {
      type: 'string',
      enum: Object.values(StatusAgendamento),
      description: 'Status válido do agendamento no fluxo de execução'
    },
    maxItems: 20
  })
  @IsOptional()
  @IsArray()
  @IsEnum(StatusAgendamento, { each: true })
  @Transform(({ value }) => transformToUUIDArray(value))
  status?: StatusAgendamento[];

  @ApiPropertyOptional({
    description: 'Lista de tipos de visita para filtrar agendamentos. Permite análise por múltiplos tipos de visita.',
    type: [String],
    enum: TipoVisita,
    example: [TipoVisita.INICIAL, TipoVisita.CONTINUIDADE, TipoVisita.RENOVACAO],
    items: {
      type: 'string',
      enum: Object.values(TipoVisita),
      description: 'Tipo de visita domiciliar'
    },
    maxItems: 10
  })
  @IsOptional()
  @IsArray()
  @IsEnum(TipoVisita, { each: true })
  @Transform(({ value }) => transformToUUIDArray(value))
  tipos_visita?: TipoVisita[];

  @ApiPropertyOptional({
    description: 'Lista de prioridades dos agendamentos para filtrar. Permite análise por múltiplas prioridades.',
    type: [String],
    enum: PrioridadeVisita,
    example: [PrioridadeVisita.ALTA, PrioridadeVisita.MEDIA],
    items: {
      type: 'string',
      enum: Object.values(PrioridadeVisita),
      description: 'Prioridade do agendamento'
    },
    maxItems: 5
  })
  @IsOptional()
  @IsArray()
  @IsEnum(PrioridadeVisita, { each: true })
  @Transform(({ value }) => transformToUUIDArray(value))
  prioridades?: PrioridadeVisita[];

  @ApiPropertyOptional({
    description: 'Lista de IDs dos técnicos responsáveis pelos agendamentos. Permite filtrar por múltiplos técnicos.',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440003'],
    items: {
      type: 'string',
      format: 'uuid',
      description: 'UUID do técnico responsável'
    },
    maxItems: 100
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @Transform(({ value }) => transformToUUIDArray(value))
  tecnicos?: string[];

  @ApiPropertyOptional({
    description: 'Lista de IDs dos beneficiários para filtrar agendamentos. Permite buscar agendamentos de múltiplos beneficiários.',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440005'],
    items: {
      type: 'string',
      format: 'uuid',
      description: 'UUID do beneficiário'
    },
    maxItems: 1000
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @Transform(({ value }) => transformToUUIDArray(value))
  beneficiarios?: string[];

  @ApiPropertyOptional({
    description: 'Lista de IDs dos pagamentos vinculados aos agendamentos. Permite filtrar por múltiplos pagamentos.',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440007'],
    items: {
      type: 'string',
      format: 'uuid',
      description: 'UUID do pagamento'
    },
    maxItems: 1000
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @Transform(({ value }) => transformToUUIDArray(value))
  pagamentos?: string[];

  // ========== FILTROS DE BUSCA TEXTUAL ==========
  
  @ApiPropertyOptional({
    description: 'Termo de busca livre para pesquisar em observações, nomes de beneficiários e técnicos. Busca case-insensitive com suporte a múltiplas palavras.',
    example: 'João Silva visita urgente',
    maxLength: 255
  })
  @IsOptional()
  @IsString()
  @Type(() => String)
  search?: string;

  // ========== FILTROS TEMPORAIS ==========
  
  @ApiPropertyOptional({
    description: 'Período predefinido para filtrar agendamentos por data. Sobrescreve data_inicio e data_fim se fornecido.',
    enum: PeriodoPredefinido,
    example: PeriodoPredefinido.ULTIMOS_30_DIAS,
    enumName: 'PeriodoPredefinido'
  })
  @IsOptional()
  @IsEnum(PeriodoPredefinido)
  periodo?: PeriodoPredefinido;

  @ApiPropertyOptional({
    description: 'Data de início do período para filtrar agendamentos (formato ISO 8601). Usado quando período não é especificado.',
    example: '2024-01-01T00:00:00.000Z',
    format: 'date-time'
  })
  @IsOptional()
  @IsString()
  data_inicio?: string;

  @ApiPropertyOptional({
    description: 'Data de fim do período para filtrar agendamentos (formato ISO 8601). Usado quando período não é especificado.',
    example: '2024-12-31T23:59:59.999Z',
    format: 'date-time'
  })
  @IsOptional()
  @IsString()
  data_fim?: string;

  // ========== FILTROS ESPECÍFICOS ==========
  
  @ApiPropertyOptional({
    description: 'Filtrar apenas agendamentos em atraso (data/hora do agendamento já passou e status ainda não é concluído).',
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
  em_atraso?: boolean;

  @ApiPropertyOptional({
    description: 'Incluir agendamentos cancelados nos resultados. Por padrão, agendamentos cancelados são excluídos.',
    example: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  incluir_cancelados?: boolean;

  // ========== CONFIGURAÇÕES DE RESPOSTA ==========
  
  @ApiPropertyOptional({
    description: 'Incluir relacionamentos nas respostas (beneficiario, tecnico, unidade, pagamento). Pode impactar performance.',
    example: true,
    default: true
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
    description: 'Campo para ordenação dos resultados.',
    example: 'data_agendamento',
    enum: ['data_agendamento', 'created_at', 'updated_at', 'prioridade', 'status'],
    default: 'data_agendamento'
  })
  @IsOptional()
  @IsString()
  @IsEnum(['data_agendamento', 'created_at', 'updated_at', 'prioridade', 'status'])
  sort_by?: string;

  @ApiPropertyOptional({
    description: 'Direção da ordenação dos resultados.',
    example: 'ASC',
    enum: ['ASC', 'DESC'],
    default: 'ASC'
  })
  @IsOptional()
  @IsString()
  @IsEnum(['ASC', 'DESC'])
  sort_order?: 'ASC' | 'DESC';
}

/**
 * DTO de resposta para filtros avançados de agendamentos
 * Inclui metadados sobre os filtros aplicados e estatísticas
 */
export class AgendamentoFiltrosResponseDto {
  @ApiPropertyOptional({
    description: 'Lista de unidades disponíveis para filtro',
    type: [Object],
    example: [
      { id: '550e8400-e29b-41d4-a716-446655440000', nome: 'CRAS Centro', total_agendamentos: 45 },
      { id: '660e8400-e29b-41d4-a716-446655440001', nome: 'CREAS Norte', total_agendamentos: 32 }
    ]
  })
  unidades?: Array<{ id: string; nome: string; total_agendamentos: number }>;

  @ApiPropertyOptional({
    description: 'Lista de status disponíveis para filtro com contadores',
    type: [Object],
    example: [
      { status: 'agendado', total: 120 },
      { status: 'em_andamento', total: 45 },
      { status: 'concluido', total: 230 }
    ]
  })
  status?: Array<{ status: string; total: number }>;

  @ApiPropertyOptional({
    description: 'Lista de tipos de visita disponíveis para filtro com contadores',
    type: [Object],
    example: [
      { tipo: 'inicial', total: 85 },
      { tipo: 'acompanhamento', total: 150 },
      { tipo: 'reavaliacao', total: 65 }
    ]
  })
  tipos_visita?: Array<{ tipo: string; total: number }>;

  @ApiPropertyOptional({
    description: 'Lista de prioridades disponíveis para filtro com contadores',
    type: [Object],
    example: [
      { prioridade: 'alta', total: 25 },
      { prioridade: 'media', total: 180 },
      { prioridade: 'baixa', total: 95 }
    ]
  })
  prioridades?: Array<{ prioridade: string; total: number }>;

  @ApiPropertyOptional({
    description: 'Lista de técnicos disponíveis para filtro',
    type: [Object],
    example: [
      { id: '550e8400-e29b-41d4-a716-446655440002', nome: 'Maria Santos', total_agendamentos: 28 },
      { id: '660e8400-e29b-41d4-a716-446655440003', nome: 'João Silva', total_agendamentos: 35 }
    ]
  })
  tecnicos?: Array<{ id: string; nome: string; total_agendamentos: number }>;

  @ApiPropertyOptional({
    description: 'Estatísticas gerais dos agendamentos',
    type: Object,
    example: {
      total_agendamentos: 395,
      agendamentos_em_atraso: 12,
      agendamentos_hoje: 8,
      agendamentos_proximos_7_dias: 45
    }
  })
  estatisticas?: {
    total_agendamentos: number;
    agendamentos_em_atraso: number;
    agendamentos_hoje: number;
    agendamentos_proximos_7_dias: number;
  };

  @ApiPropertyOptional({
    description: 'Períodos predefinidos disponíveis',
    enum: PeriodoPredefinido,
    isArray: true,
    example: Object.values(PeriodoPredefinido)
  })
  periodos_disponiveis?: PeriodoPredefinido[];
}