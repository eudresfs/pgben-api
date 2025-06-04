import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  MinLength,
  MaxLength,
  Matches,
  Validate,
  IsNotEmpty,
} from 'class-validator';
import { ROLES, RoleType } from '../../../shared/constants/roles.constants';
import { IsCPF } from '../../../shared/validators/cpf.validator';

/**
 * DTO para atualização de usuário
 */
export class UpdateUsuarioDto {
  @IsString({ message: 'Nome deve ser uma string' })
  @MinLength(3, { message: 'Nome deve ter pelo menos 3 caracteres' })
  @MaxLength(100, { message: 'Nome deve ter no máximo 100 caracteres' })
  @Matches(/^[A-Za-zÀ-ÿ\s]+$/, {
    message: 'Nome deve conter apenas letras e espaços',
  })
  @Matches(/^\S+\s+\S+/, {
    message: 'Nome deve conter pelo menos nome e sobrenome',
  })
  @IsOptional()
  @ApiProperty({
    example: 'João da Silva',
    description: 'Nome completo do usuário',
    required: false,
  })
  nome?: string;

  @IsEmail({}, { message: 'Email inválido' })
  @IsOptional()
  @ApiProperty({
    example: 'joao.silva@semtas.natal.gov.br',
    description: 'Email do usuário (será usado para login)',
    required: false,
  })
  email?: string;

  @IsString({ message: 'CPF deve ser uma string' })
  @IsNotEmpty({ message: 'CPF é obrigatório' })
  @Matches(/^\d{3}\.\d{3}\.\d{3}\-\d{2}$/, {
    message: 'CPF deve estar no formato 123.456.789-00',
  })
  @Validate(IsCPF, {
    message: 'CPF inválido',
  })
  @ApiProperty({
    example: '123.456.789-00',
    description: 'CPF do usuário',
    required: true,
  })
  cpf: string;

  @IsString({ message: 'Telefone deve ser uma string' })
  @Matches(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, {
    message: 'Telefone deve estar no formato (XX) XXXXX-XXXX ou (XX) XXXX-XXXX',
  })
  @IsOptional()
  @ApiProperty({
    example: '(84) 98765-4321',
    description: 'Telefone do usuário',
    required: false,
  })
  telefone?: string;

  @IsString({ message: 'Matrícula deve ser uma string' })
  @Matches(/^\d{5,10}$/, {
    message: 'Matrícula deve conter entre 5 e 10 dígitos numéricos',
  })
  @IsOptional()
  @ApiProperty({
    example: '12345',
    description: 'Matrícula do usuário',
    required: false,
  })
  matricula?: string;

  @IsEnum(ROLES, { message: 'Papel inválido' })
  @IsOptional()
  @ApiProperty({
    description: 'Papel do usuário no sistema',
    required: false,
  })
  role_id?: string;

  @IsUUID(undefined, { message: 'ID da unidade inválido' })
  @IsOptional()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID da unidade do usuário',
    required: false,
  })
  unidade_id?: string;

  @IsUUID(undefined, { message: 'ID do setor inválido' })
  @IsOptional()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174001',
    description: 'ID do setor do usuário',
    required: false,
  })
  setor_id?: string;
}
