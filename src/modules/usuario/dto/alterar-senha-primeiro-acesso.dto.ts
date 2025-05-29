import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Matches } from 'class-validator';

/**
 * DTO para alteração de senha no primeiro acesso
 */
export class AlterarSenhaPrimeiroAcessoDto {
  @ApiProperty({
    description: 'Nova senha do usuário',
    example: 'MinhaNovaSenh@123',
    minLength: 8,
  })
  @IsString({ message: 'A nova senha deve ser uma string' })
  @MinLength(8, { message: 'A nova senha deve ter pelo menos 8 caracteres' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    {
      message:
        'A nova senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula, 1 número e 1 caractere especial',
    },
  )
  novaSenha: string;

  @ApiProperty({
    description: 'Confirmação da nova senha',
    example: 'MinhaNovaSenh@123',
  })
  @IsString({ message: 'A confirmação da senha deve ser uma string' })
  confirmarSenha: string;
}