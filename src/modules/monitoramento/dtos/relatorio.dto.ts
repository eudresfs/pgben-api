import {
  IsUUID,
  IsEnum,
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  IsDateString,
  Min,
  Max,
  Length,
  ArrayMinSize,
  ArrayMaxSize,
  IsIn,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  TipoAvaliacao,
  ResultadoAvaliacao,
  StatusVisita,
} from '../enums';
import { StatusAgendamento } from '../enums';

/**
 * DTO para filtros de relatórios de monitoramento
 */
export class FiltrosRelatorioDto {
  @ApiPropertyOptional({
    description: 'Data de início do período',
    example: '2024-01-01',
    type: String,
    format: 'date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data de início deve ser uma data válida' })
  data_inicio?: string;

  @ApiPropertyOptional({
    description: 'Data de fim do período',
    example: '2024-12-31',
    type: String,
    format: 'date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data de fim deve ser uma data válida' })
  data_fim?: string;

  @ApiPropertyOptional({
    description: 'IDs dos técnicos para filtrar',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'IDs dos técnicos devem ser um array' })
  @ArrayMaxSize(50, { message: 'Máximo de 50 técnicos por filtro' })
  @IsUUID('4', { each: true, message: 'Cada ID de técnico deve ser um UUID válido' })
  tecnicos_ids?: string[];

  @ApiPropertyOptional({
    description: 'IDs dos cidadãos para filtrar',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'IDs dos cidadãos devem ser um array' })
  @ArrayMaxSize(100, { message: 'Máximo de 100 cidadãos por filtro' })
  @IsUUID('4', { each: true, message: 'Cada ID de cidadão deve ser um UUID válido' })
  cidadaos_ids?: string[];

  @ApiPropertyOptional({
    description: 'Status dos agendamentos para filtrar',
    enum: StatusAgendamento,
    isArray: true,
    example: [StatusAgendamento.AGENDADO, StatusAgendamento.CONFIRMADO],
  })
  @IsOptional()
  @IsArray({ message: 'Status dos agendamentos devem ser um array' })
  @IsEnum(StatusAgendamento, {
    each: true,
    message: 'Cada status de agendamento deve ser um valor válido',
  })
  status_agendamentos?: StatusAgendamento[];

  @ApiPropertyOptional({
    description: 'Status das visitas para filtrar',
    enum: StatusVisita,
    isArray: true,
    example: [StatusVisita.CONCLUIDA, StatusVisita.EM_ANDAMENTO],
  })
  @IsOptional()
  @IsArray({ message: 'Status das visitas devem ser um array' })
  @IsEnum(StatusVisita, {
    each: true,
    message: 'Cada status de visita deve ser um valor válido',
  })
  status_visitas?: StatusVisita[];

  @ApiPropertyOptional({
    description: 'Tipos de avaliação para filtrar',
    enum: TipoAvaliacao,
    isArray: true,
    example: [TipoAvaliacao.CONDICOES_HABITACAO, TipoAvaliacao.SAUDE_FAMILIAR],
  })
  @IsOptional()
  @IsArray({ message: 'Tipos de avaliação devem ser um array' })
  @IsEnum(TipoAvaliacao, {
    each: true,
    message: 'Cada tipo de avaliação deve ser um valor válido',
  })
  tipos_avaliacao?: TipoAvaliacao[];

  @ApiPropertyOptional({
    description: 'Resultados de avaliação para filtrar',
    enum: ResultadoAvaliacao,
    isArray: true,
    example: [ResultadoAvaliacao.ADEQUADO, ResultadoAvaliacao.INADEQUADO],
  })
  @IsOptional()
  @IsArray({ message: 'Resultados de avaliação devem ser um array' })
  @IsEnum(ResultadoAvaliacao, {
    each: true,
    message: 'Cada resultado de avaliação deve ser um valor válido',
  })
  resultados_avaliacao?: ResultadoAvaliacao[];

