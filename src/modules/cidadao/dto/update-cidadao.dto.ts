import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  IsDate,
  IsNumber,
  ValidateNested,
  Validate,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Sexo } from '../enums/sexo.enum';
import { CPFValidator } from '../validators/cpf-validator';
import { NISValidator } from '../validators/nis-validator';
import { EnderecoDto } from './create-cidadao.dto';

/**
 * DTO para atualização de cidadão
 */
export class UpdateCidadaoDto {
  [x: string]: any;
  @IsString({ message: 'Nome deve ser uma string' })
  @IsOptional()
  @ApiProperty({
    example: 'Maria da Silva',
    description: 'Nome completo do cidadão',
    required: false,
  })
  nome?: string;

  @IsString({ message: 'RG deve ser uma string' })
  @IsOptional()
  @ApiProperty({
    example: '1234567',
    description: 'RG do cidadão',
    required: false,
  })
  rg?: string;

  @IsString({ message: 'Prontuario SUAS é obrigatório' })
  @IsOptional()
  @ApiProperty({
    example: 'SUAS1234567',
    description: 'Nº do Prontuário SUAS do cidadão',
  })
  prontuario_suas?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  @ApiProperty({
    example: '1985-10-15',
    description: 'Data de nascimento do cidadão',
    required: false,
  })
  data_nascimento?: Date;

  @IsEnum(Sexo, { message: 'Sexo inválido' })
  @IsOptional()
  @ApiProperty({
    enum: Sexo,
    example: Sexo.FEMININO,
    description: 'Sexo do cidadão',
    required: false,
  })
  sexo?: Sexo;

  @IsString({ message: 'NIS deve ser uma string' })
  @IsOptional()
  @Validate(NISValidator, { message: 'NIS inválido' })
  @ApiProperty({
    example: '12345678901',
    description: 'Número de Identificação Social (NIS)',
    required: false,
  })
  nis?: string;

  @IsString({ message: 'Telefone deve ser uma string' })
  @IsOptional()
  @ApiProperty({
    example: '(84) 98765-4321',
    description: 'Telefone do cidadão',
    required: false,
  })
  telefone?: string;

  @IsEmail({}, { message: 'Email inválido' })
  @IsOptional()
  @ApiProperty({
    example: 'maria.silva@email.com',
    description: 'Email do cidadão',
    required: false,
  })
  email?: string;

  @ValidateNested()
  @Type(() => EnderecoDto)
  @IsOptional()
  @ApiProperty({
    type: EnderecoDto,
    description: 'Endereço do cidadão',
    required: false,
  })
  endereco?: EnderecoDto;

  @IsNumber({}, { message: 'Renda deve ser um número' })
  @IsOptional()
  @ApiProperty({
    example: 1200.5,
    description: 'Renda mensal do cidadão',
    required: false,
  })
  renda?: number;

  @IsUUID('4', { message: 'ID da unidade deve ser um UUID válido' })
  @IsOptional()
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID da unidade onde o cidadão está cadastrado',
    required: false,
  })
  unidade_id?: string;
}
