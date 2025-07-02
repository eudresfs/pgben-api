import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  ValidateNested,
  Validate,
  ValidateIf,
  IsArray,
  IsUUID,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Sexo } from '../../../enums/sexo.enum';
import { CPFValidator } from '../validators/cpf-validator';
import { NISValidator } from '../validators/nis-validator';

import { CreateComposicaoFamiliarDto } from './create-composicao-familiar.dto';
import { EstadoCivil } from '../../../enums/estado-civil.enum';
import { ContatoDto } from './contato.dto';
import { EnderecoDto } from './endereco.dto';

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
    description: 'Nome completo do cidadão',
  })
  nome: string;

  @IsString({ message: 'CPF deve ser uma string' })
  @IsNotEmpty({ message: 'CPF é obrigatório' })
  @Validate(CPFValidator, { message: 'CPF inválido' })
  @ApiProperty({
    example: '123.456.789-00',
    description: 'CPF do cidadão',
  })
  cpf: string;

  @IsString({ message: 'RG deve ser uma string' })
  @IsOptional()
  @ApiProperty({
    example: '1234567',
    description: 'RG do cidadão',
  })
  rg?: string;

  @IsString({ message: 'Prontuário SUAS deve ser uma string' })
  @IsOptional()
  @ApiPropertyOptional({
    example: 'SUAS1234567',
    description: 'Nº do Prontuário SUAS do cidadão',
    required: false,
  })
  prontuario_suas?: string;

  @IsString({ message: 'Naturalidade deve ser uma string' })
  @IsOptional()
  @ApiProperty({
    example: 'Natal',
    description: 'Cidade de Naturalidade',
  })
  naturalidade?: string;

  @IsOptional()
  @ApiProperty({
    example: '1985-10-15',
    description: 'Data de nascimento do cidadão',
  })
  data_nascimento?: string;

  @IsEnum(Sexo, { message: 'Sexo inválido' })
  @IsOptional()
  @ApiProperty({
    enum: Sexo,
    example: Sexo.FEMININO,
    description: 'Sexo do cidadão',
  })
  sexo?: Sexo;

  @IsString({ message: 'NIS deve ser uma string' })
  @IsOptional()
  @Validate(NISValidator, { message: 'NIS inválido' })
  @ApiPropertyOptional({
    example: '12345678901',
    description:
      'Número de Identificação Social (NIS) do cidadão, utilizado para programas sociais. Obrigatório para beneficiários.',
    required: false,
  })
  nis?: string;

  @IsString({ message: 'Nome social deve ser uma string' })
  @IsOptional()
  @ApiPropertyOptional({
    example: 'Maria Santos',
    description: 'Nome social do cidadão (usado para pessoas trans)',
    required: false,
  })
  nome_social?: string;

  @IsEnum(EstadoCivil, { message: 'Estado civil inválido' })
  @IsOptional()
  @ApiProperty({
    enum: EstadoCivil,
    example: EstadoCivil.CASADO,
    description: 'Estado civil do cidadão',
  })
  estado_civil?: EstadoCivil;

  @IsString({ message: 'Nome da mãe deve ser uma string' })
  @IsOptional()
  @ApiProperty({
    example: 'Maria da Silva',
    description: 'Nome completo da mãe do cidadão',
  })
  nome_mae?: string;

  @IsUUID('4', { message: 'ID da unidade deve ser um UUID válido' })
  @IsOptional()
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description:
      'ID da unidade onde o cidadão será cadastrado. Se não fornecido, será usado o ID da unidade do usuário logado.',
    required: false,
  })
  unidade_id?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateComposicaoFamiliarDto)
  @ApiPropertyOptional({
    type: [CreateComposicaoFamiliarDto],
    description: 'Composição familiar do cidadão',
  })
  composicao_familiar?: CreateComposicaoFamiliarDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ContatoDto)
  @ApiPropertyOptional({
    type: [ContatoDto],
    description: 'Contatos do cidadão (nova estrutura normalizada)',
  })
  contatos?: ContatoDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => EnderecoDto)
  @ApiPropertyOptional({
    type: [EnderecoDto],
    description: 'Endereços do cidadão (nova estrutura normalizada)',
  })
  enderecos?: EnderecoDto[];
}
