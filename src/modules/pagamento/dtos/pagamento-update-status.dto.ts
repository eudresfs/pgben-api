import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';

/**
 * DTO para atualização de status de um pagamento
 *
 * Este DTO é utilizado para validar os dados de entrada ao alterar
 * o status de um pagamento existente no sistema.
 *
 * @author Equipe PGBen
 */
export class PagamentoUpdateStatusDto {
  /**
   * Novo status do pagamento
   */
  @ApiProperty({
    description: 'Novo status do pagamento',
    enum: StatusPagamentoEnum,
    example: StatusPagamentoEnum.AGENDADO,
  })
  @IsEnum(StatusPagamentoEnum)
  status: StatusPagamentoEnum;

  /**
   * Observações sobre a alteração de status
   * Obrigatório quando o status for INVALIDO
   */
  @ApiProperty({
    description: 'Observações sobre a alteração de status (obrigatório para status INVALIDO)',
    example: 'Comprovante apresenta inconsistências que impedem a validação',
    required: false,
  })
  @ValidateIf((obj) => obj.status === StatusPagamentoEnum.INVALIDO)
  @IsString({ message: 'Observações são obrigatórias quando o status for INVALIDO' })
  @ValidateIf((obj) => obj.status !== StatusPagamentoEnum.INVALIDO)
  @IsOptional()
  @IsString()
  observacoes?: string;

  /**
   * ID do comprovante de pagamento
   * Obrigatório quando o status for alterado para CONFIRMADO
   */
  @ApiProperty({
    description:
      'ID do comprovante de pagamento (obrigatório para status CONFIRMADO)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID('4')
  comprovante_id?: string;

  /**
   * Data de agendamento do pagamento
   * Obrigatório quando o status for alterado para AGENDADO
   */
  @ApiProperty({
    description:
      'Data de agendamento do pagamento (obrigatório para status AGENDADO)',
    example: '2024-01-15T10:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsString()
  data_agendamento?: string;
}
