import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Status } from '../../../enums/status.enum';

/**
 * DTO para atualização de status do usuário
 */
export class UpdateStatusUsuarioDto {
  @IsEnum(Status, { message: 'Status deve ser ativo ou inativo' })
  @ApiProperty({
    enum: Status,
    example: Status.ATIVO,
    description: 'Status do usuário',
  })
  status: Status;
}
