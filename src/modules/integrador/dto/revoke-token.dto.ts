import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para revogação de um token.
 * Permite informar o motivo da revogação para auditoria.
 */
export class RevokeTokenDto {
  @ApiProperty({
    description: 'Motivo da revogação do token',
    example: 'Integração descontinuada',
  })
  @IsNotEmpty({ message: 'O motivo da revogação é obrigatório' })
  @IsString({ message: 'O motivo deve ser uma string' })
  motivo: string;
}
