import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsEnum } from 'class-validator';

/**
 * DTO para atualização de unidade
 */
export class UpdateUnidadeDto {
  @IsString({ message: 'Nome deve ser uma string' })
  @IsOptional()
  @ApiProperty({
    example: 'CRAS Cidade Alta',
    description: 'Nome da unidade',
    required: false,
  })
  nome?: string;

  @IsString({ message: 'Código deve ser uma string' })
  @IsOptional()
  @ApiProperty({
    example: 'CRAS001',
    description: 'Código único da unidade',
    required: false,
  })
  codigo?: string;

  @IsString({ message: 'Sigla deve ser uma string' })
  @IsOptional()
  @ApiProperty({
    example: 'CRAS-CA',
    description: 'Sigla da unidade',
    required: false,
  })
  sigla?: string;

  @IsEnum(['cras', 'creas', 'centro_pop', 'semtas', 'outro'], {
    message: 'Tipo deve ser cras, creas, centro_pop, semtas ou outro',
  })
  @IsOptional()
  @ApiProperty({
    enum: ['cras', 'creas', 'centro_pop', 'semtas', 'outro'],
    example: 'cras',
    description: 'Tipo da unidade',
    required: false,
  })
  tipo?: string;

  @IsString({ message: 'Tipo de unidade deve ser uma string' })
  @IsOptional()
  @ApiProperty({
    example: 'urbana',
    description: 'Tipo específico da unidade',
    required: false,
  })
  tipo_unidade?: string;

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
