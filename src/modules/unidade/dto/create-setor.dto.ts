import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

/**
 * DTO para criação de setor
 */
export class CreateSetorDto {
  @IsString({ message: 'Nome deve ser uma string' })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @MinLength(3, { message: 'Nome deve ter no mínimo 3 caracteres' })
  @MaxLength(100, { message: 'Nome deve ter no máximo 100 caracteres' })
  @ApiProperty({
    example: 'Setor de Atendimento',
    description: 'Nome do setor',
  })
  nome: string;

  @IsString({ message: 'Descrição deve ser uma string' })
  @IsOptional()
  @MaxLength(500, { message: 'Descrição deve ter no máximo 500 caracteres' })
  @ApiProperty({
    example: 'Responsável pelo atendimento inicial aos cidadãos',
    description: 'Descrição das atividades do setor',
    required: false,
  })
  descricao?: string;

  @IsString({ message: 'Sigla deve ser uma string' })
  @IsOptional()
  @MinLength(2, { message: 'Sigla deve ter no mínimo 2 caracteres' })
  @MaxLength(10, { message: 'Sigla deve ter no máximo 10 caracteres' })
  @Matches(/^[A-Z0-9-]{2,10}$/, {
    message: 'Sigla deve conter apenas letras maiúsculas, números ou hífen',
  })
  @ApiProperty({
    example: 'SA',
    description: 'Sigla do setor',
    required: false,
  })
  sigla?: string;

  @IsUUID(undefined, { message: 'ID da unidade inválido' })
  @IsNotEmpty({ message: 'ID da unidade é obrigatório' })
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID da unidade à qual o setor pertence',
  })
  unidadeId: string;

  @IsBoolean({ message: 'Status deve ser um booleano' })
  @IsOptional()
  @ApiProperty({
    example: true,
    description: 'Status do setor (ativo/inativo)',
    required: false,
    default: true,
  })
  status?: boolean;
}
