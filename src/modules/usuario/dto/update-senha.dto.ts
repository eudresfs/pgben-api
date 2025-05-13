import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Matches } from 'class-validator';

/**
 * DTO para alteração de senha do usuário
 */
export class UpdateSenhaDto {
  @IsString({ message: 'Senha atual deve ser uma string' })
  @ApiProperty({ 
    example: 'SenhaAtual@123',
    description: 'Senha atual do usuário'
  })
  senhaAtual: string;

  @IsString({ message: 'Nova senha deve ser uma string' })
  @MinLength(8, { message: 'Nova senha deve ter no mínimo 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
    message: 'Nova senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial'
  })
  @ApiProperty({ 
    example: 'NovaSenha@123',
    description: 'Nova senha do usuário'
  })
  novaSenha: string;

  @IsString({ message: 'Confirmação de senha deve ser uma string' })
  @ApiProperty({ 
    example: 'NovaSenha@123',
    description: 'Confirmação da nova senha'
  })
  confirmacaoSenha: string;
}
