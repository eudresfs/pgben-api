import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

/**
 * DTO para atualização de status do usuário
 */
export class UpdateStatusUsuarioDto {
  @IsEnum(['ativo', 'inativo'], { message: 'Status deve ser ativo ou inativo' })
  @ApiProperty({ 
    enum: ['ativo', 'inativo'],
    example: 'ativo',
    description: 'Status do usuário'
  })
  status: string;
}
