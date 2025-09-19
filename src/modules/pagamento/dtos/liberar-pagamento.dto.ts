import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, 
  IsNotEmpty, 
  MaxLength, 
  IsOptional, 
  IsDate 
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para liberação de pagamento
 *
 * Define os dados necessários para liberar um pagamento,
 * incluindo a data de liberação obrigatória e observações opcionais.
 */
export class LiberarPagamentoDto {
  /**
   * Data de liberação do pagamento
   * Campo obrigatório que define quando o pagamento será liberado
   */
  @ApiProperty({
    description: 'Data de liberação do pagamento',
    example: '2024-01-15T10:00:00.000Z',
    type: Date,
  })
  @IsNotEmpty({ message: 'Data de liberação é obrigatória' })
  @Type(() => Date)
  @IsDate({ message: 'Data de liberação deve ser uma data válida' })
  data_liberacao: Date;

  /**
   * Observações sobre a liberação do pagamento
   */
  @ApiProperty({
    description: 'Observações sobre a liberação do pagamento',
    example: 'Liberação aprovada após verificação de documentos',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Observações devem ser uma string' })
  @MaxLength(500, {
    message: 'Observações não podem exceder 500 caracteres',
  })
  observacoes?: string;

  /**
   * Motivo da liberação (opcional)
   */
  @ApiProperty({
    description: 'Motivo da liberação do pagamento',
    example: 'Documentação completa e validada',
    required: false,
    maxLength: 200,
  })
  @IsOptional()
  @IsString({ message: 'Motivo deve ser uma string' })
  @MaxLength(200, {
    message: 'Motivo não pode exceder 200 caracteres',
  })
  motivo?: string;
}