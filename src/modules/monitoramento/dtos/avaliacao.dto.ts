import {
  IsUUID,
  IsEnum,
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  IsObject,
  IsDateString,
  Min,
  Max,
  Length,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
  PickType,
} from '@nestjs/swagger';
import {
  TipoAvaliacao,
  ResultadoAvaliacao,
} from '../enums';

/**
 * DTO para criação de avaliação de visita
 */
export class CriarAvaliacaoDto {
  @ApiProperty({
    description: 'ID da visita domiciliar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'ID da visita deve ser um UUID válido' })
  visita_id: string;

  @ApiProperty({
    description: 'Tipo de avaliação realizada',
    enum: TipoAvaliacao,
    example: TipoAvaliacao.CONDICOES_HABITACAO,
  })
  @IsEnum(TipoAvaliacao, {
    message: 'Tipo de avaliação deve ser um valor válido',
  })
  tipo_avaliacao: TipoAvaliacao;

  @ApiProperty({
    description: 'Critério específico avaliado',
    example: 'Condições de ventilação e iluminação',
    maxLength: 500,
  })
  @IsString({ message: 'Critério avaliado deve ser uma string' })
  @Length(1, 500, {
    message: 'Critério avaliado deve ter entre 1 e 500 caracteres',
  })
  criterio_avaliado: string;

  @ApiProperty({
    description: 'Resultado da avaliação',
    enum: ResultadoAvaliacao,
    example: ResultadoAvaliacao.ADEQUADO,
  })
  @IsEnum(ResultadoAvaliacao, {
    message: 'Resultado da avaliação deve ser um valor válido',
  })
  resultado_avaliacao: ResultadoAvaliacao;

  @ApiPropertyOptional({
    description: 'Nota numérica da avaliação (0-10)',
    example: 8.5,
    minimum: 0,
    maximum: 10,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Nota deve ser um número com até 2 casas decimais' },
  )
  @Min(0, { message: 'Nota deve ser maior ou igual a 0' })
  @Max(10, { message: 'Nota deve ser menor ou igual a 10' })
  nota_avaliacao?: number;

  @ApiPropertyOptional({
    description: 'Observações detalhadas sobre a avaliação',
    example: 'Casa bem ventilada, mas precisa de melhorias na iluminação',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString({ message: 'Observações devem ser uma string' })
  @Length(0, 2000, {
    message: 'Observações devem ter no máximo 2000 caracteres',
  })
  observacoes?: string;

  @ApiPropertyOptional({
    description: 'URLs ou caminhos de evidências (fotos, documentos)',
    example: ['foto1.jpg', 'documento.pdf'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Evidências devem ser um array' })
  @ArrayMaxSize(10, { message: 'Máximo de 10 evidências permitidas' })
  @IsString({ each: true, message: 'Cada evidência deve ser uma string' })
  evidencias?: string[];

  @ApiPropertyOptional({
    description: 'Indica se requer ação imediata',
    example: false,
    default: false,
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
    description: 'Descrição da ação necessária',
    example: 'Instalar janelas adicionais para melhorar ventilação',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: 'Ação necessária deve ser uma string' })
  @Length(0, 1000, {
    message: 'Ação necessária deve ter no máximo 1000 caracteres',
  })
  acao_necessaria?: string;

  @ApiPropertyOptional({
    description: 'Prazo para execução da ação (em dias)',
    example: 30,
    minimum: 1,
    maximum: 365,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Prazo da ação deve ser um número' })
  @Min(1, { message: 'Prazo deve ser de pelo menos 1 dia' })
  @Max(365, { message: 'Prazo deve ser de no máximo 365 dias' })
  prazo_acao?: number;

  @ApiPropertyOptional({
    description: 'Peso da avaliação para cálculos (1-10)',
    example: 5,
    minimum: 1,
    maximum: 10,
    default: 5,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Peso da avaliação deve ser um número' })
  @Min(1, { message: 'Peso deve ser de pelo menos 1' })
  @Max(10, { message: 'Peso deve ser de no máximo 10' })
  peso_avaliacao?: number;

  @ApiPropertyOptional({
    description: 'Dados complementares em formato JSON',
    example: { temperatura: 25, umidade: 60 },
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject({ message: 'Dados complementares devem ser um objeto' })
  dados_complementares?: Record<string, any>;
}

/**
 * DTO para atualização de avaliação
 */
export class AtualizarAvaliacaoDto extends PartialType(
  PickType(CriarAvaliacaoDto, [
    'criterio_avaliado',
    'resultado_avaliacao',
    'nota_avaliacao',
    'observacoes',
    'evidencias',
    'requer_acao_imediata',
    'acao_necessaria',
    'prazo_acao',
    'peso_avaliacao',
    'dados_complementares',
  ] as const),
) {}

/**
 * DTO para resposta de avaliação
 */
export class AvaliacaoResponseDto {
  @ApiProperty({
    description: 'ID único da avaliação',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'ID da visita domiciliar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  visita_id: string;

  @ApiProperty({
    description: 'Tipo de avaliação realizada',
    enum: TipoAvaliacao,
    example: TipoAvaliacao.CONDICOES_HABITACAO,
  })
  tipo_avaliacao: TipoAvaliacao;

  @ApiProperty({
    description: 'Critério específico avaliado',
    example: 'Condições de ventilação e iluminação',
  })
  criterio_avaliado: string;

  @ApiProperty({
    description: 'Resultado da avaliação',
    enum: ResultadoAvaliacao,
    example: ResultadoAvaliacao.ADEQUADO,
  })
  resultado_avaliacao: ResultadoAvaliacao;

  @ApiPropertyOptional({
    description: 'Nota numérica da avaliação (0-10)',
    example: 8.5,
  })
  nota_avaliacao?: number;

  @ApiPropertyOptional({
    description: 'Observações detalhadas sobre a avaliação',
    example: 'Casa bem ventilada, mas precisa de melhorias na iluminação',
  })
  observacoes?: string;

  @ApiPropertyOptional({
    description: 'URLs ou caminhos de evidências',
    example: ['foto1.jpg', 'documento.pdf'],
    type: [String],
  })
  evidencias?: string[];

  @ApiPropertyOptional({
    description: 'Indica se requer ação imediata',
    example: false,
  })
  requer_acao_imediata?: boolean;

  @ApiPropertyOptional({
    description: 'Descrição da ação necessária',
    example: 'Instalar janelas adicionais para melhorar ventilação',
  })
  acao_necessaria?: string;

  @ApiPropertyOptional({
    description: 'Prazo para execução da ação (em dias)',
    example: 30,
  })
  prazo_acao?: number;

  @ApiPropertyOptional({
    description: 'Peso da avaliação para cálculos',
    example: 5,
  })
  peso_avaliacao?: number;

  @ApiPropertyOptional({
    description: 'Dados complementares em formato JSON',
    example: { temperatura: 25, umidade: 60 },
  })
  dados_complementares?: Record<string, any>;

  @ApiProperty({
    description: 'Data de criação da avaliação',
    example: '2024-01-15T10:30:00Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Data da última atualização',
    example: '2024-01-15T14:20:00Z',
  })
  updated_at: Date;

  @ApiPropertyOptional({
    description: 'ID do usuário que criou a avaliação',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  created_by?: string;

  @ApiPropertyOptional({
    description: 'ID do usuário que atualizou a avaliação',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  updated_by?: string;

  @ApiPropertyOptional({
    description: 'Nota ponderada calculada',
    example: 42.5,
  })
  nota_ponderada?: number;

  @ApiPropertyOptional({
    description: 'Indica se a avaliação está adequada',
    example: true,
  })
  is_adequada?: boolean;

  @ApiPropertyOptional({
    description: 'Indica se possui evidências',
    example: true,
  })
  tem_evidencias?: boolean;

  @ApiPropertyOptional({
    description: 'Resumo da avaliação',
    example: 'Adequado - Condições de ventilação e iluminação',
  })
  resumo?: string;
}

/**
 * DTO para filtros de busca de avaliações
 */
export class FiltrosAvaliacaoDto {
  @ApiPropertyOptional({
    description: 'ID da visita domiciliar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID da visita deve ser um UUID válido' })
  visita_id?: string;

  @ApiPropertyOptional({
    description: 'Tipo de avaliação',
    enum: TipoAvaliacao,
    example: TipoAvaliacao.CONDICOES_HABITACAO,
  })
  @IsOptional()
  @IsEnum(TipoAvaliacao, {
    message: 'Tipo de avaliação deve ser um valor válido',
  })
  tipo_avaliacao?: TipoAvaliacao;

  @ApiPropertyOptional({
    description: 'Resultado da avaliação',
    enum: ResultadoAvaliacao,
    example: ResultadoAvaliacao.ADEQUADO,
  })
  @IsOptional()
  @IsEnum(ResultadoAvaliacao, {
    message: 'Resultado da avaliação deve ser um valor válido',
  })
  resultado_avaliacao?: ResultadoAvaliacao;

  @ApiPropertyOptional({
    description: 'Filtrar por avaliações que requerem ação imediata',
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
    description: 'Nota mínima da avaliação',
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
    description: 'Nota máxima da avaliação',
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
    description: 'Data de início do período de criação',
    example: '2024-01-01',
    type: String,
    format: 'date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data de início deve ser uma data válida' })
  data_inicio?: string;

  @ApiPropertyOptional({
    description: 'Data de fim do período de criação',
    example: '2024-12-31',
    type: String,
    format: 'date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data de fim deve ser uma data válida' })
  data_fim?: string;

  @ApiPropertyOptional({
    description: 'ID do usuário que criou a avaliação',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID do usuário deve ser um UUID válido' })
  created_by?: string;

  @ApiPropertyOptional({
    description: 'Buscar apenas avaliações com evidências',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Com evidências deve ser um booleano' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  com_evidencias?: boolean;

  @ApiPropertyOptional({
    description: 'Ordenação dos resultados',
    example: 'created_at:desc',
    enum: [
      'created_at:asc',
      'created_at:desc',
      'nota_avaliacao:asc',
      'nota_avaliacao:desc',
      'tipo_avaliacao:asc',
      'tipo_avaliacao:desc',
    ],
  })
  @IsOptional()
  @IsString({ message: 'Ordenação deve ser uma string' })
  ordenacao?: string;

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
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limite deve ser um número' })
  @Min(1, { message: 'Limite deve ser maior ou igual a 1' })
  @Max(100, { message: 'Limite deve ser menor ou igual a 100' })
  limite?: number;
}

/**
 * DTO para criação em lote de avaliações
 */
export class CriarAvaliacaoLoteDto {
  @ApiProperty({
    description: 'Lista de avaliações para criar',
    type: [CriarAvaliacaoDto],
  })
  @IsArray({ message: 'Avaliações devem ser um array' })
  @ArrayMinSize(1, { message: 'Deve haver pelo menos uma avaliação' })
  @ArrayMaxSize(20, { message: 'Máximo de 20 avaliações por lote' })
  @ValidateNested({ each: true })
  @Type(() => CriarAvaliacaoDto)
  avaliacoes: CriarAvaliacaoDto[];
}

/**
 * DTO para resposta de criação em lote
 */
export class AvaliacaoLoteResponseDto {
  @ApiProperty({
    description: 'Avaliações criadas com sucesso',
    type: [AvaliacaoResponseDto],
  })
  sucesso: AvaliacaoResponseDto[];

  @ApiProperty({
    description: 'Avaliações que falharam na criação',
    type: 'array',
    items: {
      type: 'object',
      additionalProperties: true,
      properties: {
        indice: { type: 'number', example: 0 },
        erro: { type: 'string', example: 'Visita não encontrada' },
        dados: { type: 'object', additionalProperties: true },
      },
    },
  })
  falhas: Array<{
    indice: number;
    erro: string;
    dados: CriarAvaliacaoDto;
  }>;

  @ApiProperty({
    description: 'Resumo do processamento',
    type: 'object',
    additionalProperties: true,
    properties: {
      total: { type: 'number', example: 10 },
      sucesso: { type: 'number', example: 8 },
      falhas: { type: 'number', example: 2 },
    },
  })
  resumo: {
    total: number;
    sucesso: number;
    falhas: number;
  };
}