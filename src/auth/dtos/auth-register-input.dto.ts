import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  MaxLength,
  Matches,
  Validate,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { IsCPF, IsTelefone } from '../../shared/validators/br-validators';
import { Role } from '../../enums/role.enum';

/**
 * DTO para registro de novo usuário
 */
export class RegisterInput {
  @ApiProperty({
    description: 'Nome completo do usuário',
    example: 'João da Silva',
  })
  @IsNotEmpty({ message: 'O nome é obrigatório' })
  @MaxLength(100, { message: 'O nome deve ter no máximo 100 caracteres' })
  @IsString({ message: 'O nome deve ser uma string' })
  name: string;

  @ApiProperty({
    description: 'Nome de usuário único para login',
    example: 'joao.silva',
  })
  @IsNotEmpty({ message: 'O nome de usuário é obrigatório' })
  @MaxLength(200, {
    message: 'O nome de usuário deve ter no máximo 200 caracteres',
  })
  @IsString({ message: 'O nome de usuário deve ser uma string' })
  username: string;

  @ApiProperty({
    description: 'Senha do usuário (mínimo 6 caracteres)',
    example: 'Senha@123',
  })
  @IsNotEmpty({ message: 'A senha é obrigatória' })
  @Length(6, 100, {
    message: 'A senha deve ter entre 6 e 100 caracteres',
  })
  @IsString({ message: 'A senha deve ser uma string' })
  password: string;

  @ApiProperty({
    description: 'E-mail do usuário',
    example: 'joao.silva@example.com',
  })
  @IsNotEmpty({ message: 'O e-mail é obrigatório' })
  @IsEmail({}, { message: 'Informe um endereço de e-mail válido' })
  @MaxLength(100, { message: 'O e-mail deve ter no máximo 100 caracteres' })
  email: string;

  @ApiProperty({
    description: 'Lista de papéis (roles) do usuário',
    example: [Role.TECNICO],
    default: [Role.TECNICO],
  })
  @IsArray({ message: 'Os papéis devem ser fornecidos como um array' })
  @ArrayMinSize(1, { message: 'Pelo menos um papel deve ser fornecido' })
  @ArrayMaxSize(5, { message: 'Máximo de 5 papéis permitidos' })
  roles: Role[] = [Role.TECNICO];

  @ApiPropertyOptional({
    description: 'Indica se a conta está desativada',
    example: false,
    default: false,
  })
  @IsBoolean({ message: 'O status da conta deve ser um valor booleano' })
  @IsOptional()
  isAccountDisabled: boolean = false;

  @ApiProperty({
    example: '123.456.789-00',
    description: 'CPF do usuário (formato: 123.456.789-00)',
  })
  @IsNotEmpty({ message: 'O CPF é obrigatório' })
  @IsString({ message: 'O CPF deve ser uma string' })
  @Matches(/^\d{3}\.\d{3}\.\d{3}\-\d{2}$/, {
    message: 'Formato de CPF inválido. Use o formato: 123.456.789-00',
  })
  @Validate(IsCPF, {
    message: 'CPF inválido ou não existe',
  })
  cpf: string;

  @ApiProperty({
    example: '(84) 98765-4321',
    description: 'Telefone do usuário com DDD (formato: (XX) XXXXX-XXXX)',
  })
  @IsNotEmpty({ message: 'O telefone é obrigatório' })
  @IsString({ message: 'O telefone deve ser uma string' })
  @Matches(/\(\d{2}\)\s\d{4,5}-\d{4}$/, {
    message:
      'Formato de telefone inválido. Use: (XX) XXXX-XXXX para fixo ou (XX) XXXXX-XXXX para celular',
  })
  @Validate(IsTelefone, { message: '' })
  telefone: string;

  @ApiProperty({
    example: '12345',
    description: 'Número de matrícula do usuário (5 a 10 dígitos)',
  })
  @IsNotEmpty({ message: 'O número de matrícula é obrigatório' })
  @IsString({ message: 'A matrícula deve ser uma string' })
  @Matches(/^[0-9]{5,10}$/, {
    message:
      'A matrícula deve conter apenas números e ter entre 5 e 10 dígitos',
  })
  matricula: string;
}
