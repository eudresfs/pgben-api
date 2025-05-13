import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

/**
 * DTO para autenticação de usuário
 */
export class LoginDto {
  @IsEmail({}, { message: 'Email inválido' })
  @ApiProperty({ 
    example: 'usuario@semtas.natal.gov.br',
    description: 'Email do usuário'
  })
  email: string;

  @IsString({ message: 'Senha deve ser uma string' })
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
  @ApiProperty({ 
    example: 'senha!Segura123',
    description: 'Senha do usuário'
  })
  senha: string;
}
