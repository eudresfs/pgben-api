import {
  IsOptional,
  IsDateString,
  IsEnum,
  IsUUID,
  IsString,
  IsArray,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TipoAcaoCritica } from '../enums/aprovacao.enums';

/**
 * DTO para consultar métricas de aprovação
 */
export class MetricasAprovacaoDto {
  @ApiPropertyOptional({
    description: 'Data de início do período de análise (ISO 8601)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  data_inicio?: string;

  @ApiPropertyOptional({
    description: 'Data de fim do período de análise (ISO 8601)',
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  data_fim?: string;

  @ApiPropertyOptional({
    description: 'Tipos de ação crítica para análise',
    enum: TipoAcaoCritica,
    isArray: true,
    example: [TipoAcaoCritica.CANCELAMENTO_SOLICITACAO],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(TipoAcaoCritica, { each: true })
  tipos_acao?: TipoAcaoCritica[];

  @ApiPropertyOptional({
    description: 'IDs dos aprovadores para análise',
    example: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  aprovadores_ids?: string[];

  @ApiPropertyOptional({
    description: 'IDs das unidades organizacionais para análise',
    example: ['unidade-001', 'unidade-002'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  unidades_ids?: string[];

  @ApiPropertyOptional({
    description: 'Departamentos para análise',
    example: ['TI', 'Financeiro', 'RH'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  departamentos?: string[];

  @ApiPropertyOptional({
    description: 'Granularidade temporal das métricas',
    enum: ['hora', 'dia', 'semana', 'mes', 'ano'],
    example: 'dia',
  })
  @IsOptional()
  @IsEnum(['hora', 'dia', 'semana', 'mes', 'ano'])
  granularidade?: 'hora' | 'dia' | 'semana' | 'mes' | 'ano';

  @ApiPropertyOptional({
    description: 'Tipos de métricas a serem incluídas',
    example: ['performance', 'volume', 'sla', 'aprovadores'],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(['performance', 'volume', 'sla', 'aprovadores', 'acoes'], { each: true })
  tipos_metricas?: ('performance' | 'volume' | 'sla' | 'aprovadores' | 'acoes')[];

  @ApiPropertyOptional({
    description: 'Incluir comparação com período anterior',
    example: true,
  })
  @IsOptional()
  incluir_comparacao?: boolean;

  @ApiPropertyOptional({
    description: 'Incluir tendências e projeções',
    example: true,
  })
  @IsOptional()
  incluir_tendencias?: boolean;

  @ApiPropertyOptional({
    description: 'Incluir alertas e anomalias detectadas',
    example: true,
  })
  @IsOptional()
  incluir_alertas?: boolean;

  @ApiPropertyOptional({
    description: 'Incluir breakdown por categoria',
    example: true,
  })
  @IsOptional()
  incluir_breakdown?: boolean;

  @ApiPropertyOptional({
    description: 'Formato de exportação dos dados',
    enum: ['json', 'csv', 'excel'],
    example: 'json',
  })
  @IsOptional()
  @IsEnum(['json', 'csv', 'excel'])
  formato_exportacao?: 'json' | 'csv' | 'excel';
}

/**
 * DTO para resposta de métricas de performance
 */
export class MetricasPerformanceResponseDto {
  tempo_medio_aprovacao: number;
  tempo_mediano_aprovacao: number;
  tempo_maximo_aprovacao: number;
  tempo_minimo_aprovacao: number;
  desvio_padrao_tempo: number;
  percentil_95_tempo: number;
  taxa_aprovacao_no_prazo: number;
  tempo_medio_por_tipo: Record<string, number>;
  distribuicao_tempo_aprovacao: {
    faixa: string;
    quantidade: number;
    percentual: number;
  }[];
}

/**
 * DTO para resposta de métricas de volume
 */
export class MetricasVolumeResponseDto {
  total_solicitacoes: number;
  total_aprovadas: number;
  total_rejeitadas: number;
  total_canceladas: number;
  total_pendentes: number;
  taxa_aprovacao: number;
  taxa_rejeicao: number;
  volume_por_periodo: {
    periodo: string;
    quantidade: number;
  }[];
  volume_por_tipo: Record<string, number>;
  pico_volume_diario: {
    data: string;
    quantidade: number;
  };
}

/**
 * DTO para resposta de métricas de SLA
 */
export class MetricasSlaResponseDto {
  sla_geral: number;
  sla_por_tipo: Record<string, number>;
  sla_por_aprovador: Record<string, number>;
  violacoes_sla: number;
  taxa_violacao_sla: number;
  tempo_medio_violacao: number;
  solicitacoes_criticas_pendentes: number;
  alertas_prazo: {
    solicitacao_id: string;
    tempo_restante_horas: number;
    criticidade: string;
  }[];
}

/**
 * DTO para resposta de métricas por aprovador
 */
export class MetricasAprovadorResponseDto {
  aprovador_id: string;
  nome_aprovador: string;
  total_processadas: number;
  total_aprovadas: number;
  total_rejeitadas: number;
  tempo_medio_processamento: number;
  taxa_aprovacao: number;
  eficiencia_score: number;
  carga_trabalho_atual: number;
  disponibilidade_percentual: number;
  especializacoes: string[];
}

/**
 * DTO para resposta de métricas por ação
 */
export class MetricasAcaoResponseDto {
  tipo_acao: string;
  total_solicitacoes: number;
  tempo_medio_aprovacao: number;
  taxa_aprovacao: number;
  complexidade_media: number;
  aprovadores_especializados: number;
  tendencia_volume: 'crescente' | 'estavel' | 'decrescente';
  risco_medio: number;
}

/**
 * DTO para resposta completa de métricas
 */
export class MetricasCompletasResponseDto {
  periodo: {
    inicio: string;
    fim: string;
    granularidade: string;
  };
  performance?: MetricasPerformanceResponseDto;
  volume?: MetricasVolumeResponseDto;
  sla?: MetricasSlaResponseDto;
  aprovadores?: MetricasAprovadorResponseDto[];
  acoes?: MetricasAcaoResponseDto[];
  comparacao_periodo_anterior?: {
    performance_delta: number;
    volume_delta: number;
    sla_delta: number;
  };
  tendencias?: {
    volume_projetado_proximo_mes: number;
    tempo_aprovacao_tendencia: 'melhorando' | 'piorando' | 'estavel';
    gargalos_identificados: string[];
  };
  alertas?: {
    tipo: 'sla_violation' | 'volume_spike' | 'performance_degradation' | 'aprovador_overload';
    severidade: 'baixa' | 'media' | 'alta' | 'critica';
    descricao: string;
    acao_recomendada: string;
    timestamp: string;
  }[];
  resumo_executivo: {
    pontos_positivos: string[];
    areas_melhoria: string[];
    recomendacoes: string[];
    kpis_principais: Record<string, number>;
  };
}