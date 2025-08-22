import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  ValidateNested,
  Validate,
  IsUUID,
  IsArray,
  ValidateIf,
  IsDate,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Sexo } from '../../../enums/sexo.enum';
import { EstadoCivil } from '../../../enums/estado-civil.enum';
import { CPFValidator } from '../validators/cpf-validator';
import { NISValidator } from '../validators/nis-validator';
import { NacionalidadeValidator } from '../validators/nacionalidade-validator';
import { CreateComposicaoFamiliarDto } from './create-composicao-familiar.dto';
import { ContatoDto } from './contato.dto';
import { EnderecoDto } from './endereco.dto';

/**
 * DTO para atualização de cidadão
 * Aceita os mesmos dados da criação, todos opcionais
 */
export class UpdateCidadaoDto {
  @IsString({ message: 'Nome deve ser uma string' })
  @IsOptional()
  @ApiPropertyOptional({
    example: 'Maria da Silva',
    description: 'Nome completo do cidadão',
  })
  nome?: string;

  @IsString({ message: 'CPF deve ser uma string' })
  @IsOptional()
  @Validate(CPFValidator, { message: 'CPF inválido' })
  @ApiPropertyOptional({
    example: '123.456.789-00',
    description: 'CPF do cidadão',
  })
  cpf?: string;

  @IsString({ message: 'RG deve ser uma string' })
  @IsOptional()
  @ApiPropertyOptional({
    example: '1234567',
    description: 'RG do cidadão',
  })
  rg?: string;

  @IsString({ message: 'Prontuário SUAS deve ser uma string' })
  @IsOptional()
  @ApiPropertyOptional({
    example: 'SUAS1234567',
    description: 'Nº do Prontuário SUAS do cidadão',
  })
  prontuario_suas?: string;

  @IsString({ message: 'Naturalidade deve ser uma string' })
  @IsOptional()
  @ApiPropertyOptional({
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
    maxLength: 50,
  })
  nacionalidade?: string;

  @IsOptional()
  @ApiPropertyOptional({
    example: '1985-10-15',
    description: 'Data de nascimento do cidadão',
  })
  data_nascimento?: string;

  @IsEnum(Sexo, { message: 'Sexo inválido' })
  @IsOptional()
  @ApiPropertyOptional({
    enum: Sexo,
    example: Sexo.FEMININO,
    description: 'Sexo do cidadão',
  })
  sexo?: Sexo;

  @IsString({ message: 'NIS deve ser uma string' })
  @ValidateIf((o) => o.nis !== undefined)
  @IsOptional()
  @Validate(NISValidator, { message: 'NIS inválido' })
  @ApiPropertyOptional({
    example: '12345678901',
    description:
      'Número de Identificação Social (NIS) do cidadão, utilizado para programas sociais',
  })
  nis?: string;

  @IsString({ message: 'Nome social deve ser uma string' })
  @IsOptional()
  @ApiPropertyOptional({
    example: 'Maria Santos',
    description: 'Nome social do cidadão (usado para pessoas trans)',
  })
  nome_social?: string;

  @IsEnum(EstadoCivil, { message: 'Estado civil inválido' })
  @IsOptional()
  @ApiPropertyOptional({
    enum: EstadoCivil,
    example: EstadoCivil.CASADO,
    description: 'Estado civil do cidadão',
  })
  estado_civil?: EstadoCivil;

  @IsString({ message: 'Nome da mãe deve ser uma string' })
  @IsOptional()
  @ApiPropertyOptional({
    example: 'Maria da Silva',
    description: 'Nome completo da mãe do cidadão',
  })
  nome_mae?: string;

  @IsUUID('4', { message: 'ID da unidade deve ser um UUID válido' })
  @IsOptional()
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID da unidade onde o cidadão está cadastrado',
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
