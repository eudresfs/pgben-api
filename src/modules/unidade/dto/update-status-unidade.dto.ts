import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { StatusUnidade } from '../entities/unidade.entity';

/**
 * DTO para atualização de status da unidade
 */
export class UpdateStatusUnidadeDto {
  @IsEnum(StatusUnidade, { message: 'Status deve ser ativo ou inativo' })
  @ApiProperty({
    enum: StatusUnidade,
    enumName: 'StatusUnidade',
    example: StatusUnidade.ATIVO,
    description: 'Status da unidade',
  })
  status: StatusUnidade;
}
