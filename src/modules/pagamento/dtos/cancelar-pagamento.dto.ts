import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

/**
 * DTO para cancelamento de pagamento
 *
 * Define os dados necessários para cancelar um pagamento,
 * incluindo o motivo obrigatório e observações opcionais.
 */
export class CancelarPagamentoDto {
  @ApiProperty({
    description: 'Motivo do cancelamento do pagamento',
    example: 'Solicitação cancelada pelo beneficiário',
    maxLength: 200,
  })
  @IsString({ message: 'Motivo deve ser uma string' })
  @IsNotEmpty({ message: 'Motivo do cancelamento é obrigatório' })
  @MaxLength(200, {
    message: 'Motivo não pode exceder 200 caracteres',
  })
  motivo: string;

  @ApiProperty({
    description: 'Observações adicionais sobre o cancelamento',
    example: 'Cancelamento solicitado via telefone',
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
