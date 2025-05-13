import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';

/**
 * DTO para redefinição de senha
 */
export class ResetPasswordDto {
  @IsString({ message: 'Token deve ser uma string' })
  @IsNotEmpty({ message: 'Token é obrigatório' })
  @ApiProperty({ 
    example: 'abc123def456',
    description: 'Token de redefinição de senha'
  })
  token: string;

  @IsString({ message: 'Senha deve ser uma string' })
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
    message: 'Senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial'
  })
  @ApiProperty({ 
    example: 'Senha@123',
    description: 'Nova senha'
  })
  senha: string;

  @IsString({ message: 'Confirmação de senha deve ser uma string' })
  @IsNotEmpty({ message: 'Confirmação de senha é obrigatória' })
  @ApiProperty({ 
    example: 'Senha@123',
    description: 'Confirmação da nova senha'
  })
  confirmacaoSenha: string;
}
