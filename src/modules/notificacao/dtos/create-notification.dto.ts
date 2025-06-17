import {
  IsString,
  IsNotEmpty,
  IsObject,
  IsUUID,
  IsOptional,
  IsDate,
  IsArray,
  IsIn,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CanalNotificacao } from '../../../entities/notification-template.entity';

/**
 * DTO para criação de notificações
 */
export class CreateNotificationDto {
  @ApiProperty({
    description: 'ID do destinatário da notificação',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  destinatario_id: string;

  @ApiProperty({
    description: 'ID do template de notificação',
    example: 'template-uuid-here',
    required: false,
  })
  @IsString()
  @IsOptional()
  template_id?: string;

  @ApiProperty({
    description: 'Canal de notificação a ser utilizado',
    enum: CanalNotificacao,
    example: CanalNotificacao.EMAIL,
  })
  @IsEnum(CanalNotificacao)
  @IsNotEmpty()
  canal: CanalNotificacao;

  @ApiProperty({
    description: 'Dados de contexto para substituição no template',
    example: {
      nome: 'João Silva',
      email: 'joao.silva@email.com',
      protocolo: 'SOL-2025-0001',
      data_solicitacao: '15/05/2025',
    },
  })
  @IsObject()
  @IsNotEmpty()
  dados_contexto: Record<string, any>;

  @ApiProperty({
    description: 'Prioridade da notificação',
    enum: ['baixa', 'normal', 'alta', 'critica'],
    default: 'normal',
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsIn(['baixa', 'normal', 'alta', 'critica'])
  prioridade?: string;

  @ApiProperty({
    description: 'Data de agendamento para envio (opcional)',
    required: false,
    type: Date,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  data_agendamento?: Date;

  @ApiProperty({
    description: 'Metadados adicionais da notificação',
    required: false,
    example: {
      origem: 'sistema',
      modulo: 'beneficio',
      acao: 'criacao_solicitacao',
    },
  })
  @IsObject()
  @IsOptional()
  metadados?: Record<string, any>;
}
