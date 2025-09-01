import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsArray, IsEnum, IsString, IsBoolean, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationParamsDto } from '../../../shared/dtos/pagination-params.dto';
import { StatusSolicitacao } from '../enums';
import { PeriodoPredefinido } from '../../../enums/periodo-predefinido.enum';
import { transformToStringArray, transformToUUIDArray } from '../../../common/utils/filtros-transform.util';

/**
 * DTO para filtros avançados de aprovações
 * 
 * Implementa o padrão de filtros avançados estabelecido no sistema,
 * permitindo filtros por múltiplos valores e períodos predefinidos.
 */
export class AprovacaoFiltrosAvancadosDto extends PaginationParamsDto {
  // ========== FILTROS POR MÚLTIPLOS VALORES ==========
  
  @ApiPropertyOptional({
    description: 'Lista de IDs das unidades administrativas para filtrar aprovações. Permite filtrar por múltiplas unidades simultaneamente para relatórios gerenciais.',
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
  @Transform(({ value }) => transformToUUIDArray(value))
  unidades?: string[];

  @ApiPropertyOptional({
    description: 'Lista de status das solicitações de aprovação para filtrar. Permite buscar aprovações em múltiplos status simultaneamente para análises de fluxo.',
    type: [String],
    enum: StatusSolicitacao,
    example: [StatusSolicitacao.PENDENTE, StatusSolicitacao.APROVADA, StatusSolicitacao.REJEITADA],
    items: {
      type: 'string',
      enum: Object.values(StatusSolicitacao),
      description: 'Status válido da solicitação no fluxo de aprovação'
    },
    maxItems: 20
  })
  @IsOptional()
  @IsArray()
  @IsEnum(StatusSolicitacao, { each: true })
  @Transform(({ value }) => transformToStringArray(value))
  status?: StatusSolicitacao[];

  @ApiPropertyOptional({
    description: 'Lista de tipos de ação para filtrar aprovações. Permite buscar por múltiplos tipos de ação simultaneamente.',
    type: [String],
    example: ['PAGAMENTO_EMERGENCIAL', 'ALTERACAO_BENEFICIO', 'CANCELAMENTO_SOLICITACAO'],
    items: {
      type: 'string',
      description: 'Tipo de ação que requer aprovação'
    },
    maxItems: 30
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => transformToStringArray(value))
  tipos_acao?: string[];

  @ApiPropertyOptional({
    description: 'Lista de IDs dos solicitantes para filtrar aprovações. Permite buscar aprovações de múltiplos usuários simultaneamente.',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440001'],
    items: {
      type: 'string',
      format: 'uuid',
      description: 'UUID do usuário solicitante'
    },
    maxItems: 100
  })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => transformToUUIDArray(value))
  solicitantes?: string[];

  @ApiPropertyOptional({
    description: 'Lista de IDs dos aprovadores para filtrar aprovações. Permite buscar aprovações processadas por múltiplos aprovadores simultaneamente.',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440001'],
    items: {
      type: 'string',
      format: 'uuid',
      description: 'UUID do usuário aprovador'
    },
    maxItems: 100
  })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => transformToUUIDArray(value))
  aprovadores?: string[];

  // ========== FILTROS DE PERÍODO ==========
  
  @ApiPropertyOptional({
    description: 'Período predefinido para filtrar aprovações por data de criação. Sobrescreve data_inicio e data_fim se especificado.',
    enum: PeriodoPredefinido,
    example: PeriodoPredefinido.ULTIMOS_30_DIAS,
    enumName: 'PeriodoPredefinido'
  })
  @IsOptional()
  @IsEnum(PeriodoPredefinido)
  periodo?: PeriodoPredefinido;

  @ApiPropertyOptional({
    description: 'Data de início para filtro por período de criação da solicitação (formato ISO 8601). Ignorado se período predefinido for especificado.',
    type: String,
    format: 'date',
    example: '2024-01-01'
  })
  @IsOptional()
  @IsDateString()
  data_inicio?: string;

  @ApiPropertyOptional({
    description: 'Data de fim para filtro por período de criação da solicitação (formato ISO 8601). Ignorado se período predefinido for especificado.',
    type: String,
    format: 'date',
    example: '2024-12-31'
  })
  @IsOptional()
  @IsDateString()
  data_fim?: string;

  // ========== FILTROS DE BUSCA ==========
  
  @ApiPropertyOptional({
    description: 'Termo de busca textual. Busca em código da solicitação, justificativa, observações e dados da ação.',
    type: String,
    example: 'pagamento emergencial',
    minLength: 2,
    maxLength: 100
  })
  @IsOptional()
  @IsString()
  search?: string;

  // ========== FILTROS ESPECÍFICOS ==========
  
  @ApiPropertyOptional({
    description: 'Filtrar apenas aprovações com prazo vencido (data atual > prazo_aprovacao).',
    type: Boolean,
    example: true
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  prazo_vencido?: boolean;

  @ApiPropertyOptional({
    description: 'Incluir aprovações processadas (aprovadas/rejeitadas) nos resultados. Por padrão, inclui todas.',
    type: Boolean,
    example: false,
    default: true
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  incluir_processadas?: boolean;

  // ========== CONFIGURAÇÕES DE RESPOSTA ==========
  
  @ApiPropertyOptional({
    description: 'Relacionamentos a incluir na resposta para otimizar consultas.',
    type: Boolean,
    example: true
  })
  @IsOptional()
  @IsBoolean()
  include_relations?: boolean;

  @ApiPropertyOptional({
    description: 'Campo para ordenação dos resultados.',
    type: String,
    example: 'created_at',
    enum: ['created_at', 'prazo_aprovacao', 'processado_em', 'codigo'],
    default: 'created_at'
  })
  @IsOptional()
  @IsString()
  sort_by?: string;

  @ApiPropertyOptional({
    description: 'Direção da ordenação dos resultados.',
    type: String,
    example: 'DESC',
    enum: ['ASC', 'DESC'],
    default: 'DESC'
  })
  @IsOptional()
  @IsString()
  sort_order?: 'ASC' | 'DESC';
}

/**
 * DTO de resposta para filtros avançados de aprovações
 * 
 * Contém dados dos filtros disponíveis e estatísticas para construção
 * de interfaces dinâmicas de filtro.
 */
export class AprovacaoFiltrosResponseDto {
  @ApiPropertyOptional({
    description: 'Lista de unidades disponíveis para filtro com contadores',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        nome: { type: 'string' },
        total_aprovacoes: { type: 'number' }
      }
    }
  })
  unidades: Array<{
    id: string;
    nome: string;
    total_aprovacoes: number;
  }>;

  @ApiPropertyOptional({
    description: 'Lista de status disponíveis para filtro com contadores',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        total: { type: 'number' }
      }
    }
  })
  status: Array<{
    status: string;
    total: number;
  }>;

  @ApiPropertyOptional({
    description: 'Lista de tipos de ação disponíveis para filtro com contadores',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        tipo_acao: { type: 'string' },
        total: { type: 'number' }
      }
    }
  })
  tipos_acao: Array<{
    tipo_acao: string;
    total: number;
  }>;

  @ApiPropertyOptional({
    description: 'Lista de solicitantes disponíveis para filtro com contadores',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        nome: { type: 'string' },
        total_solicitacoes: { type: 'number' }
      }
    }
  })
  solicitantes: Array<{
    id: string;
    nome: string;
    total_solicitacoes: number;
  }>;

  @ApiPropertyOptional({
    description: 'Estatísticas gerais das aprovações',
    type: 'object',
    properties: {
      total_aprovacoes: { type: 'number' },
      aprovacoes_pendentes: { type: 'number' },
      aprovacoes_vencidas: { type: 'number' },
      aprovacoes_hoje: { type: 'number' }
    }
  })
  estatisticas: {
    total_aprovacoes: number;
    aprovacoes_pendentes: number;
    aprovacoes_vencidas: number;
    aprovacoes_hoje: number;
  };

  @ApiPropertyOptional({
    description: 'Lista de aprovações filtradas',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        codigo: { type: 'string' },
        status: { type: 'string' },
        tipo_acao: { type: 'string' },
        solicitante: { type: 'object' },
        created_at: { type: 'string', format: 'date-time' }
      }
    }
  })
  data: Array<{
    id: string;
    codigo: string;
    status: string;
    tipo_acao: string;
    solicitante: any;
    created_at: Date;
  }>;

  @ApiPropertyOptional({
    description: 'Metadados de paginação',
    example: {
      limit: 20,
      total: 20,
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

  @ApiPropertyOptional({
    description: 'Períodos predefinidos disponíveis para filtro',
    type: 'array',
    items: {
      type: 'string',
      enum: Object.values(PeriodoPredefinido)
    }
  })
  periodos_disponiveis: PeriodoPredefinido[];
}