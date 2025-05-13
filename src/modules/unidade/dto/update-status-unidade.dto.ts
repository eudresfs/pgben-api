import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

/**
 * DTO para atualização de status da unidade
 */
export class UpdateStatusUnidadeDto {
  @IsEnum(['ativo', 'inativo'], { message: 'Status deve ser ativo ou inativo' })
  @ApiProperty({ 
    enum: ['ativo', 'inativo'],
    example: 'ativo',
    description: 'Status da unidade'
  })
  status: string;
}
