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
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { EscolaridadeEnum } from '../../../enums/escolaridade.enum';
import { ParentescoEnum } from '../../../enums/parentesco.enum';
import { CPFValidator } from '../validators/cpf-validator';

/**
 * DTO para criação de membro da composição familiar no body da requisição
 * Usado quando o cidadao_id ainda não existe (criação de cidadão)
 */
export class CreateComposicaoFamiliarBodyDto {
  @ApiProperty({
    description: 'Nome completo do membro da família',
    example: 'Maria Silva Santos',
    minLength: 2,
    maxLength: 255,
  })
  @IsString({ message: 'Nome deve ser uma string' })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @Length(2, 255, { message: 'Nome deve ter entre 2 e 255 caracteres' })
  nome: string;

  @IsNotEmpty({ message: 'CPF é obrigatório' })
  @Length(11, 14, { message: 'CPF deve ter entre 11 e 14 caracteres' })
  @Validate(CPFValidator, { message: 'CPF inválido' })
  @ApiProperty({
    example: '12345678900',
    description: 'CPF do membro familiar',
  })
  cpf: string;

  @IsOptional()
  @ApiProperty({
    example: '12345678901',
    description: 'NIS do membro familiar',
    required: false,
  })
  nis?: string;

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
  @IsEnum(EscolaridadeEnum, {
    message: 'Escolaridade deve ser um valor válido',
  })
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
    example: 2500.0,
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
