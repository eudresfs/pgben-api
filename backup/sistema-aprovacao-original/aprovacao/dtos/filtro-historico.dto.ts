import {
  IsOptional,
  IsString,
  IsEnum,
  IsUUID,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// Enums
import { StatusAprovacao, TipoAcaoHistorico, TipoAcaoCritica } from '../enums/aprovacao.enums';

/**
 * DTO para filtros de busca no histórico de aprovação
 */
export class FiltroHistoricoDto {
  @ApiPropertyOptional({
    description: 'ID do usuário que realizou a ação',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID(4, { message: 'ID do usuário deve ser um UUID válido' })
  usuario_id?: string;

  @ApiPropertyOptional({
    description: 'Tipo da ação realizada',
    enum: TipoAcaoHistorico,
    example: TipoAcaoHistorico.APROVACAO,
  })
  @IsOptional()
  @IsEnum(TipoAcaoHistorico, {
    message: 'Tipo de ação deve ser um valor válido',
  })
  tipo_acao?: TipoAcaoHistorico;

  @ApiPropertyOptional({
    description: 'Status resultante da ação',
    enum: StatusAprovacao,
    example: StatusAprovacao.APROVADO,
  })
  @IsOptional()
  @IsEnum(StatusAprovacao, {
    message: 'Status deve ser um valor válido',
  })
  status_novo?: StatusAprovacao;

  @ApiPropertyOptional({
    description: 'Data de início do período de busca',
    example: '2024-01-01T00:00:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data de início deve ser uma data válida' })
  @Type(() => Date)
  data_inicio?: Date;

  @ApiPropertyOptional({
    description: 'Data de fim do período de busca',
    example: '2024-12-31T23:59:59.999Z',
    type: 'string',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data de fim deve ser uma data válida' })
  @Type(() => Date)
  data_fim?: Date;

  @ApiPropertyOptional({
    description: 'Código da ação crítica',
    enum: TipoAcaoCritica,
    example: TipoAcaoCritica.EXCLUSAO_USUARIO,
  })
  @IsOptional()
  @IsEnum(TipoAcaoCritica, {
    message: 'Código da ação crítica deve ser um valor válido',
  })
  acao_critica_codigo?: TipoAcaoCritica;

  @ApiPropertyOptional({
    description: 'Unidade solicitante',
    example: 'DIRETORIA_TECNICA',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Unidade solicitante deve ser uma string' })
  @MaxLength(100, { message: 'Unidade solicitante deve ter no máximo 100 caracteres' })
  unidade_solicitante?: string;

  @ApiPropertyOptional({
    description: 'Nome do usuário que realizou a ação (busca parcial)',
    example: 'João',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Nome do usuário deve ser uma string' })
  @MaxLength(100, { message: 'Nome do usuário deve ter no máximo 100 caracteres' })
  usuario_nome?: string;

  @ApiPropertyOptional({
    description: 'Email do usuário que realizou a ação (busca parcial)',
    example: 'joao@empresa.com',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'Email do usuário deve ser uma string' })
  @MaxLength(255, { message: 'Email do usuário deve ter no máximo 255 caracteres' })
  usuario_email?: string;

  @ApiPropertyOptional({
    description: 'ID do aprovador',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID(4, { message: 'ID do aprovador deve ser um UUID válido' })
  aprovador_id?: string;

  @ApiPropertyOptional({
    description: 'Busca por texto no comentário',
    example: 'aprovado',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Texto do comentário deve ser uma string' })
  @MaxLength(500, { message: 'Texto do comentário deve ter no máximo 500 caracteres' })
  comentario_texto?: string;

  @ApiPropertyOptional({
    description: 'Busca por texto na justificativa',
    example: 'política',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Texto da justificativa deve ser uma string' })
  @MaxLength(500, { message: 'Texto da justificativa deve ter no máximo 500 caracteres' })
  justificativa_texto?: string;

  @ApiPropertyOptional({
    description: 'Endereço IP do usuário',
    example: '192.168.1.100',
    maxLength: 45, // IPv6
  })
  @IsOptional()
  @IsString({ message: 'IP deve ser uma string' })
  @MaxLength(45, { message: 'IP deve ter no máximo 45 caracteres' })
  ip_address?: string;
}