  @ApiPropertyOptional({
    description: 'Filtrar apenas avaliações que requerem ação imediata',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Requer ação imediata deve ser um booleano' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  requer_acao_imediata?: boolean;

  @ApiPropertyOptional({
    description: 'Nota mínima das avaliações',
    example: 5.0,
    minimum: 0,
    maximum: 10,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Nota mínima deve ser um número' })
  @Min(0, { message: 'Nota mínima deve ser maior ou igual a 0' })
  @Max(10, { message: 'Nota mínima deve ser menor ou igual a 10' })
  nota_minima?: number;

  @ApiPropertyOptional({
    description: 'Nota máxima das avaliações',
    example: 8.0,
    minimum: 0,
    maximum: 10,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Nota máxima deve ser um número' })
  @Min(0, { message: 'Nota máxima deve ser maior ou igual a 0' })
  @Max(10, { message: 'Nota máxima deve ser menor ou igual a 10' })
  nota_maxima?: number;

  @ApiPropertyOptional({
    description: 'Agrupar resultados por período',
    example: 'mes',
    enum: ['dia', 'semana', 'mes', 'trimestre', 'ano'],
  })
  @IsOptional()
  @IsString({ message: 'Agrupamento deve ser uma string' })
  @IsIn(['dia', 'semana', 'mes', 'trimestre', 'ano'], {
    message: 'Agrupamento deve ser: dia, semana, mes, trimestre ou ano',
  })
  agrupamento?: 'dia' | 'semana' | 'mes' | 'trimestre' | 'ano';

  @ApiPropertyOptional({
    description: 'Incluir dados detalhados nas métricas',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Incluir detalhes deve ser um booleano' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  incluir_detalhes?: boolean;
}

/**
 * DTO para filtros de período específico
 */
export class FiltrosPeriodoDto {
  @ApiProperty({
    description: 'Data de início do período',
    example: '2024-01-01',
    type: String,
    format: 'date',
  })
  @IsDateString({}, { message: 'Data de início deve ser uma data válida' })
  data_inicio: string;

  @ApiProperty({
    description: 'Data de fim do período',
    example: '2024-01-31',
    type: String,
    format: 'date',
  })
  @IsDateString({}, { message: 'Data de fim deve ser uma data válida' })
  data_fim: string;

  @ApiPropertyOptional({
    description: 'Granularidade do agrupamento',
    example: 'dia',
    enum: ['hora', 'dia', 'semana', 'mes'],
    default: 'dia',
  })
  @IsOptional()
  @IsString({ message: 'Granularidade deve ser uma string' })
  @IsIn(['hora', 'dia', 'semana', 'mes'], {
    message: 'Granularidade deve ser: hora, dia, semana ou mes',
  })
  granularidade?: 'hora' | 'dia' | 'semana' | 'mes';

  @ApiPropertyOptional({
    description: 'IDs dos técnicos para filtrar',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'IDs dos técnicos devem ser um array' })
  @ArrayMaxSize(20, { message: 'Máximo de 20 técnicos por filtro' })
  @IsUUID('4', { each: true, message: 'Cada ID de técnico deve ser um UUID válido' })
  tecnicos_ids?: string[];
}

/**
 * DTO para filtros de ranking de técnicos
 */
export class FiltrosRankingDto {
  @ApiPropertyOptional({
    description: 'Data de início do período',
    example: '2024-01-01',
    type: String,
    format: 'date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data de início deve ser uma data válida' })
  data_inicio?: string;

  @ApiPropertyOptional({
    description: 'Data de fim do período',
    example: '2024-12-31',
    type: String,
    format: 'date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data de fim deve ser uma data válida' })
  data_fim?: string;

  @ApiPropertyOptional({
    description: 'Critério de ordenação do ranking',
    example: 'visitas_concluidas',
    enum: [
      'visitas_concluidas',
      'avaliacoes_realizadas',
      'nota_media',
      'tempo_medio_visita',
      'problemas_identificados',
    ],
    default: 'visitas_concluidas',
  })
  @IsOptional()
  @IsString({ message: 'Critério de ordenação deve ser uma string' })
  @IsIn([
    'visitas_concluidas',
    'avaliacoes_realizadas',
    'nota_media',
    'tempo_medio_visita',
    'problemas_identificados',
  ], {
    message: 'Critério deve ser um dos valores válidos',
  })
  criterio_ordenacao?: string;

  @ApiPropertyOptional({
    description: 'Limite de técnicos no ranking',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limite deve ser um número' })
  @Min(1, { message: 'Limite deve ser maior ou igual a 1' })
  @Max(100, { message: 'Limite deve ser menor ou igual a 100' })
  limite?: number;

  @ApiPropertyOptional({
    description: 'IDs específicos de técnicos para incluir',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'IDs dos técnicos devem ser um array' })
  @ArrayMaxSize(50, { message: 'Máximo de 50 técnicos por filtro' })
  @IsUUID('4', { each: true, message: 'Cada ID de técnico deve ser um UUID válido' })
  tecnicos_ids?: string[];
}

/**
 * DTO para filtros de análise de problemas
 */
export class FiltrosAnaliseProblemasDto {
  @ApiPropertyOptional({
    description: 'Data de início do período',
    example: '2024-01-01',
    type: String,
    format: 'date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data de início deve ser uma data válida' })
  data_inicio?: string;

  @ApiPropertyOptional({
    description: 'Data de fim do período',
    example: '2024-12-31',
    type: String,
    format: 'date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data de fim deve ser uma data válida' })
  data_fim?: string;

  @ApiPropertyOptional({
    description: 'Tipos de problema para analisar',
    example: ['INADEQUADO', 'CRITICO'],
    enum: ResultadoAvaliacao,
    isArray: true,
  })
  @IsOptional()
  @IsArray({ message: 'Tipos de problema devem ser um array' })
  @IsEnum(ResultadoAvaliacao, {
    each: true,
    message: 'Cada tipo de problema deve ser um valor válido',
  })
  tipos_problema?: ResultadoAvaliacao[];

  @ApiPropertyOptional({
    description: 'Categorias de avaliação para analisar',
    example: ['CONDICOES_HABITACAO', 'SAUDE_FAMILIAR'],
    enum: TipoAvaliacao,
    isArray: true,
  })
  @IsOptional()
  @IsArray({ message: 'Categorias devem ser um array' })
  @IsEnum(TipoAvaliacao, {
    each: true,
    message: 'Cada categoria deve ser um valor válido',
  })
  categorias?: TipoAvaliacao[];

  @ApiPropertyOptional({
    description: 'Incluir apenas problemas que requerem ação imediata',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Ação imediata deve ser um booleano' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  apenas_acao_imediata?: boolean;

  @ApiPropertyOptional({
    description: 'Agrupar problemas por critério',
    example: 'tipo_avaliacao',
    enum: ['tipo_avaliacao', 'resultado_avaliacao', 'tecnico', 'regiao'],
  })
  @IsOptional()
  @IsString({ message: 'Agrupamento deve ser uma string' })
  @IsIn(['tipo_avaliacao', 'resultado_avaliacao', 'tecnico', 'regiao'], {
    message: 'Agrupamento deve ser um dos valores válidos',
  })
  agrupar_por?: 'tipo_avaliacao' | 'resultado_avaliacao' | 'tecnico' | 'regiao';
}

/**
 * DTO para filtros de histórico de auditoria
 */
export class FiltrosHistoricoDto {
  @ApiPropertyOptional({
    description: 'Data de início do período',
    example: '2024-01-01',
    type: String,
    format: 'date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data de início deve ser uma data válida' })
  data_inicio?: string;

  @ApiPropertyOptional({
    description: 'Data de fim do período',
    example: '2024-12-31',
    type: String,
    format: 'date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data de fim deve ser uma data válida' })
  data_fim?: string;

  @ApiPropertyOptional({
    description: 'ID do usuário que executou a ação',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID do usuário deve ser um UUID válido' })
  usuario_id?: string;

  @ApiPropertyOptional({
    description: 'ID do cidadão relacionado à ação',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID do cidadão deve ser um UUID válido' })
  cidadao_id?: string;

  @ApiPropertyOptional({
    description: 'Categoria da ação',
    example: 'VISITA',
    enum: ['AGENDAMENTO', 'VISITA', 'AVALIACAO'],
  })
  @IsOptional()
  @IsString({ message: 'Categoria deve ser uma string' })
  @IsIn(['AGENDAMENTO', 'VISITA', 'AVALIACAO'], {
    message: 'Categoria deve ser: AGENDAMENTO, VISITA ou AVALIACAO',
  })
  categoria?: string;

  @ApiPropertyOptional({
    description: 'Filtrar apenas ações bem-sucedidas',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Sucesso deve ser um booleano' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  apenas_sucesso?: boolean;

  @ApiPropertyOptional({
    description: 'Página para paginação',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Página deve ser um número' })
  @Min(1, { message: 'Página deve ser maior ou igual a 1' })
  pagina?: number;

  @ApiPropertyOptional({
    description: 'Limite de itens por página',
    example: 50,
    minimum: 1,
    maximum: 200,
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limite deve ser um número' })
  @Min(1, { message: 'Limite deve ser maior ou igual a 1' })
  @Max(200, { message: 'Limite deve ser menor ou igual a 200' })
  limite?: number;
}

/**
 * DTO para exportação de relatórios
 */
export class ExportacaoRelatorioDto {
  @ApiProperty({
    description: 'Tipo de relatório para exportar',
    example: 'metricas_gerais',
    enum: [
      'metricas_gerais',
      'metricas_periodo',
      'ranking_tecnicos',
      'analise_problemas',
      'historico_auditoria',
      'avaliacoes_detalhadas',
    ],
  })
  @IsString({ message: 'Tipo de relatório deve ser uma string' })
  @IsIn([
    'metricas_gerais',
    'metricas_periodo',
    'ranking_tecnicos',
    'analise_problemas',
    'historico_auditoria',
    'avaliacoes_detalhadas',
  ], {
    message: 'Tipo de relatório deve ser um dos valores válidos',
  })
  tipo_relatorio: string;

  @ApiProperty({
    description: 'Formato de exportação',
    example: 'csv',
    enum: ['csv', 'xlsx', 'pdf'],
  })
  @IsString({ message: 'Formato deve ser uma string' })
  @IsIn(['csv', 'xlsx', 'pdf'], {
    message: 'Formato deve ser: csv, xlsx ou pdf',
  })
  formato: 'csv' | 'xlsx' | 'pdf';

  @ApiPropertyOptional({
    description: 'Filtros específicos para o relatório',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  filtros?: FiltrosRelatorioDto;

  @ApiPropertyOptional({
    description: 'Incluir gráficos na exportação (apenas para PDF)',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Incluir gráficos deve ser um booleano' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  incluir_graficos?: boolean;

  @ApiPropertyOptional({
    description: 'Nome personalizado para o arquivo',
    example: 'relatorio_monitoramento_janeiro_2024',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Nome do arquivo deve ser uma string' })
  @Length(1, 100, {
    message: 'Nome do arquivo deve ter entre 1 e 100 caracteres',
  })
  nome_arquivo?: string;
}