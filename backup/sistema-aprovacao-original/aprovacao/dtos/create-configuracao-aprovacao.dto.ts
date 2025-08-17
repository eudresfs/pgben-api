import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsObject,
  IsUUID,
  MinLength,
  MaxLength,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  EstrategiaAprovacao,
  PrioridadeAprovacao,
  StatusConfiguracaoAprovacao,
} from '../enums/aprovacao.enums';

/**
 * DTO para criação de uma nova configuração de aprovação
 * Define as regras de aprovação para uma ação crítica específica
 */
export class CreateConfiguracaoAprovacaoDto {
  @ApiProperty({
    description: 'ID da ação crítica associada',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID(4, { message: 'ID da ação crítica deve ser um UUID válido' })
  acao_critica_id: string;

  @ApiProperty({
    description: 'Nome da configuração',
    example: 'Aprovação Cancelamento - Usuário Comum',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @MinLength(3, { message: 'Nome deve ter pelo menos 3 caracteres' })
  @MaxLength(100, { message: 'Nome deve ter no máximo 100 caracteres' })
  nome: string;

  @ApiPropertyOptional({
    description: 'Descrição da configuração',
    example: 'Regras de aprovação para cancelamento por usuários comuns',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Descrição deve ter no máximo 500 caracteres' })
  descricao?: string;

  @ApiProperty({
    description: 'Estratégia de aprovação',
    enum: EstrategiaAprovacao,
    example: EstrategiaAprovacao.QUALQUER_UM,
  })
  @IsEnum(EstrategiaAprovacao, {
    message: 'Estratégia deve ser um valor válido do enum EstrategiaAprovacao',
  })
  estrategia: EstrategiaAprovacao;

  @ApiPropertyOptional({
    description: 'Status da configuração',
    enum: StatusConfiguracaoAprovacao,
    example: StatusConfiguracaoAprovacao.ATIVA,
    default: StatusConfiguracaoAprovacao.ATIVA,
  })
  @IsOptional()
  @IsEnum(StatusConfiguracaoAprovacao, {
    message:
      'Status deve ser um valor válido do enum StatusConfiguracaoAprovacao',
  })
  status?: StatusConfiguracaoAprovacao = StatusConfiguracaoAprovacao.ATIVA;

  @ApiPropertyOptional({
    description: 'Se a configuração está ativa',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  ativa?: boolean = true;

  @ApiPropertyOptional({
    description: 'Perfil do solicitante (para filtrar aplicabilidade)',
    example: 'USER',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Perfil deve ter no máximo 50 caracteres' })
  perfil_solicitante?: string;

  @ApiPropertyOptional({
    description: 'Unidade organizacional (para filtrar aplicabilidade)',
    example: 'DIRETORIA_TECNICA',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Unidade deve ter no máximo 100 caracteres' })
  unidade?: string;

  @ApiProperty({
    description: 'Prioridade da configuração (maior valor = maior prioridade)',
    enum: PrioridadeAprovacao,
    example: PrioridadeAprovacao.NORMAL,
  })
  @IsEnum(PrioridadeAprovacao, {
    message: 'Prioridade deve ser um valor válido do enum PrioridadeAprovacao',
  })
  prioridade: PrioridadeAprovacao;

  @ApiProperty({
    description: 'Número mínimo de aprovações necessárias',
    example: 1,
    minimum: 1,
    maximum: 10,
  })
  @IsNumber({}, { message: 'Mínimo de aprovações deve ser um número' })
  @Min(1, { message: 'Deve haver pelo menos 1 aprovação' })
  @Max(10, { message: 'Máximo de 10 aprovações' })
  min_aprovacoes: number;

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
    description: 'Se permite aprovação em paralelo',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  permite_aprovacao_paralela?: boolean = false;

  @ApiPropertyOptional({
    description: 'Se permite auto-aprovação pelo solicitante',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  permite_auto_aprovacao?: boolean = false;

  @ApiPropertyOptional({
    description: 'Se requer justificativa na aprovação',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  requer_justificativa_aprovacao?: boolean = false;

  @ApiPropertyOptional({
    description: 'Valor mínimo para aplicar esta configuração',
    example: 1000.0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Valor deve ser um número decimal' },
  )
  @Min(0, { message: 'Valor mínimo deve ser maior ou igual a 0' })
  valor_minimo?: number;

  @ApiPropertyOptional({
    description: 'Condições adicionais para aplicar a configuração',
    example: { departamento: 'TI', cargo_nivel: 'senior' },
  })
  @IsOptional()
  @IsObject()
  condicoes_adicionais?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Canais de notificação',
    example: ['email', 'sms', 'push'],
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  canais_notificacao?: string[];

  @ApiPropertyOptional({
    description: 'Horário de funcionamento para aprovações',
    example: {
      dias_semana: [1, 2, 3, 4, 5],
      hora_inicio: '08:00',
      hora_fim: '18:00',
      fuso_horario: 'America/Sao_Paulo',
    },
  })
  @IsOptional()
  @IsObject()
  horario_funcionamento?: {
    dias_semana: number[];
    hora_inicio: string;
    hora_fim: string;
    fuso_horario: string;
  };
}
