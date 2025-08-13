import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsObject,
  IsIP,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Enums
import { StatusAprovacao, TipoAcaoHistorico } from '../enums/aprovacao.enums';

/**
 * DTO para criação de entrada no histórico de aprovação
 */
export class CreateHistoricoAprovacaoDto {
  @ApiProperty({
    description: 'ID da solicitação de aprovação',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID(4, { message: 'ID da solicitação deve ser um UUID válido' })
  solicitacao_aprovacao_id: string;

  @ApiProperty({
    description: 'Tipo da ação realizada',
    enum: TipoAcaoHistorico,
    example: TipoAcaoHistorico.APROVACAO,
  })
  @IsEnum(TipoAcaoHistorico, {
    message: 'Tipo de ação deve ser um valor válido',
  })
  tipo_acao: TipoAcaoHistorico;

  @ApiPropertyOptional({
    description: 'Status anterior da solicitação',
    enum: StatusAprovacao,
    example: StatusAprovacao.PENDENTE,
  })
  @IsOptional()
  @IsEnum(StatusAprovacao, {
    message: 'Status anterior deve ser um valor válido',
  })
  status_anterior?: StatusAprovacao;

  @ApiProperty({
    description: 'Novo status da solicitação',
    enum: StatusAprovacao,
    example: StatusAprovacao.APROVADO,
  })
  @IsEnum(StatusAprovacao, {
    message: 'Status novo deve ser um valor válido',
  })
  status_novo: StatusAprovacao;

  @ApiProperty({
    description: 'ID do usuário que realizou a ação',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID(4, { message: 'ID do usuário deve ser um UUID válido' })
  usuario_id: string;

  @ApiProperty({
    description: 'Nome do usuário que realizou a ação',
    example: 'João Silva',
    maxLength: 100,
  })
  @IsString({ message: 'Nome do usuário deve ser uma string' })
  @MaxLength(100, { message: 'Nome do usuário deve ter no máximo 100 caracteres' })
  usuario_nome: string;

  @ApiProperty({
    description: 'Email do usuário que realizou a ação',
    example: 'joao.silva@empresa.com',
    maxLength: 255,
  })
  @IsString({ message: 'Email do usuário deve ser uma string' })
  @MaxLength(255, { message: 'Email do usuário deve ter no máximo 255 caracteres' })
  usuario_email: string;

  @ApiPropertyOptional({
    description: 'ID do aprovador (se aplicável)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID(4, { message: 'ID do aprovador deve ser um UUID válido' })
  aprovador_id?: string;

  @ApiPropertyOptional({
    description: 'Comentário sobre a ação',
    example: 'Aprovado conforme política da empresa',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: 'Comentário deve ser uma string' })
  @MaxLength(1000, { message: 'Comentário deve ter no máximo 1000 caracteres' })
  comentario?: string;

  @ApiPropertyOptional({
    description: 'Justificativa para a ação',
    example: 'Usuário não possui mais acesso necessário ao sistema',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString({ message: 'Justificativa deve ser uma string' })
  @MaxLength(2000, { message: 'Justificativa deve ter no máximo 2000 caracteres' })
  justificativa?: string;

  @ApiPropertyOptional({
    description: 'Metadados adicionais da ação (JSON)',
    example: {
      origem: 'web',
      dispositivo: 'desktop',
      navegador: 'Chrome 91.0',
      tempo_decisao_segundos: 120,
    },
  })
  @IsOptional()
  @IsObject({ message: 'Metadados devem ser um objeto' })
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Endereço IP do usuário',
    example: '192.168.1.100',
  })
  @IsOptional()
  @IsIP(undefined, { message: 'IP deve ser um endereço IP válido' })
  ip_address?: string;

  @ApiPropertyOptional({
    description: 'User Agent do navegador',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'User Agent deve ser uma string' })
  @MaxLength(500, { message: 'User Agent deve ter no máximo 500 caracteres' })
  user_agent?: string;

  @ApiPropertyOptional({
    description: 'Localização geográfica (JSON)',
    example: {
      pais: 'Brasil',
      estado: 'São Paulo',
      cidade: 'São Paulo',
      latitude: -23.5505,
      longitude: -46.6333,
    },
  })
  @IsOptional()
  @IsObject({ message: 'Localização deve ser um objeto' })
  localizacao?: Record<string, any>;
}