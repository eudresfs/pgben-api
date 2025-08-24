import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

/**
 * DTO para solicitação de recuperação de senha
 */
export class RecuperarSenhaDto {
  @ApiProperty({
    description: 'Email do usuário para recuperação de senha',
    example: 'usuario@exemplo.com',
  })
  @IsEmail({}, { message: 'Email deve ter um formato válido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;
}
