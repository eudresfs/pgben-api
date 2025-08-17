import {
  IsString,
  IsUUID,
  IsOptional,
  IsObject,
  IsArray,
  IsBoolean,
  IsEnum,
  IsDateString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoAcaoCritica } from '../enums/aprovacao.enums';

/**
 * DTO para condições da delegação
 */
export class CondicaoDelegacaoDto {
  @ApiProperty({
    description: 'Tipo da condição',
    enum: ['valor_maximo', 'tipo_acao', 'unidade', 'prazo', 'categoria'],
    example: 'valor_maximo',
  })
  @IsEnum(['valor_maximo', 'tipo_acao', 'unidade', 'prazo', 'categoria'])
  tipo: 'valor_maximo' | 'tipo_acao' | 'unidade' | 'prazo' | 'categoria';

  @ApiProperty({
    description: 'Operador da condição',
    enum: ['igual', 'menor_que', 'maior_que', 'menor_igual', 'maior_igual', 'diferente', 'contem', 'nao_contem'],
    example: 'menor_igual',
  })
  @IsEnum(['igual', 'menor_que', 'maior_que', 'menor_igual', 'maior_igual', 'diferente', 'contem', 'nao_contem'])
  operador: 'igual' | 'menor_que' | 'maior_que' | 'menor_igual' | 'maior_igual' | 'diferente' | 'contem' | 'nao_contem';

  @ApiProperty({
    description: 'Valor da condição',
    example: 10000,
  })
  valor: any;

  @ApiPropertyOptional({
    description: 'Descrição da condição',
    example: 'Delegação válida apenas para valores até R$ 10.000,00',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  descricao?: string;
}

/**
 * DTO para delegar aprovação para outro aprovador
 */
export class DelegarAprovacaoDto {
  @ApiProperty({
    description: 'ID do aprovador que receberá a delegação',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  aprovador_delegado_id: string;

  @ApiProperty({
    description: 'Motivo da delegação',
    example: 'Ausência por férias do período de 01/01 a 15/01',
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  @MinLength(10, { message: 'Motivo deve ter pelo menos 10 caracteres' })
  @MaxLength(500, { message: 'Motivo não pode exceder 500 caracteres' })
  motivo: string;

  @ApiProperty({
    description: 'Data de início da delegação (ISO 8601)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsDateString()
  data_inicio: string;

  @ApiProperty({
    description: 'Data de fim da delegação (ISO 8601)',
    example: '2024-01-15T23:59:59.000Z',
  })
  @IsDateString()
  data_fim: string;

  @ApiPropertyOptional({
    description: 'Escopo da delegação',
    enum: ['total', 'parcial', 'especifica'],
    example: 'parcial',
  })
  @IsOptional()
  @IsEnum(['total', 'parcial', 'especifica'])
  escopo?: 'total' | 'parcial' | 'especifica';

  @ApiPropertyOptional({
    description: 'Tipos de ação que podem ser delegadas',
    type: [String],
    enum: TipoAcaoCritica,
    example: [TipoAcaoCritica.CANCELAR_SOLICITACAO],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(TipoAcaoCritica, { each: true })
  tipos_acao_permitidos?: TipoAcaoCritica[];

  @ApiPropertyOptional({
    description: 'Valor máximo que pode ser aprovado na delegação',
    example: 50000,
  })
  @IsOptional()
  valor_maximo?: number;

  @ApiPropertyOptional({
    description: 'Condições específicas da delegação',
    type: [CondicaoDelegacaoDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CondicaoDelegacaoDto)
  condicoes?: CondicaoDelegacaoDto[];

  @ApiPropertyOptional({
    description: 'IDs das unidades onde a delegação é válida',
    example: ['unidade-001', 'unidade-002'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  unidades_permitidas?: string[];

  @ApiPropertyOptional({
    description: 'Indica se o aprovador original pode revogar a delegação',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  pode_revogar?: boolean;

  @ApiPropertyOptional({
    description: 'Indica se o delegado pode sub-delegar',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  permite_subdelegacao?: boolean;

  @ApiPropertyOptional({
    description: 'Indica se notificações devem ser enviadas ao aprovador original',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  notificar_original?: boolean;

  @ApiPropertyOptional({
    description: 'Frequência das notificações',
    enum: ['imediata', 'diaria', 'semanal', 'nunca'],
    example: 'diaria',
  })
  @IsOptional()
  @IsEnum(['imediata', 'diaria', 'semanal', 'nunca'])
  frequencia_notificacao?: 'imediata' | 'diaria' | 'semanal' | 'nunca';

  @ApiPropertyOptional({
    description: 'Prioridade mínima das solicitações que podem ser delegadas',
    enum: ['baixa', 'normal', 'alta', 'urgente'],
    example: 'normal',
  })
  @IsOptional()
  @IsEnum(['baixa', 'normal', 'alta', 'urgente'])
  prioridade_minima?: 'baixa' | 'normal' | 'alta' | 'urgente';

  @ApiPropertyOptional({
    description: 'Prioridade máxima das solicitações que podem ser delegadas',
    enum: ['baixa', 'normal', 'alta', 'urgente'],
    example: 'alta',
  })
  @IsOptional()
  @IsEnum(['baixa', 'normal', 'alta', 'urgente'])
  prioridade_maxima?: 'baixa' | 'normal' | 'alta' | 'urgente';

  @ApiPropertyOptional({
    description: 'Instruções específicas para o aprovador delegado',
    example: 'Consultar sempre a equipe técnica antes de aprovar solicitações de alta complexidade',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  instrucoes?: string;

  @ApiPropertyOptional({
    description: 'Tags para categorização da delegação',
    example: ['ferias', 'temporaria', 'emergencial'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Indica se a delegação é ativa imediatamente',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  ativa_imediatamente?: boolean;

  @ApiPropertyOptional({
    description: 'Observações adicionais sobre a delegação',
    example: 'Delegação criada devido a ausência programada para treinamento',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacoes?: string;

  @ApiPropertyOptional({
    description: 'Metadados adicionais da delegação',
    example: {
      origem: 'sistema_rh',
      tipo_ausencia: 'ferias',
      aprovacao_gestor: 'aprovado',
    },
  })
  @IsOptional()
  @IsObject()
  metadados?: Record<string, any>;
}