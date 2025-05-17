import {
  IsString,
  IsNotEmpty,
  IsObject,
  IsUUID,
  IsOptional,
  IsDate,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * DTO para criação de notificações
 */
export class CreateNotificationDto {
  @ApiProperty({
    description: 'ID do destinatário da notificação',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  destinatario_id: string;

  @ApiProperty({
    description: 'ID do template de notificação',
    example: '123e4567-e89b-12d3-a456-426614174999',
  })
  @IsUUID()
  @IsNotEmpty()
  template_id: string;

  @ApiProperty({
    description: 'Dados de contexto para substituição no template',
    example: {
      nome: 'João Silva',
      protocolo: 'SOL-2025-0001',
      data_solicitacao: '15/05/2025',
    },
  })
  @IsObject()
  @IsNotEmpty()
  dados_contexto: Record<string, any>;

  @ApiProperty({
    description: 'Data de agendamento para envio (opcional)',
    required: false,
    type: Date,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  data_agendamento?: Date;
}
