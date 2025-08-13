import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsObject,
  MinLength,
  MaxLength,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoAcaoCritica, PrioridadeAprovacao } from '../enums/aprovacao.enums';

/**
 * DTO para criação de uma nova ação crítica
 * Define os dados necessários para configurar uma ação que requer aprovação
 */
export class CreateAcaoCriticaDto {
  @ApiProperty({
    description: 'Código único da ação crítica',
    example: 'CANCEL_SOLICITACAO',
    minLength: 3,
    maxLength: 50,
  })
  @IsString()
  @MinLength(3, { message: 'Código deve ter pelo menos 3 caracteres' })
  @MaxLength(50, { message: 'Código deve ter no máximo 50 caracteres' })
  codigo: string;

  @ApiProperty({
    description: 'Tipo da ação crítica',
    enum: TipoAcaoCritica,
    example: TipoAcaoCritica.CANCELAMENTO_SOLICITACAO,
  })
  @IsEnum(TipoAcaoCritica, {
    message: 'Tipo deve ser um valor válido do enum TipoAcaoCritica',
  })
  tipo: TipoAcaoCritica;

  @ApiProperty({
    description: 'Nome descritivo da ação crítica',
    example: 'Cancelamento de Solicitação',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @MinLength(3, { message: 'Nome deve ter pelo menos 3 caracteres' })
  @MaxLength(100, { message: 'Nome deve ter no máximo 100 caracteres' })
  nome: string;

  @ApiPropertyOptional({
    description: 'Descrição detalhada da ação crítica',
    example: 'Permite cancelar uma solicitação em andamento',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Descrição deve ter no máximo 500 caracteres' })
  descricao?: string;

  @ApiProperty({
    description: 'Módulo onde a ação está localizada',
    example: 'solicitacao',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2, { message: 'Módulo deve ter pelo menos 2 caracteres' })
  @MaxLength(50, { message: 'Módulo deve ter no máximo 50 caracteres' })
  modulo: string;

  @ApiProperty({
    description: 'Controlador responsável pela ação',
    example: 'SolicitacaoController',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @MinLength(3, { message: 'Controlador deve ter pelo menos 3 caracteres' })
  @MaxLength(100, { message: 'Controlador deve ter no máximo 100 caracteres' })
  controlador: string;

  @ApiProperty({
    description: 'Método do controlador que executa a ação',
    example: 'cancelar',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2, { message: 'Método deve ter pelo menos 2 caracteres' })
  @MaxLength(50, { message: 'Método deve ter no máximo 50 caracteres' })
  metodo: string;

  @ApiPropertyOptional({
    description: 'Se a ação está ativa',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  ativa?: boolean = true;

  @ApiPropertyOptional({
    description: 'Se requer justificativa para solicitar aprovação',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  requer_justificativa?: boolean = false;

  @ApiPropertyOptional({
    description: 'Se permite anexos na solicitação',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  permite_anexos?: boolean = false;

  @ApiProperty({
    description: 'Nível de criticidade da ação',
    enum: PrioridadeAprovacao,
    example: PrioridadeAprovacao.ALTA,
  })
  @IsEnum(PrioridadeAprovacao, {
    message: 'Nível de criticidade deve ser um valor válido',
  })
  nivel_criticidade: PrioridadeAprovacao;

  @ApiPropertyOptional({
    description: 'Tempo limite em horas para aprovação',
    example: 24,
    minimum: 1,
    maximum: 720, // 30 dias
  })
  @IsOptional()
  @IsNumber({}, { message: 'Tempo limite deve ser um número' })
  @Min(1, { message: 'Tempo limite deve ser pelo menos 1 hora' })
  @Max(720, { message: 'Tempo limite deve ser no máximo 720 horas (30 dias)' })
  tempo_limite_horas?: number;

  @ApiPropertyOptional({
    description: 'Se permite escalação automática',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  permite_escalacao?: boolean = false;

  @ApiPropertyOptional({
    description: 'Se permite delegação de aprovação',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  permite_delegacao?: boolean = false;

  @ApiPropertyOptional({
    description: 'Configurações adicionais específicas da ação',
    example: { max_valor: 10000, requer_supervisor: true },
  })
  @IsOptional()
  @IsObject()
  configuracao_adicional?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Template de notificação personalizado',
    example: 'template-cancelamento-solicitacao',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Template deve ter no máximo 100 caracteres' })
  template_notificacao?: string;

  @ApiPropertyOptional({
    description: 'Campos obrigatórios na solicitação',
    example: ['justificativa', 'motivo'],
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  campos_obrigatorios?: string[];

  @ApiPropertyOptional({
    description: 'Regras de validação customizadas',
    example: { valor_minimo: 100, unidade_obrigatoria: true },
  })
  @IsOptional()
  @IsObject()
  regras_validacao?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Ordem de exibição',
    example: 1,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Ordem deve ser um número' })
  @Min(0, { message: 'Ordem deve ser maior ou igual a 0' })
  ordem?: number;

  @ApiPropertyOptional({
    description: 'Tags para categorização',
    example: ['financeiro', 'urgente'],
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
