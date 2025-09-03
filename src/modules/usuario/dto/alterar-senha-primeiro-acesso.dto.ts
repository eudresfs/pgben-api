import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Matches, IsStrongPassword } from 'class-validator';
import { Match } from '../../../shared/validators/match.validator';

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
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  nova_senha: string;

  @ApiProperty({
    description: 'Confirmação da nova senha',
    example: 'MinhaNovaSenh@123',
  })
  @IsString({ message: 'A confirmação da senha deve ser uma string' })
  @Match('nova_senha', { message: 'As senhas não coincidem' })
  confirmar_senha: string;
}
