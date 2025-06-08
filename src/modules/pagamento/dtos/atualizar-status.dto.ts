import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { StatusPagamentoEnum } from '../../../enums/status-pagamento.enum';

/**
 * DTO para atualização de status de pagamento
 * 
 * Define os dados necessários para alterar o status de um pagamento,
 * incluindo validações e documentação da API.
 */
export class AtualizarStatusDto {
  @ApiProperty({
    description: 'Novo status do pagamento',
    enum: StatusPagamentoEnum,
    example: StatusPagamentoEnum.CONFIRMADO,
  })
  @IsEnum(StatusPagamentoEnum, {
    message: 'Status deve ser um valor válido do enum StatusPagamentoEnum',
  })
  status: StatusPagamentoEnum;

  @ApiProperty({
    description: 'Observações sobre a mudança de status',
    example: 'Pagamento confirmado pelo beneficiário',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Observações devem ser uma string' })
  @MaxLength(500, {
    message: 'Observações não podem exceder 500 caracteres',
  })
  observacoes?: string;
}