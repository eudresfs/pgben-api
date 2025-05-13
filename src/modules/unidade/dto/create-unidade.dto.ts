import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';

/**
 * DTO para criação de unidade
 */
export class CreateUnidadeDto {
  @IsString({ message: 'Nome deve ser uma string' })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @ApiProperty({ 
    example: 'CRAS Cidade Alta',
    description: 'Nome da unidade'
  })
  nome: string;

  @IsString({ message: 'Código deve ser uma string' })
  @IsNotEmpty({ message: 'Código é obrigatório' })
  @ApiProperty({ 
    example: 'CRAS001',
    description: 'Código único da unidade'
  })
  codigo: string;

  @IsString({ message: 'Sigla deve ser uma string' })
  @IsOptional()
  @ApiProperty({ 
    example: 'CRAS-CA',
    description: 'Sigla da unidade',
    required: false
  })
  sigla?: string;

  @IsEnum(['cras', 'creas', 'centro_pop', 'semtas', 'outro'], { 
    message: 'Tipo deve ser cras, creas, centro_pop, semtas ou outro' 
  })
  @ApiProperty({ 
    enum: ['cras', 'creas', 'centro_pop', 'semtas', 'outro'],
    example: 'cras',
    description: 'Tipo da unidade'
  })
  tipo: string;

  @IsString({ message: 'Endereço deve ser uma string' })
  @IsOptional()
  @ApiProperty({ 
    example: 'Rua das Flores, 123, Cidade Alta',
    description: 'Endereço completo da unidade',
    required: false
  })
  endereco?: string;

  @IsString({ message: 'Telefone deve ser uma string' })
  @IsOptional()
  @ApiProperty({ 
    example: '(84) 3232-1234',
    description: 'Telefone da unidade',
    required: false
  })
  telefone?: string;

  @IsEmail({}, { message: 'Email inválido' })
  @IsOptional()
  @ApiProperty({ 
    example: 'cras.cidadealta@semtas.natal.gov.br',
    description: 'Email da unidade',
    required: false
  })
  email?: string;

  @IsString({ message: 'Responsável deve ser uma string' })
  @IsOptional()
  @ApiProperty({ 
    example: 'Maria da Silva',
    description: 'Nome do responsável pela unidade',
    required: false
  })
  responsavel?: string;
}