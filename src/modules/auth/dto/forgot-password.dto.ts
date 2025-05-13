import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

/**
 * DTO para solicitação de recuperação de senha
 */
export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  @ApiProperty({ 
    example: 'usuario@semtas.natal.gov.br',
    description: 'Email do usuário para recuperação de senha'
  })
  email: string;
}
