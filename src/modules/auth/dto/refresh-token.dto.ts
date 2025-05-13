import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO para renovação do token de acesso
 */
export class RefreshTokenDto {
  @IsString({ message: 'Token de atualização deve ser uma string' })
  @IsNotEmpty({ message: 'Token de atualização é obrigatório' })
  @ApiProperty({ 
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Token de atualização para renovar o token de acesso'
  })
  refreshToken: string;
}
