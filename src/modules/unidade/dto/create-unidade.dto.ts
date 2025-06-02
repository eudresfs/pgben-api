import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { TipoUnidade } from '../../../entities/unidade.entity';

/**
 * DTO para criação de unidade
 */
export class CreateUnidadeDto {
  @IsString({ message: 'Nome deve ser uma string' })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @MinLength(3, { message: 'Nome deve ter no mínimo 3 caracteres' })
  @MaxLength(100, { message: 'Nome deve ter no máximo 100 caracteres' })
  @ApiProperty({
    example: 'CRAS Cidade Alta',
    description: 'Nome da unidade',
  })
  nome: string;

  @IsString({ message: 'Código deve ser uma string' })
  @IsNotEmpty({ message: 'Código é obrigatório' })
  @Matches(/^[A-Z0-9]{3,10}$/, {
    message:
      'Código deve conter entre 3 e 10 caracteres alfanuméricos maiúsculos',
  })
  @ApiProperty({
    example: 'CRAS001',
    description: 'Código único da unidade',
  })
  codigo: string;

  @IsString({ message: 'Sigla deve ser uma string' })
  @IsOptional()
  @Matches(/^[A-Z0-9-]{2,10}$/, {
    message:
      'Sigla deve conter entre 2 e 10 caracteres alfanuméricos maiúsculos ou hífen',
  })
  @ApiProperty({
    example: 'CRAS-CA',
    description: 'Sigla da unidade',
    required: false,
  })
  sigla?: string;

  @IsEnum(TipoUnidade, {
    message: 'Tipo deve ser cras, creas, centro_pop, semtas ou outro',
  })
  @ApiProperty({
    enum: TipoUnidade,
    example: TipoUnidade.CRAS,
    description: 'Tipo da unidade',
  })
  tipo: TipoUnidade;

  @IsString({ message: 'Endereço deve ser uma string' })
  @IsOptional()
  @ApiProperty({
    example: 'Rua das Flores, 123, Cidade Alta',
    description: 'Endereço completo da unidade',
    required: false,
  })
  endereco?: string;

  @IsString({ message: 'Telefone deve ser uma string' })
  @IsOptional()
  @Matches(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, {
    message:
      'Formato de telefone inválido. Use (XX) XXXX-XXXX ou (XX) XXXXX-XXXX',
  })
  @ApiProperty({
    example: '(84) 3232-1234',
    description: 'Telefone da unidade',
    required: false,
  })
  telefone?: string;

  @IsEmail({}, { message: 'Email inválido' })
  @IsOptional()
  @ApiProperty({
    example: 'cras.cidadealta@semtas.natal.gov.br',
    description: 'Email da unidade',
    required: false,
  })
  email?: string;

  @IsString({ message: 'Responsável deve ser uma string' })
  @IsOptional()
  @ApiProperty({
    example: 'Maria da Silva',
    description: 'Nome do responsável pela unidade',
    required: false,
  })
  responsavel?: string;
}
