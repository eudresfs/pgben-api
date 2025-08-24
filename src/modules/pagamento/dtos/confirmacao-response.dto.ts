import { ApiProperty } from '@nestjs/swagger';
import { MetodoConfirmacaoEnum } from '../../../enums/metodo-confirmacao.enum';
import {
  ConfirmacaoBaseDto,
  ResponsavelConfirmacaoInfo,
  DestinatarioInfo,
} from './base/confirmacao-base.dto';

/**
 * DTO para resposta contendo dados de uma confirmação de recebimento
 *
 * Este DTO define a estrutura de dados retornada pela API ao consultar
 * informações sobre uma confirmação de recebimento específica. Estende ConfirmacaoBaseDto
 * para reutilizar campos comuns.
 *
 * @author Equipe PGBen
 */
export class ConfirmacaoResponseDto extends ConfirmacaoBaseDto {
  // Campo 'id' herdado de ConfirmacaoBaseDto

  /**
   * Referência ao pagamento relacionado a esta confirmação
   */
  @ApiProperty({
    description: 'ID do pagamento relacionado',
    example: 'uuid',
  })
  pagamento_id: string;

  /**
   * Data em que a confirmação foi registrada
   */
  @ApiProperty({
    description: 'Data da confirmação de recebimento',
    example: 'ISO 8601 date string',
  })
  data_confirmacao: Date;

  /**
   * Método utilizado para confirmar o recebimento
   */
  @ApiProperty({
    description: 'Método utilizado para confirmar recebimento',
    enum: MetodoConfirmacaoEnum,
    example: MetodoConfirmacaoEnum.ASSINATURA,
  })
  metodo_confirmacao: MetodoConfirmacaoEnum;

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
  responsavel_confirmacao: ResponsavelConfirmacaoInfo;

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
  destinatario?: DestinatarioInfo;

  // Campos 'observacoes', 'created_at' e 'updated_at' herdados de ConfirmacaoBaseDto
}
