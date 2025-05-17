import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsUUID, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoMetrica, CategoriaMetrica, GranularidadeTemporal } from '../entities/metrica-definicao.entity';

/**
 * DTO para criar uma nova definição de métrica
 */
export class CriarMetricaDefinicaoDto {
  @ApiProperty({
    description: 'Código único da métrica (snake_case)',
    example: 'tempo_medio_processamento_beneficio',
  })
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @ApiProperty({
    description: 'Nome de exibição da métrica',
    example: 'Tempo Médio de Processamento de Benefício',
  })
  @IsString()
  @IsNotEmpty()
  nome: string;

  @ApiProperty({
    description: 'Descrição detalhada da métrica',
    example: 'Calcula o tempo médio de processamento de solicitações de benefício, desde a submissão até a aprovação ou rejeição.',
  })
  @IsString()
  @IsNotEmpty()
  descricao: string;

  @ApiProperty({
    description: 'Tipo da métrica',
    enum: TipoMetrica,
    example: TipoMetrica.MEDIA,
  })
  @IsEnum(TipoMetrica)
  tipo: TipoMetrica;

  @ApiProperty({
    description: 'Categoria da métrica para organização',
    enum: CategoriaMetrica,
    example: CategoriaMetrica.PROCESSAMENTO,
  })
  @IsEnum(CategoriaMetrica)
  categoria: CategoriaMetrica;

  @ApiPropertyOptional({
    description: 'Unidade de medida da métrica',
    example: 'dias',
  })
  @IsString()
  @IsOptional()
  unidade?: string;

  @ApiPropertyOptional({
    description: 'Prefixo a ser exibido antes do valor',
    example: 'R$',
  })
  @IsString()
  @IsOptional()
  prefixo?: string;

  @ApiPropertyOptional({
    description: 'Sufixo a ser exibido após o valor',
    example: '%',
  })
  @IsString()
  @IsOptional()
  sufixo?: string;

  @ApiPropertyOptional({
    description: 'Número de casas decimais a serem exibidas',
    example: 2,
    default: 2,
  })
  @IsNumber()
  @IsOptional()
  casas_decimais?: number;

  @ApiPropertyOptional({
    description: 'Consulta SQL para coletar dados (para métricas baseadas em banco de dados)',
    example: 'SELECT AVG(EXTRACT(EPOCH FROM (data_conclusao - data_solicitacao))/86400) FROM solicitacao WHERE status = \'concluido\' AND data_conclusao BETWEEN ${PERIODO_INICIO} AND ${PERIODO_FIM}',
  })
  @IsString()
  @IsOptional()
  sql_consulta?: string;

  @ApiPropertyOptional({
    description: 'Fórmula para cálculo (para métricas compostas)',
    example: 'beneficios_aprovados / total_solicitacoes * 100',
  })
  @IsString()
  @IsOptional()
  formula_calculo?: string;

  @ApiPropertyOptional({
    description: 'Fonte de dados da métrica',
    example: 'banco_dados',
    default: 'banco_dados',
  })
  @IsString()
  @IsOptional()
  fonte_dados?: string;

  @ApiPropertyOptional({
    description: 'Especificação de como agregar os dados em diferentes períodos',
    example: 'media',
    default: 'soma',
  })
  @IsString()
  @IsOptional()
  agregacao_temporal?: string;

  @ApiPropertyOptional({
    description: 'Granularidade mínima de coleta/armazenamento',
    enum: GranularidadeTemporal,
    example: GranularidadeTemporal.DIA,
    default: GranularidadeTemporal.DIA,
  })
  @IsEnum(GranularidadeTemporal)
  @IsOptional()
  granularidade?: GranularidadeTemporal;

