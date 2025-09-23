import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para validar se uma concessão pode ser renovada
 * Usado para verificar elegibilidade antes de iniciar o processo de renovação
 */
export class ValidarRenovacaoDto {
  @ApiProperty({
    description: 'ID da concessão a ser validada para renovação',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid'
  })
  @IsUUID('4', { message: 'ID da concessão inválido' })
  @IsNotEmpty({ message: 'ID da concessão é obrigatório' })
  concessaoId: string;
}