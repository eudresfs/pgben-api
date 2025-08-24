import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  IsEnum,
  IsArray,
  ValidateNested,
  IsBoolean,
  MaxLength,
  IsUUID,
  Validate,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { CreateComposicaoFamiliarBodyDto } from './create-composicao-familiar-body.dto';
import { ContatoBodyDto } from './contato-body.dto';
import { EnderecoBodyDto } from './endereco-body.dto';
import { CreateDadosSociaisDto } from './create-dados-sociais.dto';
import { CreateSituacaoMoradiaDto } from './create-situacao-moradia.dto';
import { CreateInfoBancariaBodyDto } from './create-info-bancaria-body.dto';
import { Sexo, EstadoCivil, TipoDocumentoEnum } from '../../../enums';
import { CPFValidator } from '../validators/cpf-validator';
import { NISValidator } from '../validators/nis-validator';
import { NacionalidadeValidator } from '../validators/nacionalidade-validator';

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

  @IsString({ message: 'Nacionalidade deve ser uma string' })
  @IsOptional()
  @MaxLength(50, { message: 'Nacionalidade deve ter no máximo 50 caracteres' })
  @Validate(NacionalidadeValidator, { message: 'Nacionalidade inválida' })
  @ApiPropertyOptional({
    example: 'Brasileira',
    description: 'Nacionalidade do cidadão',
    default: 'Brasileira',
    maxLength: 50,
  })
  nacionalidade?: string;

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
  @Type(() => CreateComposicaoFamiliarBodyDto)
  @ApiPropertyOptional({
    type: [CreateComposicaoFamiliarBodyDto],
    description: 'Composição familiar do cidadão',
  })
  composicao_familiar?: CreateComposicaoFamiliarBodyDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ContatoBodyDto)
  @ApiPropertyOptional({
    type: [ContatoBodyDto],
    description: 'Contatos do cidadão (nova estrutura normalizada)',
  })
  contatos?: ContatoBodyDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => EnderecoBodyDto)
  @ApiPropertyOptional({
    type: [EnderecoBodyDto],
    description: 'Endereços do cidadão (nova estrutura normalizada)',
  })
  enderecos?: EnderecoBodyDto[];

  @ApiPropertyOptional({
    description: 'Dados sociais do cidadão',
    type: CreateDadosSociaisDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateDadosSociaisDto)
  dados_sociais?: CreateDadosSociaisDto;

  @ApiPropertyOptional({
    description: 'Situação de moradia do cidadão',
    type: CreateSituacaoMoradiaDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateSituacaoMoradiaDto)
  situacao_moradia?: CreateSituacaoMoradiaDto;

  @ApiPropertyOptional({
    description: 'Informações bancárias do cidadão',
    type: CreateInfoBancariaBodyDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateInfoBancariaBodyDto)
  info_bancaria?: CreateInfoBancariaBodyDto;
}
