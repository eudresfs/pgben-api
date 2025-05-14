import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsEnum, IsNotEmpty, IsDate, IsNumber, ValidateNested, Validate } from 'class-validator';
import { Type } from 'class-transformer';
import { Sexo } from '../entities/cidadao.entity';
import { CPFValidator } from '../validators/cpf-validator';
import { NISValidator } from '../validators/nis-validator';

/**
 * DTO para endereço do cidadão
 * 
 * Contém todos os campos necessários para registrar o endereço completo de um cidadão
 */
export class EnderecoDto {
  @IsString({ message: 'Logradouro deve ser uma string' })
  @IsNotEmpty({ message: 'Logradouro é obrigatório' })
  @ApiProperty({ 
    example: 'Rua das Flores',
    description: 'Logradouro do endereço'
  })
  logradouro: string;

  @IsString({ message: 'Número deve ser uma string' })
  @IsNotEmpty({ message: 'Número é obrigatório' })
  @ApiProperty({ 
    example: '123',
    description: 'Número do endereço'
  })
  numero: string;

  @IsString({ message: 'Complemento deve ser uma string' })
  @IsOptional()
  @ApiPropertyOptional({ 
    example: 'Apto 101',
    description: 'Complemento do endereço',
    required: false
  })
  complemento?: string;

  @IsString({ message: 'Bairro deve ser uma string' })
  @IsNotEmpty({ message: 'Bairro é obrigatório' })
  @ApiProperty({ 
    example: 'Centro',
    description: 'Bairro do endereço'
  })
  bairro: string;

  @IsString({ message: 'Cidade deve ser uma string' })
  @IsNotEmpty({ message: 'Cidade é obrigatória' })
  @ApiProperty({ 
    example: 'Natal',
    description: 'Cidade do endereço'
  })
  cidade: string;

  @IsString({ message: 'Estado deve ser uma string' })
  @IsNotEmpty({ message: 'Estado é obrigatório' })
  @ApiProperty({ 
    example: 'RN',
    description: 'Estado do endereço (sigla)'
  })
  estado: string;

  @IsString({ message: 'CEP deve ser uma string' })
  @IsNotEmpty({ message: 'CEP é obrigatório' })
  @ApiProperty({ 
    example: '59000-000',
    description: 'CEP do endereço'
  })
  cep: string;
}

/**
 * DTO para criação de cidadão
 * 
 * Contém todos os campos necessários para cadastrar um novo cidadão no sistema,
 * incluindo informações pessoais, documentos, endereço e dados socioeconômicos.
 */
export class CreateCidadaoDto {
  @IsString({ message: 'Nome deve ser uma string' })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @ApiProperty({ 
    example: 'Maria da Silva',
    description: 'Nome completo do cidadão'
  })
  nome: string;

  @IsString({ message: 'CPF deve ser uma string' })
  @IsNotEmpty({ message: 'CPF é obrigatório' })
  @Validate(CPFValidator, { message: 'CPF inválido' })
  @ApiProperty({ 
    example: '123.456.789-00',
    description: 'CPF do cidadão'
  })
  cpf: string;

  @IsString({ message: 'RG deve ser uma string' })
  @IsNotEmpty({ message: 'RG é obrigatório' })
  @ApiProperty({ 
    example: '1234567',
    description: 'RG do cidadão'
  })
  rg: string;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty({ message: 'Data de nascimento é obrigatória' })
  @ApiProperty({ 
    example: '1985-10-15',
    description: 'Data de nascimento do cidadão'
  })
  data_nascimento: Date;

  @IsEnum(Sexo, { message: 'Sexo inválido' })
  @IsNotEmpty({ message: 'Sexo é obrigatório' })
  @ApiProperty({ 
    enum: Sexo,
    example: Sexo.FEMININO,
    description: 'Sexo do cidadão'
  })
  sexo: Sexo;

  @IsString({ message: 'NIS deve ser uma string' })
  @IsOptional()
  @Validate(NISValidator, { message: 'NIS inválido' })
  @ApiPropertyOptional({ 
    example: '12345678901',
    description: 'Número de Identificação Social (NIS) do cidadão, utilizado para programas sociais',
    required: false
  })
  nis?: string;

  @IsString({ message: 'Nome social deve ser uma string' })
  @IsOptional()
  @ApiPropertyOptional({ 
    example: 'Maria Santos',
    description: 'Nome social do cidadão (usado para pessoas trans e travestis)',
    required: false
  })
  nome_social?: string;

  @IsString({ message: 'Telefone deve ser uma string' })
  @IsOptional()
  @ApiPropertyOptional({ 
    example: '(84) 98765-4321',
    description: 'Telefone do cidadão para contato',
    required: false
  })
  telefone?: string;

  @IsEmail({}, { message: 'Email inválido' })
  @IsOptional()
  @ApiPropertyOptional({ 
    example: 'email@exemplo.com',
    description: 'Endereço de email do cidadão para contato',
    required: false
  })
  email?: string;

  @ValidateNested()
  @Type(() => EnderecoDto)
  @IsNotEmpty({ message: 'Endereço é obrigatório' })
  @ApiProperty({ 
    type: EnderecoDto,
    description: 'Endereço do cidadão'
  })
  endereco: EnderecoDto;

  @IsNumber({}, { message: 'Renda deve ser um número' })
  @IsOptional()
  @ApiPropertyOptional({ 
    example: 1200.50,
    description: 'Renda mensal do cidadão em reais (R$)',
    required: false
  })
  renda?: number;
}