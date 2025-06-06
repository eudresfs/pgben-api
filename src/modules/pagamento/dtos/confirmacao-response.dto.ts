import { ApiProperty } from '@nestjs/swagger';
import { MetodoConfirmacaoEnum } from '../../../enums/metodo-confirmacao.enum';

/**
 * DTO para resposta contendo dados de uma confirmação de recebimento
 *
 * Este DTO define a estrutura de dados retornada pela API ao consultar
 * informações sobre uma confirmação de recebimento específica.
 *
 * @author Equipe PGBen
 */
export class ConfirmacaoResponseDto {
  /**
   * Identificador único da confirmação
   */
  @ApiProperty({
    description: 'ID único da confirmação',
    example: 'uuid',
  })
  id: string;

  /**
   * Referência ao pagamento relacionado a esta confirmação
   */
  @ApiProperty({
    description: 'ID do pagamento relacionado',
    example: 'uuid',
  })
  pagamentoId: string;

  /**
   * Data em que a confirmação foi registrada
   */
  @ApiProperty({
    description: 'Data da confirmação de recebimento',
    example: 'ISO 8601 date string',
  })
  dataConfirmacao: Date;

  /**
   * Método utilizado para confirmar o recebimento
   */
  @ApiProperty({
    description: 'Método utilizado para confirmar recebimento',
    enum: MetodoConfirmacaoEnum,
    example: MetodoConfirmacaoEnum.ASSINATURA,
  })
  metodoConfirmacao: MetodoConfirmacaoEnum;

  /**
   * Informações sobre o responsável pela confirmação
   */
  @ApiProperty({
    description: 'Dados sobre quem confirmou o recebimento',
    example: {
      id: 'uuid',
      nome: 'string',
      role: 'string',
    },
  })
  responsavelConfirmacao: {
    id: string;
    nome: string;
    role?: string;
  };

  /**
   * Informações sobre o destinatário que recebeu (se diferente do beneficiário)
   */
  @ApiProperty({
    description:
      'Dados do destinatário que recebeu (se diferente do beneficiário)',
    example: {
      id: 'uuid',
      nome: 'string',
      relacao: 'string',
    },
    required: false,
  })
  destinatario?: {
    id: string;
    nome: string;
    relacao?: string;
  };

  /**
   * Observações sobre a confirmação
   */
  @ApiProperty({
    description: 'Observações sobre a confirmação',
    example: 'string',
    required: false,
  })
  observacoes?: string;

  /**
   * Data de criação do registro
   */
  @ApiProperty({
    description: 'Data de criação do registro',
    example: 'ISO 8601 date string',
  })
  createdAt: Date;

  /**
   * Data da última atualização do registro
   */
  @ApiProperty({
    description: 'Data da última atualização do registro',
    example: 'ISO 8601 date string',
  })
  updatedAt: Date;
}
