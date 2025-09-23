import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatusSolicitacao, TipoSolicitacaoEnum } from '@/enums';

/**
 * DTO para solicitação com informações de elegibilidade para renovação
 * Usado em listagens que precisam mostrar se uma solicitação pode ser renovada
 */
export class SolicitacaoComElegibilidadeDto {
  @ApiProperty({
    description: 'ID da solicitação',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiProperty({
    description: 'Protocolo da solicitação',
    example: '2025/001234'
  })
  protocolo: string;

  @ApiProperty({
    description: 'Status atual da solicitação',
    enum: StatusSolicitacao,
    example: StatusSolicitacao.APROVADA
  })
  status: StatusSolicitacao;

  @ApiProperty({
    description: 'Tipo da solicitação',
    enum: TipoSolicitacaoEnum,
    example: TipoSolicitacaoEnum.ORIGINAL
  })
  tipo: TipoSolicitacaoEnum;

  @ApiProperty({
    description: 'Indica se a solicitação pode ser renovada',
    example: true
  })
  podeRenovar: boolean;

  @ApiProperty({
    description: 'Label descritivo do tipo de solicitação',
    example: 'Nova Solicitação',
    enum: ['Nova Solicitação', 'Renovação']
  })
  labelTipo: string;

  @ApiPropertyOptional({
    description: 'Motivos pelos quais a solicitação não é elegível para renovação',
    example: ['Concessão deve estar com status CESSADO'],
    type: [String]
  })
  motivosInelegibilidade?: string[];
}