  @ApiPropertyOptional({
    description: 'Referência a outras métricas utilizadas no cálculo (caso seja composta)',
    example: ['beneficios_aprovados', 'total_solicitacoes'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  metricas_dependentes?: string[];

  @ApiPropertyOptional({
    description: 'Parâmetros específicos para o tipo de métrica',
    example: { percentil: 95 },
  })
  @IsOptional()
  parametros_especificos?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Tags para filtrar e categorizar métricas',
    example: ['financeiro', 'beneficio', 'prioritario'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

/**
 * DTO para atualizar uma definição de métrica existente
 */
export class AtualizarMetricaDefinicaoDto {
  @ApiPropertyOptional({
    description: 'Nome de exibição da métrica',
    example: 'Tempo Médio de Processamento de Benefício',
  })
  @IsString()
  @IsOptional()
  nome?: string;

  @ApiPropertyOptional({
    description: 'Descrição detalhada da métrica',
    example: 'Calcula o tempo médio de processamento de solicitações de benefício, desde a submissão até a aprovação ou rejeição.',
  })
  @IsString()
  @IsOptional()
  descricao?: string;

  @ApiPropertyOptional({
    description: 'Tipo da métrica',
    enum: TipoMetrica,
    example: TipoMetrica.MEDIA,
  })
  @IsEnum(TipoMetrica)
  @IsOptional()
  tipo?: TipoMetrica;

  @ApiPropertyOptional({
    description: 'Categoria da métrica para organização',
    enum: CategoriaMetrica,
    example: CategoriaMetrica.PROCESSAMENTO,
  })
  @IsEnum(CategoriaMetrica)
  @IsOptional()
  categoria?: CategoriaMetrica;

  @ApiPropertyOptional({
    description: 'Unidade de medida da métrica',
    example: 'dias',
  })
  @IsString()
  @IsOptional()
  unidade?: string;

  @ApiPropertyOptional({
    description: 'Prefixo a ser exibido antes do valor',
    example: 'R$',
  })
  @IsString()
  @IsOptional()
  prefixo?: string;

  @ApiPropertyOptional({
    description: 'Sufixo a ser exibido após o valor',
    example: '%',
  })
  @IsString()
  @IsOptional()
  sufixo?: string;

  @ApiPropertyOptional({
    description: 'Número de casas decimais a serem exibidas',
    example: 2,
  })
  @IsNumber()
  @IsOptional()
  casas_decimais?: number;

  @ApiPropertyOptional({
    description: 'Consulta SQL para coletar dados (para métricas baseadas em banco de dados)',
    example: 'SELECT AVG(EXTRACT(EPOCH FROM (data_conclusao - data_solicitacao))/86400) FROM solicitacao WHERE status = \'concluido\' AND data_conclusao BETWEEN ${PERIODO_INICIO} AND ${PERIODO_FIM}',
  })
  @IsString()
  @IsOptional()
  sql_consulta?: string;

  @ApiPropertyOptional({
    description: 'Fórmula para cálculo (para métricas compostas)',
    example: 'beneficios_aprovados / total_solicitacoes * 100',
  })
  @IsString()
  @IsOptional()
  formula_calculo?: string;

  @ApiPropertyOptional({
    description: 'Fonte de dados da métrica',
    example: 'banco_dados',
  })
  @IsString()
  @IsOptional()
  fonte_dados?: string;

  @ApiPropertyOptional({
    description: 'Especificação de como agregar os dados em diferentes períodos',
    example: 'media',
  })
  @IsString()
  @IsOptional()
  agregacao_temporal?: string;

  @ApiPropertyOptional({
    description: 'Granularidade mínima de coleta/armazenamento',
    enum: GranularidadeTemporal,
    example: GranularidadeTemporal.DIA,
  })
  @IsEnum(GranularidadeTemporal)
  @IsOptional()
  granularidade?: GranularidadeTemporal;

  @ApiPropertyOptional({
    description: 'Referência a outras métricas utilizadas no cálculo (caso seja composta)',
    example: ['beneficios_aprovados', 'total_solicitacoes'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  metricas_dependentes?: string[];

  @ApiPropertyOptional({
    description: 'Flag que indica se a métrica está ativa para coleta',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  ativa?: boolean;

  @ApiPropertyOptional({
    description: 'Parâmetros específicos para o tipo de métrica',
    example: { percentil: 95 },
  })
  @IsOptional()
  parametros_especificos?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Tags para filtrar e categorizar métricas',
    example: ['financeiro', 'beneficio', 'prioritario'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Flag que indica se a métrica é calculada em tempo real ou pré-calculada',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  calculo_tempo_real?: boolean;
}

/**
 * DTO para filtrar métricas na consulta
 */
export class FiltroMetricasDto {
  @ApiPropertyOptional({
    description: 'Código da métrica para busca parcial',
    example: 'tempo',
  })
  @IsString()
  @IsOptional()
  codigo?: string;

  @ApiPropertyOptional({
    description: 'Nome da métrica para busca parcial',
    example: 'Processamento',
  })
  @IsString()
  @IsOptional()
  nome?: string;

  @ApiPropertyOptional({
    description: 'Categoria da métrica',
    enum: CategoriaMetrica,
    example: CategoriaMetrica.PROCESSAMENTO,
  })
  @IsEnum(CategoriaMetrica)
  @IsOptional()
  categoria?: CategoriaMetrica;

  @ApiPropertyOptional({
    description: 'Tipo da métrica',
    enum: TipoMetrica,
    example: TipoMetrica.MEDIA,
  })
  @IsEnum(TipoMetrica)
  @IsOptional()
  tipo?: TipoMetrica;

  @ApiPropertyOptional({
    description: 'Status de ativação da métrica',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  ativa?: boolean;

  @ApiPropertyOptional({
    description: 'Tag para filtrar métricas',
    example: 'financeiro',
  })
  @IsString()
  @IsOptional()
  tag?: string;

  @ApiPropertyOptional({
    description: 'Página para paginação de resultados',
    example: 1,
    default: 1,
  })
  @IsNumber()
  @IsOptional()
  pagina?: number;

  @ApiPropertyOptional({
    description: 'Quantidade de itens por página',
    example: 10,
    default: 10,
  })
  @IsNumber()
  @IsOptional()
  limite?: number;
}
