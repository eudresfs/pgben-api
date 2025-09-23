import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatusSolicitacao, TipoSolicitacaoEnum } from '@/enums';

/**
 * DTO de resposta para operações de renovação
 * Contém informações sobre a elegibilidade e resultado da renovação
 */
export class RenovacaoResponseDto {
  @ApiProperty({
    description: 'Indica se a concessão pode ser renovada',
    example: true
  })
  podeRenovar: boolean;

  @ApiPropertyOptional({
    description: 'Lista de motivos pelos quais a renovação não pode ser realizada',
    example: ['Concessão deve estar com status CESSADO', 'Usuário já possui uma renovação em andamento'],
    type: [String]
  })
  motivos?: string[];

  @ApiPropertyOptional({
    description: 'Dados da solicitação de renovação criada (quando aplicável)',
    type: 'object',
    additionalProperties: false,
    properties: {
      id: {
        type: 'string',
        description: 'ID da solicitação de renovação',
        example: '123e4567-e89b-12d3-a456-426614174000'
      },
      protocolo: {
        type: 'string',
        description: 'Protocolo da solicitação de renovação',
        example: '2025/001234'
      },
      status: {
        enum: Object.values(StatusSolicitacao),
        description: 'Status atual da solicitação',
        example: StatusSolicitacao.RASCUNHO
      },
      tipo: {
        enum: Object.values(TipoSolicitacaoEnum),
        description: 'Tipo da solicitação',
        example: TipoSolicitacaoEnum.RENOVACAO
      }
    }
  })
  solicitacaoRenovacao?: {
    id: string;
    protocolo: string;
    status: StatusSolicitacao;
    tipo: TipoSolicitacaoEnum;
  };
}