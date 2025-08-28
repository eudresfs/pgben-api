import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsArray, IsString, IsUUID, IsEnum, IsDateString, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { StatusSolicitacao } from '../../../entities/solicitacao.entity';
import { PeriodoPredefinido, Prioridade } from '../../../enums';
import { transformToStringArray, transformToUUIDArray, transformToEnumArray } from '../../../common/utils';
import { PaginationParamsDto } from '../../../shared/dtos/pagination-params.dto';
import { 
  IResultadoFiltros, 
  IFiltrosAvancados,
  IPeriodoCalculado 
} from '../../../common/interfaces/filtros-avancados.interface';

/**
 * DTO para filtros avançados de solicitações
 * 
 * Implementa o padrão de filtros avançados estabelecido no sistema,
 * permitindo filtros por múltiplos valores e períodos predefinidos.
 */
export class SolicitacaoFiltrosAvancadosDto extends PaginationParamsDto {
  // ========== FILTROS POR MÚLTIPLOS VALORES ==========
  
  @ApiPropertyOptional({
    description: 'Lista de IDs das unidades administrativas para filtrar solicitações. Permite filtrar por múltiplas unidades simultaneamente para relatórios gerenciais.',
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
    description: 'Lista de status das solicitações para filtrar. Permite buscar solicitações em múltiplos status simultaneamente para análises de fluxo.',
    type: [String],
    enum: StatusSolicitacao,
    example: [StatusSolicitacao.ABERTA, StatusSolicitacao.EM_ANALISE, StatusSolicitacao.APROVADA],
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
  @Transform(({ value }) => transformToEnumArray(value, StatusSolicitacao))
  status?: StatusSolicitacao[];

  @ApiPropertyOptional({
    description: 'Lista de IDs dos tipos de benefícios para filtrar solicitações. Útil para relatórios específicos por programa social ou tipo de auxílio.',
    type: [String],
    example: ['770e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440003'],
    items: {
      type: 'string',
      format: 'uuid',
      description: 'UUID do tipo de benefício (Auxílio Natalidade, Bolsa Família, etc.)'
    },
    maxItems: 50
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @Transform(({ value }) => transformToUUIDArray(value))
  beneficios?: string[];

  @ApiPropertyOptional({
    description: 'Lista de IDs dos usuários responsáveis/técnicos para filtrar solicitações. Útil para relatórios de produtividade e acompanhamento.',
    type: [String],
    example: ['990e8400-e29b-41d4-a716-446655440004', 'aa0e8400-e29b-41d4-a716-446655440005'],
    items: {
      type: 'string',
      format: 'uuid',
      description: 'UUID do usuário técnico responsável pela análise'
    },
    maxItems: 50
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @Transform(({ value }) => transformToUUIDArray(value))
  usuarios?: string[];

  @ApiPropertyOptional({
    description: 'Lista de bairros para filtrar',
    type: [String],
    example: ['Centro', 'Cidade Nova', 'Lagoa Nova']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => transformToStringArray(value))
  bairros?: string[];

  @ApiPropertyOptional({
    description: 'Lista de IDs de beneficiários para filtrar',
    type: [String],
    example: ['bb0e8400-e29b-41d4-a716-446655440006', 'cc0e8400-e29b-41d4-a716-446655440007']
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @Transform(({ value }) => transformToUUIDArray(value))
  beneficiarios?: string[];

  @ApiPropertyOptional({
    description: 'Lista de prioridades para filtrar solicitações. Permite identificar casos urgentes e organizar fluxo de trabalho.',
    type: [String],
    enum: Prioridade,
    example: [Prioridade.ALTA, Prioridade.CRITICA],
    items: {
      type: 'string',
      enum: Object.values(Prioridade),
      description: 'Nível de prioridade da solicitação'
    },
    maxItems: 10
  })
  @IsOptional()
  @IsArray()
  @IsEnum(Prioridade, { each: true })
  @Transform(({ value }) => transformToEnumArray(value, Prioridade))
  prioridades?: Prioridade[];

  // ========== FILTROS DE PERÍODO ==========
  
  @ApiPropertyOptional({
    description: 'Período predefinido para filtrar solicitações por data de abertura. Facilita consultas rápidas sem especificar datas exatas.',
    enum: PeriodoPredefinido,
    example: PeriodoPredefinido.MES_ATUAL,
    enumName: 'PeriodoPredefinido',
    examples: {
      hoje: {
        value: 'HOJE',
        description: 'Solicitações abertas hoje'
      },
      semana: {
        value: 'SEMANA_ATUAL',
        description: 'Solicitações da semana atual (segunda a domingo)'
      },
      mes: {
        value: 'MES_ATUAL',
        description: 'Solicitações do mês atual'
      },
      trimestre: {
        value: 'TRIMESTRE_ATUAL',
        description: 'Solicitações do trimestre atual'
      },
      ano: {
        value: 'ANO_ATUAL',
        description: 'Solicitações do ano atual'
      }
    }
  })
  @IsOptional()
  @IsEnum(PeriodoPredefinido)
  periodo?: PeriodoPredefinido;

  @ApiPropertyOptional({
    description: 'Data de início personalizada (formato: YYYY-MM-DD)',
    type: String,
    example: '2024-01-01'
  })
  @IsOptional()
  @IsDateString()
  data_inicio_personalizada?: string;

  @ApiPropertyOptional({
    description: 'Data de fim personalizada (formato: YYYY-MM-DD)',
    type: String,
    example: '2024-12-31'
  })
  @IsOptional()
  @IsDateString()
  data_fim_personalizada?: string;

  // ========== FILTROS DE BUSCA ==========
  
  @ApiPropertyOptional({
    description: 'Termo para busca livre em protocolo, nome do beneficiário ou CPF. Busca parcial e case-insensitive com mínimo de 2 caracteres.',
    type: String,
    example: 'João Silva',
    minLength: 2,
    maxLength: 100,
    examples: {
      nome: {
        value: 'João Silva',
        description: 'Busca por nome completo ou parcial do beneficiário'
      },
      protocolo: {
        value: 'SOL-2024-001',
        description: 'Busca por número do protocolo completo ou parcial'
      },
      cpf: {
        value: '123.456.789',
        description: 'Busca parcial por CPF (com ou sem pontuação)'
      },
      termo_geral: {
        value: 'auxilio',
        description: 'Busca geral em múltiplos campos'
      }
    }
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Lista de protocolos para filtrar',
    type: [String],
    example: ['SOL-2024-001', 'SOL-2024-002']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => transformToStringArray(value))
  protocolos?: string[];

  // ========== FILTROS ESPECÍFICOS ==========
  
  @ApiPropertyOptional({
    description: 'Filtrar apenas solicitações com determinação judicial',
    type: Boolean,
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
  apenas_determinacao_judicial?: boolean;

  @ApiPropertyOptional({
    description: 'Incluir solicitações arquivadas',
    type: Boolean,
    example: false
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  incluir_arquivados?: boolean;

  // ========== ORDENAÇÃO ==========
  
  @ApiPropertyOptional({
    description: 'Campo para ordenação',
    enum: ['data_abertura', 'data_aprovacao', 'protocolo', 'status', 'prioridade'],
    example: 'data_abertura'
  })
  @IsOptional()
  @IsString()
  @IsEnum(['data_abertura', 'data_aprovacao', 'protocolo', 'status', 'prioridade'])
  sort_by?: 'data_abertura' | 'data_aprovacao' | 'protocolo' | 'status' | 'prioridade';

  @ApiPropertyOptional({
    description: 'Direção da ordenação',
    enum: ['ASC', 'DESC'],
    example: 'DESC'
  })
  @IsOptional()
  @IsString()
  @IsEnum(['ASC', 'DESC'])
  sort_order?: 'ASC' | 'DESC';


}

/**
 * DTO para resposta paginada de solicitações com filtros avançados
 */
export class SolicitacaoFiltrosResponseDto implements IResultadoFiltros {
  @ApiProperty({
    description: 'Lista paginada de solicitações que atendem aos critérios de filtro aplicados',
    type: [Object],
    example: [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        protocolo: 'SOL-2024-001',
        status: 'em_analise',
        data_abertura: '2024-01-15T10:30:00Z',
        data_aprovacao: null,
        valor: 500.00,
        prioridade: 'ALTA',
        beneficiario: {
          id: '660e8400-e29b-41d4-a716-446655440001',
          nome: 'João Silva',
          cpf: '123.456.789-00'
        },
        beneficio: {
          id: '770e8400-e29b-41d4-a716-446655440002',
          nome: 'Auxílio Natalidade',
          valor_base: 500.00
        },
        unidade: {
          id: '880e8400-e29b-41d4-a716-446655440003',
          nome: 'CRAS Centro',
          tipo: 'CRAS'
        },
        tecnico: {
          id: '990e8400-e29b-41d4-a716-446655440004',
          nome: 'Maria Santos'
        }
      }
    ]
  })
  items: any[];

  @ApiProperty({
    description: 'Número total de registros encontrados (antes da paginação)',
    example: 150,
    minimum: 0
  })
  total: number;

  @ApiProperty({
    description: 'Objeto contendo todos os filtros que foram efetivamente aplicados na consulta',
    type: Object,
    example: {
      unidades: ['550e8400-e29b-41d4-a716-446655440000'],
      status: ['em_analise', 'aprovada'],
      periodo: 'mes_atual',
      search: 'João',
      prioridades: ['alta', 'critica']
    }
  })
  filtros_aplicados: IFiltrosAvancados;

  @ApiPropertyOptional({
    description: 'Período calculado automaticamente com base nos filtros de data aplicados',
    type: Object,
    example: {
      data_inicio: '2024-01-01T00:00:00Z',
      data_fim: '2024-01-31T23:59:59Z',
      descricao: 'Janeiro de 2024',
      tipo_periodo: 'mes_atual'
    }
  })
  periodoCalculado?: IPeriodoCalculado;

  @ApiProperty({
    description: 'Metadados completos de paginação para navegação entre páginas',
    type: Object,
    example: {
      limit: 10,
      offset: 0,
      page: 1,
      totalPages: 15,
      hasNextPage: true,
      hasPreviousPage: false
    }
  })
  meta: {
    limit: number;
    offset: number;
    page: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };

  @ApiProperty({
    description: 'Tempo total de execução da consulta em milissegundos (útil para monitoramento de performance)',
    example: 150,
    minimum: 0
  })
  tempo_execucao: number;
}