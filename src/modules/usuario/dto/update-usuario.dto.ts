import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { Role } from '../../../shared/enums/role.enum';

/**
 * DTO para atualização de usuário
 */
export class UpdateUsuarioDto {
  @IsString({ message: 'Nome deve ser uma string' })
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
  @IsOptional()
  @ApiProperty({
    example: '123.456.789-00',
    description: 'CPF do usuário',
    required: false,
  })
  cpf?: string;

  @IsString({ message: 'Telefone deve ser uma string' })
  @IsOptional()
  @ApiProperty({
    example: '(84) 98765-4321',
    description: 'Telefone do usuário',
    required: false,
  })
  telefone?: string;

  @IsString({ message: 'Matrícula deve ser uma string' })
  @IsOptional()
  @ApiProperty({
    example: '12345',
    description: 'Matrícula do usuário',
    required: false,
  })
  matricula?: string;

  @IsEnum(Role, { message: 'Papel inválido' })
  @IsOptional()
  @ApiProperty({
    enum: Role,
    example: Role.TECNICO,
    description: 'Papel do usuário no sistema',
    required: false,
  })
  role?: Role;

  @IsUUID(undefined, { message: 'ID da unidade inválido' })
  @IsOptional()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID da unidade do usuário',
    required: false,
  })
  unidadeId?: string;

  @IsUUID(undefined, { message: 'ID do setor inválido' })
  @IsOptional()
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174001',
    description: 'ID do setor do usuário',
    required: false,
  })
  setorId?: string;
}
