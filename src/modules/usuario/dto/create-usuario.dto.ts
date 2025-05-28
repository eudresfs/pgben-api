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
  IsNotEmpty,
  Validate,
} from 'class-validator';
import { IsCPF } from '../../../shared/validators/cpf.validator';
import { IsStrongPassword } from '../../../shared/validators/strong-password.validator';
import { ROLES, RoleType } from '../../../shared/constants/roles.constants';

/**
 * DTO para criação de usuário
 */
export class CreateUsuarioDto {
  @IsString({ message: 'Nome deve ser uma string' })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @MinLength(3, { message: 'Nome deve ter no mínimo 3 caracteres' })
  @MaxLength(100, { message: 'Nome deve ter no máximo 100 caracteres' })
  @Matches(/^[A-Za-zÀ-ÖØ-öø-ÿ]+ [A-Za-zÀ-ÖØ-öø-ÿ ]+$/, {
    message: 'O nome do usuário deve ter pelo menos nome e sobrenome',
  })
  @ApiProperty({
    example: 'João da Silva',
    description: 'Nome completo do usuário',
  })
  nome: string;

  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  @Matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
    message: 'Formato de email inválido',
  })
  @ApiProperty({
    example: 'joao.silva@semtas.natal.gov.br',
    description: 'Email do usuário (será usado para login)',
  })
  email: string;

  @IsString({ message: 'Senha deve ser uma string' })
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
  @MaxLength(30, { message: 'Senha deve ter no máximo 30 caracteres' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/,
    {
      message:
        'Senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial',
    },
  )
  @Validate(IsStrongPassword, {
    message: 'A senha não pode conter informações pessoais ou palavras comuns',
  })
  @ApiProperty({
    example: 'Senha@123',
    description: 'Senha do usuário',
  })
  senha: string;

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
  @IsNotEmpty({ message: 'Telefone é obrigatório' })
  @Matches(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, {
    message: 'Telefone deve estar no formato (XX) XXXX-XXXX ou (XX) XXXXX-XXXX',
  })
  @ApiProperty({
    example: '(84) 98765-4321',
    description: 'Telefone do usuário',
    required: true,
  })
  telefone: string;

  @IsString({ message: 'Matrícula deve ser uma string' })
  @IsNotEmpty({ message: 'Matrícula é obrigatória' })
  @Matches(/^[0-9]{5,10}$/, {
    message: 'Matrícula deve conter entre 5 e 10 dígitos numéricos',
  })
  @ApiProperty({
    example: '12345',
    description: 'Matrícula do usuário',
    required: true,
  })
  matricula: string;

  @IsUUID(undefined, { message: 'ID da role inválido' })
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID do perfil do nível de acesso do usuário',
    required: false,
  })
  role_id: string;

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
