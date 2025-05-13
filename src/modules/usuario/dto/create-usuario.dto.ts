import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsEnum, IsUUID, MinLength, Matches } from 'class-validator';
import { Role } from '../../auth/enums/role.enum';

/**
 * DTO para criação de usuário
 */
export class CreateUsuarioDto {
  @IsString({ message: 'Nome deve ser uma string' })
  @ApiProperty({ 
    example: 'João da Silva',
    description: 'Nome completo do usuário'
  })
  nome: string;

  @IsEmail({}, { message: 'Email inválido' })
  @ApiProperty({ 
    example: 'joao.silva@semtas.natal.gov.br',
    description: 'Email do usuário (será usado para login)'
  })
  email: string;

  @IsString({ message: 'Senha deve ser uma string' })
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
    message: 'Senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial'
  })
  @ApiProperty({ 
    example: 'Senha@123',
    description: 'Senha do usuário'
  })
  senha: string;

  @IsString({ message: 'CPF deve ser uma string' })
  @IsOptional()
  @ApiProperty({ 
    example: '123.456.789-00',
    description: 'CPF do usuário',
    required: false
  })
  cpf?: string;

  @IsString({ message: 'Telefone deve ser uma string' })
  @IsOptional()
  @ApiProperty({ 
    example: '(84) 98765-4321',
    description: 'Telefone do usuário',
    required: false
  })
  telefone?: string;

  @IsString({ message: 'Matrícula deve ser uma string' })
  @IsOptional()
  @ApiProperty({ 
    example: '12345',
    description: 'Matrícula do usuário',
    required: false
  })
  matricula?: string;

  @IsEnum(Role, { message: 'Papel inválido' })
  @ApiProperty({ 
    enum: Role,
    example: Role.TECNICO_UNIDADE,
    description: 'Papel do usuário no sistema'
  })
  role: Role;

  @IsUUID(undefined, { message: 'ID da unidade inválido' })
  @IsOptional()
  @ApiProperty({ 
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID da unidade do usuário',
    required: false
  })
  unidadeId?: string;

  @IsUUID(undefined, { message: 'ID do setor inválido' })
  @IsOptional()
  @ApiProperty({ 
    example: '123e4567-e89b-12d3-a456-426614174001',
    description: 'ID do setor do usuário',
    required: false
  })
  setorId?: string;
}
