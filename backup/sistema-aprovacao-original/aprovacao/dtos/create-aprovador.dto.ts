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
import { TipoAprovador } from '../enums/aprovacao.enums';

/**
 * DTO para criação de um novo aprovador
 * Define quem pode aprovar uma determinada configuração de aprovação
 */
export class CreateAprovadorDto {
  @ApiProperty({
    description: 'ID da configuração de aprovação associada',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID(4, { message: 'ID da configuração deve ser um UUID válido' })
  configuracao_aprovacao_id: string;

  @ApiProperty({
    description: 'Tipo do aprovador',
    enum: TipoAprovador,
    example: TipoAprovador.USUARIO,
  })
  @IsEnum(TipoAprovador, {
    message: 'Tipo deve ser um valor válido do enum TipoAprovador',
  })
  tipo: TipoAprovador;

  @ApiPropertyOptional({
    description: 'ID do usuário aprovador (quando tipo = USUARIO)',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID(4, { message: 'ID do usuário deve ser um UUID válido' })
  usuario_id?: string;

  @ApiPropertyOptional({
    description: 'ID do perfil aprovador (quando tipo = PERFIL)',
    example: 'SUPERVISOR',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'ID do perfil deve ter no máximo 50 caracteres' })
  perfil_id?: string;

  @ApiPropertyOptional({
    description: 'ID da unidade aprovadora (quando tipo = UNIDADE)',
    example: 'DIRETORIA_TECNICA',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, {
    message: 'ID da unidade deve ter no máximo 100 caracteres',
  })
  unidade_id?: string;

  @ApiPropertyOptional({
    description: 'ID da hierarquia aprovadora (quando tipo = HIERARQUIA)',
    example: 'GERENCIA_NIVEL_2',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, {
    message: 'ID da hierarquia deve ter no máximo 100 caracteres',
  })
  hierarquia_id?: string;

  @ApiPropertyOptional({
    description: 'Se o aprovador está ativo',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean = true;

  @ApiPropertyOptional({
    description: 'Ordem de aprovação (para estratégia sequencial)',
    example: 1,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Ordem deve ser um número' })
  @Min(1, { message: 'Ordem deve ser pelo menos 1' })
  @Max(100, { message: 'Ordem deve ser no máximo 100' })
  ordem?: number;

  @ApiPropertyOptional({
    description: 'Peso da aprovação (para estratégia ponderada)',
    example: 1.0,
    minimum: 0.1,
    maximum: 10.0,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Peso deve ser um número decimal' },
  )
  @Min(0.1, { message: 'Peso deve ser pelo menos 0.1' })
  @Max(10.0, { message: 'Peso deve ser no máximo 10.0' })
  peso?: number;

  @ApiPropertyOptional({
    description: 'Limite máximo de valor que pode aprovar',
    example: 10000.0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Limite deve ser um número decimal' },
  )
  @Min(0, { message: 'Limite deve ser maior ou igual a 0' })
  limite_valor?: number;

  @ApiPropertyOptional({
    description: 'Horário de funcionamento do aprovador',
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

  @ApiPropertyOptional({
    description: 'Canais de notificação preferidos',
    example: ['email', 'sms'],
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  canais_notificacao?: string[];

  @ApiPropertyOptional({
    description: 'Configurações específicas do aprovador',
    example: {
      auto_aprovacao_valores_baixos: true,
      requer_justificativa_detalhada: false,
    },
  })
  @IsOptional()
  @IsObject()
  configuracoes?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Metadados adicionais',
    example: {
      departamento: 'TI',
      cargo: 'Supervisor',
      nivel_acesso: 'senior',
    },
  })
  @IsOptional()
  @IsObject()
  metadados?: Record<string, any>;
}
