import {
  IsOptional,
  IsDateString,
  IsEnum,
  IsUUID,
  IsString,
  IsArray,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TipoAcaoCritica } from '../enums/aprovacao.enums';
import { StatusSolicitacao } from '@/enums';

/**
 * DTO para gerar relatórios de aprovação
 */
export class RelatorioAprovacaoDto {
  @ApiPropertyOptional({
    description: 'Tipo de relatório a ser gerado',
    enum: [
      'geral',
      'por_aprovador',
      'por_acao',
      'por_departamento',
      'sla',
      'auditoria',
      'performance',
      'compliance',
    ],
    example: 'geral',
  })
  @IsOptional()
  @IsEnum([
    'geral',
    'por_aprovador',
    'por_acao',
    'por_departamento',
    'sla',
    'auditoria',
    'performance',
    'compliance',
  ])
  tipo_relatorio?: string;

  @ApiPropertyOptional({
    description: 'Data de início do período do relatório (ISO 8601)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  data_inicio?: string;

  @ApiPropertyOptional({
    description: 'Data de fim do período do relatório (ISO 8601)',
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  data_fim?: string;

  @ApiPropertyOptional({
    description: 'Status das solicitações a incluir',
    enum: StatusSolicitacao,
    isArray: true,
    example: [StatusSolicitacao.APROVADA, StatusSolicitacao.INDEFERIDA],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(StatusSolicitacao, { each: true })
  status_filtro?: StatusSolicitacao[];

  @ApiPropertyOptional({
    description: 'Tipos de ação crítica a incluir',
    enum: TipoAcaoCritica,
    isArray: true,
    example: [TipoAcaoCritica.CANCELAR_SOLICITACAO],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(TipoAcaoCritica, { each: true })
  tipos_acao?: TipoAcaoCritica[];

  @ApiPropertyOptional({
    description: 'IDs dos aprovadores a incluir no relatório',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  aprovadores_ids?: string[];

  @ApiPropertyOptional({
    description: 'Departamentos a incluir no relatório',
    example: ['TI', 'Financeiro'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  departamentos?: string[];

  @ApiPropertyOptional({
    description: 'Unidades organizacionais a incluir',
    example: ['unidade-001', 'unidade-002'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  unidades?: string[];

  @ApiPropertyOptional({
    description: 'Formato de saída do relatório',
    enum: ['json', 'pdf', 'excel', 'csv'],
    example: 'pdf',
  })
  @IsOptional()
  @IsEnum(['json', 'pdf', 'excel', 'csv'])
  formato?: 'json' | 'pdf' | 'excel' | 'csv';

  @ApiPropertyOptional({
    description: 'Incluir gráficos no relatório',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  incluir_graficos?: boolean;

  @ApiPropertyOptional({
    description: 'Incluir detalhes das solicitações',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  incluir_detalhes?: boolean;

  @ApiPropertyOptional({
    description: 'Incluir análise de tendências',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  incluir_tendencias?: boolean;

  @ApiPropertyOptional({
    description: 'Incluir comparação com período anterior',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  incluir_comparacao?: boolean;

  @ApiPropertyOptional({
    description: 'Incluir recomendações de melhoria',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  incluir_recomendacoes?: boolean;

  @ApiPropertyOptional({
    description: 'Nível de detalhamento do relatório',
    enum: ['resumido', 'detalhado', 'completo'],
    example: 'detalhado',
  })
  @IsOptional()
  @IsEnum(['resumido', 'detalhado', 'completo'])
  nivel_detalhamento?: 'resumido' | 'detalhado' | 'completo';

  @ApiPropertyOptional({
    description: 'Agrupar dados por período',
    enum: ['dia', 'semana', 'mes', 'trimestre', 'ano'],
    example: 'mes',
  })
  @IsOptional()
  @IsEnum(['dia', 'semana', 'mes', 'trimestre', 'ano'])
  agrupamento_temporal?: 'dia' | 'semana' | 'mes' | 'trimestre' | 'ano';

  @ApiPropertyOptional({
    description: 'Filtros customizados adicionais',
    example: { prioridade: 'alta', valor_minimo: 1000 },
  })
  @IsOptional()
  filtros_customizados?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Campos específicos a incluir no relatório',
    example: ['tempo_aprovacao', 'justificativa', 'valor_operacao'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  campos_incluir?: string[];

  @ApiPropertyOptional({
    description: 'Título personalizado do relatório',
    example: 'Relatório de Aprovações - Q1 2024',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titulo_personalizado?: string;

  @ApiPropertyOptional({
    description: 'Observações adicionais para o relatório',
    example: 'Análise focada em melhorias de processo',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacoes?: string;

  @ApiPropertyOptional({
    description: 'Enviar relatório por email após geração',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  enviar_email?: boolean;

  @ApiPropertyOptional({
    description: 'Emails para envio do relatório',
    example: ['gestor@empresa.com', 'auditoria@empresa.com'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  emails_destinatarios?: string[];
}

/**
 * DTO para resposta de relatório geral
 */
export class RelatorioGeralResponseDto {
  periodo: {
    inicio: string;
    fim: string;
  };
  resumo_executivo: {
    total_solicitacoes: number;
    taxa_aprovacao: number;
    tempo_medio_aprovacao: number;
    sla_cumprimento: number;
    principais_gargalos: string[];
  };
  metricas_principais: {
    volume_por_status: Record<string, number>;
    distribuicao_por_tipo: Record<string, number>;
    performance_aprovadores: {
      aprovador: string;
      total_processadas: number;
      tempo_medio: number;
      taxa_aprovacao: number;
    }[];
  };
  analise_temporal: {
    periodo: string;
    volume: number;
    tempo_medio: number;
    taxa_aprovacao: number;
  }[];
  indicadores_qualidade: {
    taxa_retrabalho: number;
    satisfacao_usuarios: number;
    conformidade_processos: number;
    eficiencia_operacional: number;
  };
  recomendacoes?: string[];
  alertas?: {
    tipo: string;
    descricao: string;
    severidade: string;
  }[];
}

/**
 * DTO para resposta de relatório por aprovador
 */
export class RelatorioPorAprovadorResponseDto {
  aprovador: {
    id: string;
    nome: string;
    email: string;
    departamento: string;
    cargo: string;
  };
  estatisticas: {
    total_solicitacoes_recebidas: number;
    total_processadas: number;
    total_pendentes: number;
    taxa_aprovacao: number;
    tempo_medio_processamento: number;
    carga_trabalho_atual: number;
  };
  performance_temporal: {
    periodo: string;
    processadas: number;
    tempo_medio: number;
    taxa_aprovacao: number;
  }[];
  tipos_acao_especialidade: {
    tipo: string;
    quantidade: number;
    tempo_medio: number;
    taxa_sucesso: number;
  }[];
  comparacao_pares: {
    posicao_ranking: number;
    total_aprovadores: number;
    percentil_performance: number;
  };
  areas_melhoria: string[];
  pontos_fortes: string[];
}

/**
 * DTO para resposta de relatório de auditoria
 */
export class RelatorioAuditoriaResponseDto {
  periodo_auditoria: {
    inicio: string;
    fim: string;
  };
  conformidade_geral: {
    score_conformidade: number;
    total_verificacoes: number;
    violacoes_encontradas: number;
    riscos_identificados: number;
  };
  analise_processos: {
    processos_auditados: string[];
    aderencia_procedimentos: number;
    controles_efetivos: number;
    gaps_identificados: string[];
  };
  trilha_auditoria: {
    solicitacao_id: string;
    acao: string;
    usuario: string;
    timestamp: string;
    detalhes: Record<string, any>;
    conformidade: boolean;
  }[];
  recomendacoes_compliance: {
    prioridade: 'alta' | 'media' | 'baixa';
    categoria: string;
    descricao: string;
    prazo_implementacao: string;
    responsavel_sugerido: string;
  }[];
  certificacoes_status: {
    certificacao: string;
    status: 'conforme' | 'nao_conforme' | 'em_adequacao';
    proxima_auditoria: string;
    observacoes: string;
  }[];
}