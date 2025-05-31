import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsDate,
  IsNumber,
  IsEnum,
  Length,
  Min,
  Validate,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { EscolaridadeEnum } from '../enums/escolaridade.enum';
import { ParentescoEnum } from '../enums/parentesco.enum';
import { CPFValidator } from '../validators/cpf-validator';

/**
 * DTO para adicionar membro à composição familiar
 */
export class CreateComposicaoFamiliarDto {
  @IsString({ message: 'ID do cidadão deve ser uma string' })
  @IsNotEmpty({ message: 'ID do cidadão é obrigatório' })
  @IsUUID('4', { message: 'ID do cidadão deve ser um UUID válido' })
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID do cidadão principal da família',
  })
  cidadao_id: string;

  @IsString({ message: 'Nome deve ser uma string' })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @ApiProperty({
    example: 'João da Silva',
    description: 'Nome completo do membro familiar',
  })
  nome: string;

  @IsNotEmpty({ message: 'CPF é obrigatório' })
  @Length(11, 14, { message: 'CPF deve ter entre 11 e 14 caracteres' })
  @Validate(CPFValidator, { message: 'CPF inválido' })
  @ApiProperty({
    example: '12345678900',
    description: 'CPF do membro familiar',
  })
  cpf: string;

  @IsNotEmpty({ message: 'NIS do parente é obrigatório' })
  @ApiProperty({
    example: '12345678901',
    description: 'NIS do membro familiar',
  })
  nis: string;

  @IsNotEmpty({ message: 'Idade do parente é obrigatório' })
  @IsNumber({}, { message: 'Idade deve ser um número' })
  @Min(0, { message: 'Idade não pode ser negativa' })
  @ApiProperty({
    example: 25,
    description: 'Idade do membro familiar',
  })
  idade: number;

  @IsString({ message: 'Ocupação deve ser uma string' })
  @IsNotEmpty({ message: 'Ocupação é obrigatória' })
  @ApiProperty({
    example: 'Estudante',
    description: 'Ocupação do membro familiar',
  })
  ocupacao: string;

  @IsNotEmpty({ message: 'Escolaridade é obrigatória' })
  @IsEnum(EscolaridadeEnum, { message: 'Escolaridade deve ser um valor válido' })
  @ApiProperty({
    example: EscolaridadeEnum.MEDIO_COMPLETO,
    description: 'Nível de escolaridade do membro familiar',
    enum: EscolaridadeEnum,
  })
  escolaridade: EscolaridadeEnum;

  @IsNotEmpty({ message: 'Parentesco é obrigatório' })
  @IsEnum(ParentescoEnum, { message: 'Parentesco deve ser um valor válido' })
  @ApiProperty({
    example: ParentescoEnum.FILHO,
    description: 'Grau de parentesco com o cidadão principal',
    enum: ParentescoEnum,
  })
  parentesco: ParentescoEnum;

  @IsOptional()
  @IsNumber({}, { message: 'Renda deve ser um número' })
  @Min(0, { message: 'Renda não pode ser negativa' })
  @ApiProperty({
    example: 2500.00,
    description: 'Renda mensal do membro familiar',
    required: false,
  })
  renda?: number;

  @IsOptional()
  @ApiProperty({
    example: 'Observações adicionais sobre o membro familiar',
    description: 'Observações gerais',
    required: false,
  })
  observacoes?: string;

  @IsOptional()
  @IsDate({ message: 'Data de nascimento deve ser uma data válida' })
  @Type(() => Date)
  @ApiProperty({
    example: '1998-05-15',
    description: 'Data de nascimento do membro familiar',
    required: false,
  })
  data_nascimento?: Date;
}
