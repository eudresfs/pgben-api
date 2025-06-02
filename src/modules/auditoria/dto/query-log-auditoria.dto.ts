import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { TipoOperacao } from '../../../enums/tipo-operacao.enum';
import { Type } from 'class-transformer';

/**
 * DTO para consulta de logs de auditoria
 */
export class QueryLogAuditoriaDto {
  @ApiProperty({
    description: 'Tipo de operação realizada',
    enum: TipoOperacao,
    required: false,
    example: TipoOperacao.READ,
  })
  @IsOptional()
  @IsEnum(TipoOperacao, { message: 'Tipo de operação inválido' })
  tipo_operacao?: TipoOperacao;

  @ApiProperty({
    description: 'Nome da entidade afetada pela operação',
    required: false,
    example: 'Cidadao',
  })
  @IsOptional()
  @IsString({ message: 'A entidade afetada deve ser uma string' })
  entidade_afetada?: string;

  @ApiProperty({
    description: 'ID da entidade afetada',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'O ID da entidade deve ser um UUID válido' })
  entidade_id?: string;

  @ApiProperty({
    description: 'ID do usuário que realizou a operação',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'O ID do usuário deve ser um UUID válido' })
  usuario_id?: string;

  @ApiProperty({
    description: 'IP do usuário que realizou a operação',
    required: false,
    example: '192.168.1.1',
  })
  @IsOptional()
  @IsString({ message: 'O IP do usuário deve ser uma string' })
  ip_usuario?: string;

  @ApiProperty({
    description: 'Endpoint acessado',
    required: false,
    example: '/api/v1/cidadaos',
  })
  @IsOptional()
  @IsString({ message: 'O endpoint deve ser uma string' })
  endpoint?: string;

  @ApiProperty({
    description: 'Método HTTP utilizado',
    required: false,
    example: 'GET',
  })
  @IsOptional()
  @IsString({ message: 'O método HTTP deve ser uma string' })
  metodo_http?: string;

  @ApiProperty({
    description: 'Data inicial para filtro (formato ISO)',
    required: false,
    example: '2025-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'A data inicial deve estar no formato ISO' })
  data_inicial?: string;

  @ApiProperty({
    description: 'Data final para filtro (formato ISO)',
    required: false,
    example: '2025-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'A data final deve estar no formato ISO' })
  data_final?: string;

  @ApiProperty({
    description: 'Termo de busca para pesquisa nos dados',
    required: false,
    example: 'cpf',
  })
  @IsOptional()
  @IsString({ message: 'O termo de busca deve ser uma string' })
  termo_busca?: string;

  @ApiProperty({
    description: 'Número da página para paginação',
    required: false,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  pagina?: number = 1;

  @ApiProperty({
    description: 'Quantidade de itens por página',
    required: false,
    default: 10,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  itens_por_pagina?: number = 10;
}
